#!/usr/bin/env python3
"""
Validador de projeto LaTeX — multiplataforma (Windows/Linux/macOS, sem bash).

Uso:
    python validar_latex.py [diretorio] [--main main.tex] [--static-only] [--no-render]

Modos:
    --static-only   So as checagens que nao precisam compilar (< 1 s).
                    E o modo dos hooks de ciclo de vida.
    (padrao)        Estaticas + compilacao (latexmk/bibtex) + leitura de
                    .log e .blg + renderizacao das paginas para inspecao.

Escopo (importante para hooks):
    --file CAMINHO  Restringe os ERROS ao arquivo indicado. Problemas
                    preexistentes em outros arquivos viram AVISO, para o hook
                    nao se trancar impedindo justamente a edicao que corrige.

Saida:
    0 = aprovado (pode ter avisos)
    1 = reprovado (ha erro)
    2 = nao foi possivel executar (ferramenta ausente, projeto invalido)
"""

from __future__ import annotations

import argparse
import glob
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

# ---------------------------------------------------------------- utilidades

VERDE, VERM, AMAR, ZERA = "", "", "", ""
if sys.stdout.isatty() and os.name != "nt":
    VERDE, VERM, AMAR, ZERA = "\033[32m", "\033[31m", "\033[33m", "\033[0m"


class Relatorio:
    def __init__(self):
        self.erros: list[str] = []
        self.avisos: list[str] = []

    def erro(self, msg, detalhe=None):
        self.erros.append(msg)
        print(f"  {VERM}[ERRO]{ZERA} {msg}")
        if detalhe:
            for linha in str(detalhe).rstrip().splitlines()[:10]:
                print(f"         {linha}")

    def aviso(self, msg, detalhe=None):
        self.avisos.append(msg)
        print(f"  {AMAR}[aviso]{ZERA} {msg}")
        if detalhe:
            for linha in str(detalhe).rstrip().splitlines()[:8]:
                print(f"         {linha}")

    def ok(self, msg):
        print(f"  {VERDE}[ ok ]{ZERA} {msg}")


def arquivos(raiz: Path, *padroes):
    saida = []
    for p in padroes:
        saida += [Path(f) for f in glob.glob(str(raiz / "**" / p), recursive=True)]
    return sorted(set(saida))


def ler(caminho: Path) -> str:
    return caminho.read_text(encoding="utf-8", errors="replace")


def rel(caminho: Path, raiz: Path) -> str:
    try:
        return str(caminho.relative_to(raiz))
    except ValueError:
        return str(caminho)


def sem_comentario(linha: str) -> str:
    """Remove o comentario LaTeX (% nao escapado) do fim da linha."""
    fora = []
    i = 0
    while i < len(linha):
        c = linha[i]
        if c == "\\" and i + 1 < len(linha):
            fora.append(linha[i:i + 2]); i += 2; continue
        if c == "%":
            break
        fora.append(c); i += 1
    return "".join(fora)


def conta(texto: str, padrao: str) -> list[str]:
    return [l for l in texto.splitlines() if re.search(padrao, l)]


# ------------------------------------------------------- checagens estaticas


