# Instruções para mexer em slides (.pptx) e documentos (LaTeX)

Pasta de referência para agentes de IA (Antigravity, Claude Code, Cursor, etc.)
que forem editar apresentações PowerPoint ou documentos LaTeX/Overleaf.

Autor do contexto: Cauã Lira — UFRPE / IFPE.
Origem: erros reais encontrados e corrigidos em decks e relatórios de disciplina.
Cada regra aqui existe porque **algo quebrou de verdade** — não é teoria.

## Como usar

Cole no início da tarefa:

> Antes de editar qualquer .pptx ou arquivo .tex, leia os arquivos da pasta
> `instrucoes-slides-e-documentos/`. Aplique todas as regras de
> `00-regras-gerais.md` e as do domínio correspondente. Se o trabalho
> envolver número ou tabela de resultado, aplique também
> `30-experimentos-e-dados.md`. Ao final, rode os
> scripts de `scripts/` e me mostre a saída. Não declare a tarefa concluída
> com qualquer verificação falhando.

## Índice

| Arquivo | Quando ler |
|---|---|
| `00-regras-gerais.md` | Sempre. Vale para slides e documentos. |
| `10-pptx-geometria.md` | Qualquer coisa que envolva posição/tamanho de shape ou imagem |
| `11-pptx-estrutura-ooxml.md` | Adicionar, remover, duplicar ou reordenar slides |
| `12-pptx-qa.md` | Antes de entregar qualquer .pptx |
| `20-latex-erros-comuns.md` | Qualquer projeto .tex que não compila ou compila errado |
| `21-latex-figuras-tabelas.md` | Inserir/ajustar figura, tabela ou float |
| `22-latex-qa.md` | Antes de entregar qualquer PDF gerado do LaTeX |
| `30-experimentos-e-dados.md` | Qualquer artefato que contenha número, métrica ou tabela de resultado |
| `90-referencias-externas.md` | Precisa de documentação oficial ou exemplo canônico |

## Scripts

| Script | Uso |
|---|---|
| `scripts/validar_pptx.py` | `python scripts/validar_pptx.py deck.pptx` |
| `scripts/validar_latex.py` | `python scripts/validar_latex.py caminho/do/projeto` |

Ambos saem com código 1 se encontrarem problema, então dá para usar em CI ou
como gate antes de entregar.

Os dois são Python puro e multiplataforma — não precisam de bash, WSL ou Git Bash.
Se o `workspace-kit` estiver instalado, prefira o ponto de entrada único
(`python qa.py`), que chama estes mesmos scripts. Nunca mantenha duas cópias
divergentes.
