#!/usr/bin/env python3
"""
runner.py — executa um experimento e grava um JSON com proveniencia completa.

Regra que este script existe para tornar mecanica:
    todo numero num artefato tem que ter um log que o gerou.

Contrato com o SEU codigo
-------------------------
Voce expoe uma funcao que recebe a configuracao e a seed e devolve as metricas:

    # experimentos/heart.py
    def executar(config: dict, seed: int) -> dict:
        ...
        return {
            "acuracia": 0.885,
            "f1": 0.88,
            "epocas": 300,
            "status": "ok",          # ou "divergiu" / "falhou"
            "observacao": "",        # ex.: "NaN na epoca 12"
        }

E chama:

    python runner.py --entry experimentos.heart:executar \
                     --config configs/zscore_13_8_5_1.json \
                     --seed 42

Se o resultado nao trouxer "status", assume-se "ok".
Divergencia NAO e erro: devolva status="divergiu" e a observacao. Isso e um
resultado valido e vai para a tabela como tal.

O que fica gravado em results/<config>_s<seed>.json
--------------------------------------------------
config, seed, metricas cruas, status, duracao, commit do git, se a arvore
estava suja, host, versao do Python, e o hash do arquivo de configuracao.
Nada disso e digitavel a mao sem deixar rastro.

Determinismo
------------
    python runner.py ... --verificar-determinismo
Roda duas vezes com a mesma seed e compara. Se divergir, o experimento nao esta
reproduzivel e a comparacao entre configuracoes nao significa nada.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib
import json
import platform
import socket
import subprocess
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path

ESQUEMA = 1


def git_info(raiz: Path) -> dict:
    def cmd(*args):
        try:
            r = subprocess.run(["git", *args], cwd=str(raiz), capture_output=True,
                               text=True, timeout=10)
            return r.stdout.strip() if r.returncode == 0 else None
        except (OSError, subprocess.SubprocessError):
            return None

    commit = cmd("rev-parse", "HEAD")
    sujo = cmd("status", "--porcelain")
    return {
        "commit": commit,
        "branch": cmd("rev-parse", "--abbrev-ref", "HEAD"),
        "arvore_suja": bool(sujo) if sujo is not None else None,
    }


def hash_arquivo(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()[:16]


def carregar_entrada(spec: str):
    """'pacote.modulo:funcao' -> objeto chamavel."""
    if ":" not in spec:
        raise SystemExit(f"--entry deve ser 'modulo:funcao', recebido: {spec!r}")
    mod_nome, fn_nome = spec.split(":", 1)
    sys.path.insert(0, str(Path.cwd()))
    try:
        mod = importlib.import_module(mod_nome)
    except ImportError as e:
        raise SystemExit(f"nao consegui importar '{mod_nome}': {e}")
    fn = getattr(mod, fn_nome, None)
    if not callable(fn):
        raise SystemExit(f"'{fn_nome}' nao existe ou nao e chamavel em '{mod_nome}'")
    return fn


def normalizar(bruto, duracao: float) -> dict:
    if not isinstance(bruto, dict):
        raise SystemExit(
            f"a funcao de entrada devolveu {type(bruto).__name__}, esperava dict de metricas"
        )
    r = dict(bruto)
    status = str(r.pop("status", "ok")).lower()
    if status not in {"ok", "divergiu", "falhou"}:
        raise SystemExit(f"status invalido: {status!r} (use ok, divergiu ou falhou)")
    obs = r.pop("observacao", "")
    return {"status": status, "observacao": obs, "metricas": r, "duracao_s": round(duracao, 3)}


def executar_uma(fn, config: dict, seed: int) -> dict:
    t0 = time.perf_counter()
    try:
        bruto = fn(config, seed)
    except Exception:
        return {
            "status": "falhou",
            "observacao": "excecao durante a execucao",
            "metricas": {},
            "duracao_s": round(time.perf_counter() - t0, 3),
            "traceback": traceback.format_exc(limit=12),
        }
    return normalizar(bruto, time.perf_counter() - t0)


def main() -> int:
    ap = argparse.ArgumentParser(description="Executa um experimento e grava o JSON de resultado")
    ap.add_argument("--entry", required=True, help="modulo:funcao que executa o experimento")
    ap.add_argument("--config", required=True, help="arquivo .json com a configuracao")
    ap.add_argument("--seed", type=int, required=True)
    ap.add_argument("--results", default="results", help="diretorio de saida (padrao: results)")
    ap.add_argument("--verificar-determinismo", action="store_true",
                    help="roda duas vezes com a mesma seed e compara")
    ap.add_argument("--forcar", action="store_true",
                    help="sobrescreve um resultado ja existente")
    args = ap.parse_args()

    cfg_path = Path(args.config).resolve()
    if not cfg_path.exists():
        print(f"configuracao nao encontrada: {cfg_path}")
        return 2
    config = json.loads(cfg_path.read_text(encoding="utf-8"))
    nome = config.get("nome") or cfg_path.stem

    saida_dir = Path(args.results)
    saida_dir.mkdir(parents=True, exist_ok=True)
    saida = saida_dir / f"{nome}_s{args.seed}.json"
    if saida.exists() and not args.forcar:
        print(f"ja existe: {saida}  (use --forcar para refazer)")
        return 0

    fn = carregar_entrada(args.entry)

    print(f"config : {nome}")
    print(f"seed   : {args.seed}")
    print(f"entry  : {args.entry}")
    print()

    r1 = executar_uma(fn, config, args.seed)

    if args.verificar_determinismo:
        print("verificando determinismo (2a execucao com a mesma seed)...")
        r2 = executar_uma(fn, config, args.seed)
        igual = r1["metricas"] == r2["metricas"] and r1["status"] == r2["status"]
        r1["determinismo_verificado"] = True
        r1["deterministico"] = igual
        if not igual:
            r1["metricas_2a_execucao"] = r2["metricas"]
            print("  NAO DETERMINISTICO — as duas execucoes divergiram:")
            print(f"    1a: {r1['metricas']}")
            print(f"    2a: {r2['metricas']}")
            print("  Semeie TODAS as fontes de aleatoriedade (veja scripts/splits.py:")
            print("  semear_tudo) antes de comparar configuracoes. Sem isso a")
            print("  diferenca entre linhas da tabela pode ser ruido de particao.")
        else:
            print("  deterministico: OK")
        print()

    registro = {
        "esquema": ESQUEMA,
        "nome": nome,
        "seed": args.seed,
        "config": config,
        "config_arquivo": str(cfg_path.name),
        "config_sha256_16": hash_arquivo(cfg_path),
        "entry": args.entry,
        **r1,
        "quando_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "host": socket.gethostname(),
        "python": platform.python_version(),
        "plataforma": platform.platform(),
        "git": git_info(Path.cwd()),
    }

    saida.write_text(json.dumps(registro, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"status : {registro['status']}"
          + (f"  ({registro['observacao']})" if registro["observacao"] else ""))
    print(f"metricas: {registro['metricas']}")
    print(f"gravado : {saida}")

    if registro["git"].get("arvore_suja"):
        print()
        print("AVISO: a arvore do git esta suja. Este resultado nao e rastreavel a")
        print("um commit especifico — comite antes de rodar o que vai para o artigo.")

    if registro["status"] == "falhou":
        print()
        print("A execucao FALHOU. O JSON foi gravado com o traceback: um fracasso")
        print("tambem e resultado. Ele NAO entra na tabela como numero.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