def checar_estatico(raiz: Path, rep: Relatorio, escopo: Path | None):
    """Tudo aqui roda em milissegundos. E o que o hook executa."""

    def registra(msg, detalhe, arquivo: Path | None):
        # Se ha escopo e o problema esta noutro arquivo, e preexistente:
        # vira aviso para nao bloquear a edicao que talvez o corrija.
        if escopo and arquivo and arquivo.resolve() != escopo.resolve():
            rep.aviso(f"(preexistente, fora do escopo) {msg}", detalhe)
        else:
            rep.erro(msg, detalhe)

    # 1. um unico \documentclass
    docs = [f for f in arquivos(raiz, "*.tex") if "\\documentclass" in ler(f)]
    if not docs:
        rep.erro("nenhum \\documentclass encontrado — isto e um projeto LaTeX?")
    elif len(docs) > 1:
        msg = f"{len(docs)} arquivos com \\documentclass — so pode haver um documento principal"
        det = ("\n".join(rel(d, raiz) for d in docs)
               + "\n(apague os duplicados, ex.: samplepaper.tex do template LNCS,"
                 "\n e fixe o principal com '% !TEX root = main.tex' na 1a linha)")
        if escopo:
            # Condicao estrutural preexistente: nao pode bloquear a edicao em
            # curso, senao o hook se tranca impedindo justamente o conserto.
            rep.aviso(f"(preexistente, estrutural) {msg}", det)
        else:
            rep.erro(msg, det)
    else:
        rep.ok(f"um unico \\documentclass: {rel(docs[0], raiz)}")

    # 2. BOM UTF-8
    com_bom = []
    com_crlf = []
    for f in arquivos(raiz, "*.tex", "*.bib"):
        b = f.read_bytes()
        if b.startswith(b"\xef\xbb\xbf"):
            com_bom.append(f)
        if b"\r\n" in b:
            com_crlf.append(f)
    if com_bom:
        for f in com_bom:
            registra(f"BOM UTF-8 em {rel(f, raiz)} (remova os 3 primeiros bytes)", None, f)
    else:
        rep.ok("nenhum BOM em .tex/.bib")
    if com_crlf:
        rep.aviso(f"{len(com_crlf)} arquivo(s) com finais de linha CRLF")

    # 3. espaco dentro de \cite / \ref  (a causa raiz do "[1,?]")
    achou = False
    for f in arquivos(raiz, "*.tex"):
        for i, linha_bruta in enumerate(ler(f).splitlines(), 1):
            linha = sem_comentario(linha_bruta)
            for m in re.finditer(r"\\(cite|ref|eqref|autoref)\{([^}]*)\}", linha):
                if re.search(r",\s", m.group(2)):
                    achou = True
                    registra(
                        f"espaco depois da virgula dentro de \\{m.group(1)} "
                        f"em {rel(f, raiz)}:{i} — o BibTeX DESCARTA a chave "
                        f"e o PDF sai com '?'",
                        f"\\{m.group(1)}{{{m.group(2)}}}   ->   "
                        f"\\{m.group(1)}{{{re.sub(chr(44) + r'\s+', ',', m.group(2))}}}",
                        f,
                    )
    if not achou:
        rep.ok("nenhum espaco dentro de \\cite/\\ref")

    # 4. author com chave dupla no .bib
    achou = False
    for f in arquivos(raiz, "*.bib"):
        for i, linha in enumerate(ler(f).splitlines(), 1):
            if re.search(r"author\s*=\s*\{\{", linha):
                achou = True
                registra(
                    f"author com chave dupla em {rel(f, raiz)}:{i} — o BibTeX trata "
                    "como UM autor so e imprime o 'and' literal",
                    linha.strip(),
                    f,
                )
    if not achou:
        rep.ok("nenhum author com chave dupla")

    # 5. avisos de estilo
    vsp = []
    for f in arquivos(raiz, "*.tex"):
        for i, linha_bruta in enumerate(ler(f).splitlines(), 1):
            linha = sem_comentario(linha_bruta)
            if "\\vspace{-" in linha:
                vsp.append(f"{rel(f, raiz)}:{i}: {linha.strip()}")
    if vsp:
        rep.aviso(f"{len(vsp)} ocorrencia(s) de \\vspace negativo (hack de layout)",
                  "\n".join(vsp))

    semtil = []
    for f in arquivos(raiz, "*.tex"):
        for i, linha_bruta in enumerate(ler(f).splitlines(), 1):
            linha = sem_comentario(linha_bruta)
            if re.search(r"(Figura|Tabela|Se[çc][ãa]o|Equa[çc][ãa]o|Figure|Table) \\(ref|eqref)", linha):
                semtil.append(f"{rel(f, raiz)}:{i}")
    if semtil:
        rep.aviso("referencia cruzada sem til (use Figura~\\ref{...})", "\n".join(semtil))

    figdir = raiz / "figures"
    if figdir.is_dir():
        corpo = "".join(ler(f) for f in arquivos(raiz, "*.tex"))
        EXT_IMG = {".png", ".jpg", ".jpeg", ".pdf", ".eps", ".svg", ".gif", ".tif", ".tiff"}
        for img in sorted(figdir.iterdir()):
            if img.is_file() and img.suffix.lower() in EXT_IMG and img.name not in corpo:
                rep.aviso(f"imagem nunca usada: figures/{img.name} (requisito esquecido?)")


