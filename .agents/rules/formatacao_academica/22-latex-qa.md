# LaTeX — QA obrigatório antes de entregar

## 1. Compilação limpa

```bash
python scripts/validar_latex.py caminho/do/projeto           # completo
python scripts/validar_latex.py . --static-only              # < 1 s, modo hook
python scripts/validar_latex.py . --file sections/03.tex     # escopo por arquivo
```

O modo estatico NAO detecta citacao indefinida nem erro de BibTeX: essas so
aparecem depois de compilar. Hook usa estatico; entrega usa completo.

Sempre com `latexmk -C` antes: arquivos auxiliares antigos escondem erro novo e
inventam erro que já não existe.

```bash
latexmk -C
latexmk -pdf -bibtex -interaction=nonstopmode main.tex
```

## 2. Critérios de aceite

Todos têm que passar:

| # | Verificação | Comando |
|---|---|---|
| 1 | Nenhum erro fatal | `grep -c '^!' main.log` → 0 |
| 2 | Nenhuma citação indefinida | `grep -c 'Citation .* undefined' main.log` → 0 |
| 3 | Nenhuma referência indefinida | `grep -c 'Reference .* undefined' main.log` → 0 |
| 4 | BibTeX sem espaço em `\cite` | `grep -c 'White space in argument' main.blg` → 0 |
| 5 | BibTeX sem erro | `grep -ci 'error' main.blg` → 0 |
| 6 | Sem `Overfull \hbox` relevante | inspecionar, corrigir os acima de ~5pt |
| 7 | Nenhum BOM em `.tex`/`.bib` | script |
| 8 | Um único `\documentclass` no projeto | `grep -rl '\\documentclass' --include='*.tex' .` |

O item 4 é o que mais engana: o `.log` mostra a citação como indefinida, mas a
causa está no `.blg`. Sempre leia os dois.

## 3. Inspeção visual

```bash
pdftoppm -jpeg -r 100 main.pdf pg
```

Olhe **todas** as páginas. Procure:

- `?` no lugar de número de citação ou de referência;
- código-fonte impresso como texto (ambiente não carregado);
- figura estourando a margem ou desalinhada da vizinha;
- imagem visivelmente distorcida;
- tabela com colunas encostadas ou estourando a largura do texto;
- página quase vazia por causa de float mal colocado;
- lista de referências com `and` literal, revista em minúsculo, sigla sem caixa;
- figura ou tabela sem `\caption` ou sem `\label`.

## 4. Conformidade com o que foi pedido

Compile o que a especificação exige contra o que o PDF tem. Item por item.
Uma seção presente com conteúdo genérico **não** cumpre um requisito específico:
"quais bibliotecas foram usadas" não é atendido por "computação vetorial
otimizada". Se o requisito pede nome, tem que ter nome.

Checklist típico de relatório técnico de disciplina:

- [ ] Introdução com motivação e especificação
- [ ] Método: bibliotecas **nomeadas**, harness identificado, uso da IA descrito
- [ ] Método: figura do ambiente/harness funcionando
- [ ] Método: diagrama de arquitetura (caixas e setas)
- [ ] Resultados: tabela de métricas com números de execuções **reais**
- [ ] Resultados: figura antes/depois
- [ ] Resultados: parágrafos discutindo cada variação testada
- [ ] Conclusão e trabalhos futuros
- [ ] Referências completas e citadas no texto

## 5. Integridade dos dados

Todo número no PDF tem que vir de execução real. Se você não consegue apontar o
log que gerou um número, ele não entra. Registre o que aconteceu de fato —
"NaN na época 12" é um resultado válido; um valor inventado não é.

## Relato final

```
Arquivos alterados: ...
Verificações: 8/8 passando (cole a saída do script)
Requisitos da especificação: N de M atendidos
Pendências do usuário:
  - imagens a fornecer
  - textos a revisar
  - experimentos a rodar
```
