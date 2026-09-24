#!/usr/bin/env python3
"""
build_table.py — gera o .tex da tabela a partir dos JSONs de results/.

O ponto inteiro: o .tex da tabela passa a ser GERADO, nunca editado. Se uma
configuracao nao foi executada, a linha simplesmente nao existe — nao ha como
escreve-la a mao sem que o --check acuse.

Gerar:
    python build_table.py --results results --out sections/tabela_metricas.tex \
        --colunas "arquitetura:Arquitetura, preproc:Pre-proc., lr:LR" \
        --metricas "acuracia:Acuracia:pct, f1:F1:3f" \
        --caption "Desempenho sob diferentes configuracoes." \
        --label tab:metricas

Conferir (CI, pre-commit, qa.py):
    python build_table.py ... --check
    -> sai 1 se o .tex versionado divergir do que os JSONs produzem,
       ou se alguem tiver editado o arquivo a mao.

No LaTeX:
    \\input{sections/tabela_metricas.tex}

Formatos de metrica: 'pct' (0.885 -> 88.5\\%), 'Nf' (N casas), 'int', 'raw'.
Execucao com status divergiu/falhou vira texto na celula, nunca numero.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

MARCA = "% GERADO AUTOMATICAMENTE POR build_table.py — NAO EDITE ESTE ARQUIVO."
LINHA_HASH = "% conteudo-sha256-16: "


def parse_pares(spec: str, campos=2):
    """'chave:Rotulo, outra:Outro' -> [(chave, rotulo, extra?), ...]"""
    saida = []
    for item in spec.split(","):
        item = item.strip()
        if not item:
            continue
        partes = [p.strip() for p in item.split(":")]
        while len(partes) < campos:
            partes.append("")
        saida.append(tuple(partes[:campos]))
    return saida


def escapar(txt) -> str:
    s = str(txt)
    for de, para in [("\\", r"\textbackslash{}"), ("&", r"\&"), ("%", r"\%"),
                     ("$", r"\$"), ("#", r"\#"), ("_", r"\_"),
                     ("{", r"\{"), ("}", r"\}"), ("~", r"\textasciitilde{}"),
                     ("^", r"\textasciicircum{}")]:
        s = s.replace(de, para)
    return s


def celula(txt: str) -> str:
    """Protege uma celula que comeca com '['.

    O '\\\\' que termina a linha anterior somado a um '[' no inicio da celula
    seguinte vira '\\\\[dimensao]' — quebra de linha com espacamento — e o
    LaTeX aborta com "Illegal unit of measure". Envolver em chaves resolve.
    """
    t = txt.lstrip()
    return "{" + txt + "}" if t.startswith("[") else txt


def formatar(valor, forma: str) -> str:
    if valor is None:
        return "--"
    try:
        if forma == "pct":
            return f"{float(valor) * 100:.1f}\\%"
        if forma == "int":
            return f"{int(valor)}"
        m = re.fullmatch(r"(\d+)f", forma or "")
        if m:
            return f"{float(valor):.{int(m.group(1))}f}"
    except (TypeError, ValueError):
        return escapar(valor)
    return escapar(valor)


def valor_config(reg: dict, chave: str):
    """Procura a chave no config e, se nao achar, no topo do registro."""
    if chave in reg.get("config", {}):
        return reg["config"][chave]
    return reg.get(chave)


def carregar(results: Path, seed_filtro=None) -> list[dict]:
    regs = []
    for f in sorted(results.glob("*.json")):
        try:
            r = json.loads(f.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            print(f"AVISO: {f.name} nao e JSON valido, ignorado.", file=sys.stderr)
            continue
        if seed_filtro is not None and r.get("seed") != seed_filtro:
            continue
        r["_arquivo"] = f.name
        regs.append(r)
    return regs


def montar(regs, colunas, metricas, caption, label, ordem=None) -> str:
    if ordem:
        pos = {n: i for i, n in enumerate(ordem)}
        regs = sorted(regs, key=lambda r: (pos.get(r.get("nome"), 10**6), r.get("seed", 0)))
    else:
        regs = sorted(regs, key=lambda r: (str(r.get("nome")), r.get("seed", 0)))

    alinh = "l" * len(colunas) + "c" * len(metricas)
    cab = [f"\\textbf{{{escapar(rot or ch)}}}" for ch, rot in colunas]
    cab += [f"\\textbf{{{escapar(rot or ch)}}}" for ch, rot, _ in metricas]

    linhas = []
    for r in regs:
        celulas = [celula(escapar(valor_config(r, ch))) if valor_config(r, ch) is not None else "--"
                   for ch, _ in colunas]
        st = r.get("status", "ok")
        if st in ("divergiu", "falhou"):
            # Execucao sem numero valido: uma celula unica atravessando as
            # colunas de metrica, com o que de fato aconteceu. Nunca um numero.
            texto = escapar(r.get("observacao") or
                            ("Divergencia" if st == "divergiu" else "Falhou"))
            celulas.append(f"\\multicolumn{{{len(metricas)}}}{{c}}{{{texto}}}")
        else:
            for ch, _, forma in metricas:
                celulas.append(celula(formatar(r.get("metricas", {}).get(ch), forma)))
        linhas.append("  " + " & ".join(celulas) + r" \\")

    corpo = [
        r"\begin{table}[ht]",
        r"\centering",
        f"\\caption{{{caption}}}",
        f"\\label{{{label}}}",
        r"\small",
        r"\setlength{\tabcolsep}{5pt}",
        f"\\begin{{tabular}}{{{alinh}}}",
        r"\toprule",
        "  " + " & ".join(cab) + r" \\",
        r"\midrule",
        *linhas,
        r"\bottomrule",
        r"\end{tabular}",
        r"\end{table}",
    ]
    return "\n".join(corpo) + "\n"


def com_cabecalho(corpo: str, fontes: list[str]) -> str:
    h = hashlib.sha256(corpo.encode("utf-8")).hexdigest()[:16]
    topo = [
        MARCA,
        "% Para mudar a tabela, rode os experimentos e gere de novo:",
        "%     python scripts/build_table.py ... ",
        "% Edicao manual e detectada por 'build_table.py --check' e reprovada no CI.",
        "% Fontes (results/):",
        *[f"%   - {f}" for f in fontes],
        LINHA_HASH + h,
        "",
    ]
    return "\n".join(topo) + corpo


def separar(texto: str):
    """Devolve (corpo, hash_declarado) de um arquivo ja gerado."""
    linhas = texto.splitlines(keepends=True)
    declarado = None
    i = 0
    for i, l in enumerate(linhas):
        if l.startswith(LINHA_HASH):
            declarado = l[len(LINHA_HASH):].strip()
            break
    if declarado is None:
        return None, None
    corpo = "".join(linhas[i + 1:]).lstrip("\n")
    return corpo, declarado


def main() -> int:
    ap = argparse.ArgumentParser(description="Gera a tabela LaTeX a partir dos JSONs")
    ap.add_argument("--results", default="results")
    ap.add_argument("--out", required=True)
    ap.add_argument("--colunas", required=True,
                    help="'chave:Rotulo, ...' vindas do config de cada execucao")
    ap.add_argument("--metricas", required=True,
                    help="'chave:Rotulo:formato, ...' formatos: pct, 3f, int, raw")
    ap.add_argument("--caption", default="Resultados experimentais.")
    ap.add_argument("--label", default="tab:resultados")
    ap.add_argument("--seed", type=int, help="usar so os resultados desta seed")
    ap.add_argument("--ordem", help="'nome1,nome2,...' ordem das linhas")
    ap.add_argument("--esperados", help="'nome1,nome2,...' configuracoes que DEVEM existir")
    ap.add_argument("--check", action="store_true",
                    help="nao escreve; falha se o arquivo divergir dos JSONs")
    args = ap.parse_args()

    results = Path(args.results)
    if not results.is_dir():
        print(f"diretorio de resultados nao encontrado: {results}")
        return 2

    regs = carregar(results, args.seed)
    if not regs:
        print(f"nenhum resultado em {results}/ — rode runner.py antes.")
        return 2

    colunas = parse_pares(args.colunas, 2)
    metricas = parse_pares(args.metricas, 3)
    ordem = [s.strip() for s in args.ordem.split(",")] if args.ordem else None

    corpo = montar(regs, colunas, metricas, args.caption, args.label, ordem)
    fontes = [r["_arquivo"] for r in regs]
    conteudo = com_cabecalho(corpo, fontes)
    out = Path(args.out)

    # configuracoes que deveriam existir e nao existem
    faltando = []
    if args.esperados:
        tem = {r.get("nome") for r in regs}
        faltando = [n.strip() for n in args.esperados.split(",") if n.strip() not in tem]

    nao_det = [r["_arquivo"] for r in regs
               if r.get("determinismo_verificado") and not r.get("deterministico")]
    sujos = [r["_arquivo"] for r in regs if (r.get("git") or {}).get("arvore_suja")]

    if args.check:
        if not out.exists():
            print(f"REPROVADO: {out} nao existe. Gere com build_table.py.")
            return 1
        atual = out.read_text(encoding="utf-8")
        corpo_atual, declarado = separar(atual)
        if corpo_atual is None:
            print(f"REPROVADO: {out} nao tem cabecalho de geracao — foi escrito a mao.")
            return 1
        real = hashlib.sha256(corpo_atual.encode("utf-8")).hexdigest()[:16]
        if real != declarado:
            print(f"REPROVADO: {out} foi EDITADO A MAO apos ser gerado.")
            print(f"  hash declarado: {declarado}   hash real: {real}")
            print("  Numero em tabela nao se edita: rode o experimento e gere de novo.")
            return 1
        if corpo_atual != corpo:
            print(f"REPROVADO: {out} esta DESATUALIZADO em relacao a results/.")
            print("  Regenere com o mesmo comando, sem --check.")
            return 1
        print(f"OK: {out} confere com os {len(regs)} resultado(s) em {results}/")
        if faltando:
            print(f"AVISO: configuracoes esperadas sem execucao: {', '.join(faltando)}")
        if nao_det:
            print(f"AVISO: resultados marcados como NAO deterministicos: {', '.join(nao_det)}")
        if sujos:
            print(f"AVISO: gerados com a arvore do git suja: {', '.join(sujos)}")
        return 0

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(conteudo, encoding="utf-8")
    print(f"gerado: {out}  ({len(regs)} linha(s) de {len(fontes)} arquivo(s))")
    for r in regs:
        st = r.get("status", "ok")
        marca = "" if st == "ok" else f"  [{st}]"
        print(f"  - {r.get('nome')} (seed {r.get('seed')}){marca}")
    if faltando:
        print()
        print("AVISO: estas configuracoes eram esperadas e NAO tem execucao:")
        for n in faltando:
            print(f"  - {n}")
        print("Elas nao aparecem na tabela. Rode-as ou remova-as de --esperados.")
    if nao_det:
        print()
        print("AVISO: ha resultado marcado como NAO deterministico:")
        for f in nao_det:
            print(f"  - {f}")
        print("Comparar linhas assim pode estar medindo ruido de particao.")
    if sujos:
        print()
        print(f"AVISO: {len(sujos)} resultado(s) gerado(s) com a arvore do git suja —")
        print("nao sao rastreaveis a um commit especifico.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