# ---------------------------------------------------- compilacao e pos-analise


def tem(cmd: str) -> bool:
    return shutil.which(cmd) is not None


def rodar(cmd: list[str], cwd: Path, timeout=300):
    try:
        return subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True,
                              timeout=timeout, errors="replace")
    except FileNotFoundError:
        return None
    except subprocess.TimeoutExpired:
        return "timeout"


def checar_compilacao(raiz: Path, principal: str, rep: Relatorio, renderizar: bool):
    base = principal[:-4] if principal.endswith(".tex") else principal

    if not tem("latexmk"):
        rep.erro(
            "latexmk nao esta no PATH — as checagens de compilacao nao rodaram",
            "Windows: instale o MiKTeX (winget install MiKTeX.MiKTeX).\n"
            "Se o latexmk existir mas falhar, falta Perl: winget install StrawberryPerl.StrawberryPerl",
        )
        return

    rodar(["latexmk", "-C"], raiz)
    r = rodar(["latexmk", "-pdf", "-bibtex", "-interaction=nonstopmode", principal], raiz)
    if r == "timeout":
        rep.erro("latexmk excedeu 300 s — possivel loop ou espera por input")
        return
    if r is None:
        rep.erro("nao foi possivel executar latexmk")
        return
    if r.returncode == 0:
        rep.ok("latexmk terminou sem erro fatal")
    else:
        rep.aviso(f"latexmk retornou codigo {r.returncode} — veja os itens abaixo")

    log = raiz / f"{base}.log"
    if not log.exists():
        rep.erro(f"{base}.log nao foi gerado — a compilacao nem comecou")
        return
    txt = ler(log)

    fatais = conta(txt, r"^!")
    if fatais:
        rep.erro(f"{len(fatais)} erro(s) fatal(is) no .log", "\n".join(fatais))
    else:
        rep.ok("nenhum erro fatal (^!)")

    cit = conta(txt, r"Citation .* undefined")
    if cit:
        rep.erro(f"{len(cit)} citacao(oes) indefinida(s)", "\n".join(cit))
    else:
        rep.ok("nenhuma citacao indefinida")

    ref = conta(txt, r"Reference .* undefined")
    if ref:
        rep.erro(f"{len(ref)} referencia(s) indefinida(s)", "\n".join(ref))
    else:
        rep.ok("nenhuma referencia indefinida")

    und = conta(txt, r"Undefined control sequence")
    if und:
        rep.erro(f"{len(und)} comando indefinido — pacote faltando no preambulo?",
                 "\n".join(und))
    else:
        rep.ok("nenhum comando indefinido")

    # --- .blg: aqui mora a causa raiz do "[1,?]" ---
    blg = raiz / f"{base}.blg"
    if blg.exists():
        btxt = ler(blg)
        ws = conta(btxt, r"White space in argument")
        if ws:
            trecho = []
            linhas = btxt.splitlines()
            for i, l in enumerate(linhas):
                if "White space in argument" in l:
                    trecho += linhas[i:i + 3]
            rep.erro("BibTeX DESCARTOU uma chave por espaco dentro de \\cite",
                     "\n".join(trecho))
        else:
            rep.ok("BibTeX sem 'White space in argument'")
        if conta(btxt, r"[Ee]rror message"):
            rep.erro(f"BibTeX reportou erro — leia {base}.blg")
        else:
            rep.ok("BibTeX sem mensagem de erro")
    else:
        rep.aviso(f"{base}.blg nao encontrado — o BibTeX rodou?")

    ovf = conta(txt, r"Overfull \\hbox")
    graves = [l for l in ovf if (m := re.search(r"\(([\d.]+)pt too wide\)", l)) and float(m.group(1)) > 5]
    if graves:
        rep.aviso(f"{len(graves)} Overfull \\hbox acima de 5pt", "\n".join(graves))
    elif ovf:
        rep.ok(f"{len(ovf)} Overfull \\hbox, todos abaixo de 5pt")
    else:
        rep.ok("nenhum Overfull \\hbox")

    # --- renderizacao ---
    if not renderizar:
        return
    pdf = raiz / f"{base}.pdf"
    if not pdf.exists():
        rep.erro("PDF nao foi gerado")
        return
    if not tem("pdftoppm"):
        rep.aviso(
            "pdftoppm ausente — nao foi possivel gerar as imagens das paginas",
            "Windows: instale o Poppler (winget install oschwartz10612.Poppler "
            "ou baixe poppler-windows e adicione o bin\\ ao PATH).\n"
            "A inspecao visual continua OBRIGATORIA — abra o PDF manualmente.",
        )
        return
    for antigo in raiz.glob("qa-pg-*.jpg"):
        antigo.unlink()
    rodar(["pdftoppm", "-jpeg", "-r", "100", f"{base}.pdf", "qa-pg"], raiz)
    pgs = sorted(raiz.glob("qa-pg-*.jpg"))
    print(f"  [ren ] {len(pgs)} pagina(s) em qa-pg-*.jpg")
    print("         ABRA E OLHE todas antes de entregar. Procure:")
    print("         '?' no lugar de citacao; codigo-fonte impresso como texto;")
    print("         figura estourando margem ou distorcida; tabela apertada;")
    print("         pagina quase vazia; 'and' literal nas referencias.")


