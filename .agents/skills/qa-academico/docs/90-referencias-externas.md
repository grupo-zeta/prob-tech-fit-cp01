# Referências externas verificadas

Links conferidos em setembro de 2026. Todos abrem sem login.
Use como fonte quando precisar de detalhe que não está nesta pasta.

## PPTX / OOXML

| Recurso | Link | Para quê |
|---|---|---|
| **python-pptx** | https://github.com/scanny/python-pptx | Biblioteca Python de referência para ler/escrever `.pptx`. O código-fonte em `src/pptx/oxml/` é a melhor documentação prática de como cada elemento OOXML se estrutura. |
| python-pptx — docs | https://python-pptx.readthedocs.io | API, conceitos, `Emu`/`Inches`/`Pt`, posicionamento de shape. |
| **PptxGenJS** | https://github.com/gitbrent/PptxGenJS | Gerar `.pptx` do zero em JS/Node. Útil quando a tarefa é criar, não editar. |
| PptxGenJS — docs | https://gitbrent.github.io/PptxGenJS/ | Referência de API e demos. |
| **python-docx** | https://github.com/python-openxml/python-docx | Mesmo ecossistema, para `.docx`. Os conceitos de part/relationship são idênticos aos do pptx. |
| **markitdown** | https://github.com/microsoft/markitdown | Extrair o texto de `.pptx`, `.docx`, `.pdf` para conferir conteúdo rapidamente. |

Ao ler o `python-pptx`, os arquivos mais úteis para entender geometria e
relacionamentos são `src/pptx/oxml/shapes/`, `src/pptx/parts/` e
`src/pptx/opc/` (o pacote OPC: content types, rels, partes).

## LaTeX

| Recurso | Link | Para quê |
|---|---|---|
| **LearnLaTeX** | https://github.com/learnlatex/learnlatex.github.io | Curso oficial em ~15 lições, mantido pelo LaTeX Project. Site: https://learnlatex.org |
| **awesome-LaTeX** (egeerardyn) | https://github.com/egeerardyn/awesome-LaTeX | Lista curada: pacotes, editores, ferramentas, referências. Ponto de partida quando não sabe qual pacote usar. |
| **awesome-LaTeX** (latexers) | https://github.com/latexers/awesome-LaTeX | Outra lista curada, com ênfase em templates e recursos. |
| **awesome-latex-drawing** | https://github.com/xinychen/awesome-latex-drawing | 30+ exemplos de TikZ/PGFPlots prontos e reproduzíveis: diagramas, redes bayesianas, tensores, arquiteturas de ML. Ideal para figura de arquitetura em relatório. |
| **latexmk** | https://ctan.org/pkg/latexmk | Automatiza quantas passadas de LaTeX/BibTeX são necessárias. A documentação canônica está no CTAN, não no GitHub. |
| latexmk — demo prática | https://github.com/michaelcadilhac/latexmkdemo | Introdução curta ao `latexmk`, incluindo `.latexmkrc` e `-outdir`. |

## Como pedir para o agente consultar

Estes links existem para o agente **buscar detalhe que a pasta não cobre**, não
para substituir as regras daqui. Frase útil:

> Se precisar de detalhe de OOXML que não está em
> `11-pptx-estrutura-ooxml.md`, consulte o código-fonte de
> https://github.com/scanny/python-pptx (pasta `src/pptx/oxml/`).
> Para pacote LaTeX que não conhece, consulte
> https://github.com/egeerardyn/awesome-LaTeX e a documentação no CTAN.
> Não invente comportamento de pacote: se não conseguir confirmar, pergunte.

## Aviso

Nenhuma dessas fontes substitui a **verificação no seu próprio arquivo**. Um
exemplo do `awesome-latex-drawing` pode usar um pacote que o seu template LNCS
não carrega; um snippet de `python-pptx` pode assumir um slide de 13,33" quando
o seu tem 10". Sempre compile e renderize antes de aceitar.
