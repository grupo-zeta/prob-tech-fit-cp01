# LaTeX — catálogo de erros reais e como diagnosticar

Todos os casos abaixo aconteceram de verdade, com a assinatura exata do log.

## Diagnóstico primeiro

Antes de mudar qualquer coisa, compile e leia os logs. O log diz o que está
errado; adivinhar não.

```bash
latexmk -C
latexmk -pdf -bibtex -interaction=nonstopmode main.tex
grep -nE "^!|Undefined control sequence|Citation .* undefined|Reference .* undefined|Overfull|Underfull" main.log
cat main.blg
```

O `.blg` (log do BibTeX) é o mais ignorado e o que mais esconde causa raiz.

---

## Erro 1 — documento principal errado

**Sintoma:** o código de um ambiente (por exemplo `tikzpicture`) aparece
impresso como texto corrido no PDF, em vez de renderizar.

**Causa:** o projeto tem dois documentos completos. O template LNCS traz
`samplepaper.tex`; se alguém copiou o conteúdo para `main.tex` e deixou os dois,
o compilador pode estar rodando o errado — e o errado não tem os `\usepackage`
que o certo tem.

Quando `tikz` não está carregado, `\begin{tikzpicture}` fica indefinido, o LaTeX
em modo `nonstopmode` reclama e **imprime o corpo do ambiente como texto**.
É exatamente o que se vê no PDF.

**Correção:**

1. apague o documento duplicado;
2. fixe o principal, primeira linha do arquivo certo:
   `% !TEX root = main.tex`
3. no Overleaf: Menu → Settings → Main document.

**Prevenção:** um projeto, um `\documentclass`.

```bash
grep -rl '\\documentclass' --include='*.tex' .   # deve retornar UM arquivo
```

---

## Erro 2 — espaço dentro do `\cite`

**Sintoma:** `[1,?]` no PDF. A chave funciona sozinha em outro ponto do texto.

**Assinatura no `main.blg`:**

```
White space in argument---line 7 of file main.aux
 : \citation{glorot2010,
 :                       he2015}
I'm skipping whatever remains of this command
```

**Causa:** `\cite{glorot2010, he2015}` — o espaço depois da vírgula faz o BibTeX
abortar a leitura da segunda chave.

**Correção:** `\cite{glorot2010,he2015}`, sem espaço.

**Prevenção:**

```bash
grep -rnE '\\(cite|ref|label)\{[^}]*[, ] ' --include='*.tex' .
```

---

## Erro 3 — BOM UTF-8 em arquivo incluído

**Sintoma:** caractere invisível, erro de "Unicode character U+FEFF", ou
comportamento diferente entre compiladores.

**Causa:** bytes `EF BB BF` no início de um `.tex` — típico de arquivo escrito
por script Python no Windows.

**Detecção e correção:**

```bash
python3 - <<'EOF'
import glob
for f in glob.glob('**/*.tex', recursive=True) + glob.glob('**/*.bib', recursive=True):
    b = open(f, 'rb').read()
    if b.startswith(b'\xef\xbb\xbf'):
        open(f, 'wb').write(b[3:]); print('BOM removido:', f)
EOF
```

---

## Erro 4 — `.bib` com autores em chave dupla

**Sintoma:** a referência sai com um "and" literal no meio dos nomes:
`Glorot, X., and Bengio, Y.:`

**Causa:**

```bibtex
author={{Glorot, X., and Bengio, Y.}}     % ERRADO
```

As chaves duplas dizem ao BibTeX "isto é UM nome, não mexa". Ele não separa os
autores e imprime a string crua.

**Correção:** um autor por `and`, nomes completos, sem chave dupla:

```bibtex
author = {Glorot, Xavier and Bengio, Yoshua}
```

**Outros defeitos de `.bib` que aparecem juntos:**

| Defeito | Efeito | Correção |
|---|---|---|
| `journal={nature}` | sai minúsculo | `journal = {Nature}` |
| `imagenet` no título | estilo baixa a caixa | `{ImageNet}` |
| `@misc` com `publisher` | campo ignorado, some do PDF | `howpublished = {...}` |
| falta DOI/URL | LNCS pede | `note = {\url{https://doi.org/...}}` |

Regra: proteja com chaves toda sigla e todo nome próprio dentro de `title`.

---

## Erro 5 — `\vspace` negativo espalhado

**Sintoma:** figura pulando sozinha para a página seguinte, espaçamento de seção
inconsistente, avisos de `Underfull \vbox`.

**Causa:** hacks de `\vspace{-0.2cm}` antes de `\section`, dentro de `figure`,
em volta de `equation`. `\vspace` antes de `\section` não tem efeito previsível,
porque o comando de seção define seu próprio espaçamento.

**Correção:** remova todos. Se o documento realmente precisa encolher, use os
mecanismos certos: `\small` em tabela, redimensionar figura, ou reescrever o
texto.

```bash
grep -rn '\\vspace{-' --include='*.tex' .
```

---

## Erro 6 — arquivo do template no projeto entregue

`llncsdoc.pdf`, `history.txt`, `readme.txt`, `fig1.eps`, `samplepaper.tex` são
arquivos do pacote LNCS, não do seu trabalho. Deixe no projeto apenas:

```
main.tex  references.bib  llncs.cls  splncs04.bst  sections/  figures/
```

---

## Ordem de pacotes

`hyperref` deve vir perto do fim do preâmbulo, depois da maioria dos pacotes
(exceções conhecidas à parte). Carregar `tikz` depois de `hyperref` funciona,
mas se aparecer comportamento estranho de link ou âncora, tente inverter.

`inputenc` só funciona com **pdfLaTeX**. Se o compilador for XeLaTeX ou LuaLaTeX,
`\usepackage[utf8]{inputenc}` quebra — nesses casos use `fontspec`.
Confirme o compilador antes de mexer no preâmbulo.