# ------------------------------------------------------------------- main


def main() -> int:
    ap = argparse.ArgumentParser(description="Valida um projeto LaTeX (multiplataforma)")
    ap.add_argument("diretorio", nargs="?", default=".")
    ap.add_argument("--main", default="main.tex", help="arquivo principal (padrao: main.tex)")
    ap.add_argument("--static-only", action="store_true",
                    help="so checagens rapidas, sem compilar (modo dos hooks)")
    ap.add_argument("--no-render", action="store_true", help="nao gerar imagens das paginas")
    ap.add_argument("--file", help="restringe os ERROS a este arquivo; problemas "
                                   "preexistentes em outros viram aviso")
    args = ap.parse_args()

    raiz = Path(args.diretorio).resolve()
    if not raiz.is_dir():
        print(f"Diretorio nao encontrado: {raiz}")
        return 2

    escopo = None
    if args.file:
        escopo = Path(args.file).resolve()
        if not escopo.exists():
            # Falha ALTA e proposital. Se o placeholder do hook deixar de
            # expandir, --file recebe uma string literal, nenhum arquivo casa,
            # TODO erro vira "fora do escopo" e a barreira passa a aprovar
            # tudo em silencio. Melhor quebrar aqui do que falhar aberto.
            print(f"ERRO DE CONFIGURACAO: --file aponta para caminho inexistente:")
            print(f"  {args.file}")
            print("Se isto veio de um hook, o placeholder do arquivo editado nao")
            print("expandiu. Corrija a configuracao do hook — sem isso a validacao")
            print("passa a APROVAR TUDO sem bloquear nada.")
            return 2

    print(f"=== Projeto: {raiz}")
    print(f"=== Principal: {args.main}"
          + (f" | escopo: {escopo.name}" if escopo else "")
          + (" | MODO ESTATICO" if args.static_only else ""))
    print()

    rep = Relatorio()

    print("-- Checagens estaticas --")
    checar_estatico(raiz, rep, escopo)
    print()

    if not args.static_only:
        print("-- Compilacao e analise de log --")
        checar_compilacao(raiz, args.main, rep, renderizar=not args.no_render)
        print()

    print(f"=== Resultado: {len(rep.erros)} erro(s), {len(rep.avisos)} aviso(s)")
    if rep.erros:
        print("REPROVADO — corrija antes de entregar.")
        return 1
    if args.static_only:
        print("APROVADO nas checagens estaticas.")
        print("ATENCAO: modo estatico NAO detecta citacao indefinida nem erro de "
              "BibTeX. Rode o modo completo antes de entregar.")
        return 0
    print("APROVADO nas verificacoes automaticas.")
    print("A inspecao visual das paginas continua sendo obrigatoria.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
