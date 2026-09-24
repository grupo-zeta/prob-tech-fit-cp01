#!/usr/bin/env python3
"""
splits.py — reprodutibilidade: seed unica e particionamento estratificado.

Existe porque `random.shuffle(rows)` seguido de fatiamento NAO e estratificado
e NAO e reproduzivel. Com ele, comparar duas configuracoes mede o ruido da
particao, nao o hiperparametro.

Sem dependencia externa: so a stdlib.
"""

from __future__ import annotations

import os
import random
from collections import defaultdict


def semear_tudo(seed: int) -> None:
    """Semeia todas as fontes de aleatoriedade disponiveis.

    Chame UMA vez, no inicio da execucao, antes de carregar dados ou
    inicializar pesos. Se o projeto usar numpy/torch, eles tambem sao semeados.
    """
    random.seed(seed)
    os.environ["PYTHONHASHSEED"] = str(seed)
    try:
        import numpy as np
        np.random.seed(seed)
    except ImportError:
        pass
    try:
        import torch
        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False
    except ImportError:
        pass


def split_estratificado(rotulos, frac_treino=0.8, seed=42):
    """Divide indices mantendo a proporcao de classes nos dois lados.

    Retorna (indices_treino, indices_teste), ambos embaralhados de forma
    deterministica para a mesma seed.

    Como funciona: agrupa os indices por classe, embaralha DENTRO de cada
    classe, e tira a mesma fracao de cada uma. Assim a distribuicao de classes
    do conjunto original se preserva nos dois lados.
    """
    if not 0 < frac_treino < 1:
        raise ValueError("frac_treino deve estar entre 0 e 1")

    por_classe = defaultdict(list)
    for i, y in enumerate(rotulos):
        por_classe[y].append(i)

    rng = random.Random(seed)
    treino, teste = [], []
    for classe in sorted(por_classe, key=str):
        idx = por_classe[classe][:]
        rng.shuffle(idx)
        corte = round(len(idx) * frac_treino)
        # garante ao menos 1 exemplo de cada lado quando a classe permite
        if len(idx) >= 2:
            corte = min(max(corte, 1), len(idx) - 1)
        treino += idx[:corte]
        teste += idx[corte:]

    rng.shuffle(treino)
    rng.shuffle(teste)
    return treino, teste


def distribuicao(rotulos, indices=None) -> dict:
    """Contagem por classe — para voce REPORTAR, nao so confiar."""
    alvo = rotulos if indices is None else [rotulos[i] for i in indices]
    d = defaultdict(int)
    for y in alvo:
        d[y] += 1
    return dict(sorted(d.items(), key=lambda kv: str(kv[0])))


def relatorio_split(rotulos, treino, teste) -> str:
    """Texto pronto para colar no relatorio ou no log da execucao."""
    total = distribuicao(rotulos)
    dtr = distribuicao(rotulos, treino)
    dte = distribuicao(rotulos, teste)
    linhas = [
        f"Total: {len(rotulos)} | treino: {len(treino)} | teste: {len(teste)}",
        f"{'classe':>10} {'total':>8} {'treino':>8} {'teste':>8} {'%treino':>9} {'%teste':>8}",
    ]
    for c in total:
        ptr = 100 * dtr.get(c, 0) / max(1, len(treino))
        pte = 100 * dte.get(c, 0) / max(1, len(teste))
        linhas.append(
            f"{str(c):>10} {total[c]:>8} {dtr.get(c,0):>8} {dte.get(c,0):>8} "
            f"{ptr:>8.1f}% {pte:>7.1f}%"
        )
    return "\n".join(linhas)


if __name__ == "__main__":
    # Demonstracao: base desbalanceada 70/30
    y = [0] * 700 + [1] * 300
    tr, te = split_estratificado(y, 0.8, seed=42)
    print(relatorio_split(y, tr, te))
    tr2, te2 = split_estratificado(y, 0.8, seed=42)
    print("\nDeterminismo com a mesma seed:", "OK" if tr == tr2 and te == te2 else "FALHOU")
    tr3, _ = split_estratificado(y, 0.8, seed=43)
    print("Seed diferente produz split diferente:", "OK" if tr != tr3 else "FALHOU")
