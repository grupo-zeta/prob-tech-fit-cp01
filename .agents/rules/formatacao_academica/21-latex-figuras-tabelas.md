# LaTeX — figuras, tabelas e floats

## Duas imagens lado a lado

**O erro clássico:** dar a mesma largura às duas.

```latex
% ERRADO — alturas diferentes, imagens desalinhadas, vão enorme no meio
\includegraphics[width=0.42\textwidth]{antes.png}
\hfill
\includegraphics[width=0.42\textwidth]{depois.png}
```

Se `antes.png` é 1024×688 (razão 1,488) e `depois.png` é 1024×540 (razão 1,896),
larguras iguais produzem alturas diferentes. O `\hfill` ainda empurra as duas
para as extremidades.

**Correção:** fixe a **altura** e centralize verticalmente com `minipage[c]`.

```latex
\begin{figure}[htbp]
    \centering
    \begin{minipage}[c]{0.48\textwidth}
        \centering
        \includegraphics[height=3.0cm]{figures/antes.png}
    \end{minipage}\hspace{0.02\textwidth}
    \begin{minipage}[c]{0.48\textwidth}
        \centering
        \includegraphics[height=3.0cm]{figures/depois.png}
    \end{minipage}
    \caption{Antes (esquerda) e depois (direita).}
    \label{fig:comparacao}
\end{figure}
```

**Como escolher a altura:** a imagem mais larga não pode estourar a minipage.

```
altura_max = largura_minipage / razão_da_imagem_mais_larga
```

Com `\textwidth ≈ 12,2 cm` em LNCS e minipage de 0,48, a largura útil é ~5,86 cm.
Para razão 1,896: `5,86 / 1,896 = 3,09 cm`. Por isso 3,0 cm.

Se aparecer `Overfull \hbox`, a altura está alta demais.

**Melhor ainda:** recorte as duas imagens com o mesmo enquadramento e a mesma
proporção antes de inserir. Comparação "antes/depois" onde um lado é o canvas e
o outro é a janela inteira do app não compara nada.

## Tabelas

`booktabs` em vez de `\hline`:

```latex
\begin{table}[ht]
\centering
\caption{Desempenho sob diferentes regimes.}
\label{tab:metricas}
\small
\setlength{\tabcolsep}{5pt}
\begin{tabular}{llccc}
\toprule
\textbf{Arquitetura} & \textbf{Pré-proc.} & \textbf{LR} & \textbf{Acurácia} & \textbf{F1} \\
\midrule
$[13, 8, 1]$    & Nenhum     & 0.02 & Divergência (NaN) & -- \\
$[13, 8, 5, 1]$ & Z-score    & 0.01 & 88.5\%            & 0.88 \\
\bottomrule
\end{tabular}
\end{table}
```

- `\toprule / \midrule / \bottomrule` no lugar de `\hline`;
- `\small` + `\setlength{\tabcolsep}{...}` quando as colunas encostam;
- em LNCS a legenda de tabela vai **acima**, a de figura **abaixo**.

## Floats

`[ht]` e `[htbp]` são sugestões, não ordens. Se uma figura teimar em pular de
página, a causa quase sempre é outra — `\vspace` negativo, figura grande demais,
parágrafo curto antes dela.

Não tente forçar com `[H]` (`float` package) por padrão: isso resolve o sintoma e
costuma criar página com buraco. Prefira reduzir a figura ou mover o parágrafo.

## Referências cruzadas

Use til, sempre, para não quebrar linha entre a palavra e o número:

```latex
Figura~\ref{fig:arquitetura}     % certo
Tabela~\ref{tab:metricas}        % certo
Figura \ref{fig:arquitetura}     % errado
```

```bash
grep -rnE '(Figura|Tabela|Se(ç|c)ão|Equação) \\ref' --include='*.tex' .
```

`\label` vem **depois** do `\caption`, senão o número referenciado sai errado.

## Diagramas com TikZ

Um diagrama de caixas e setas em TikZ vale mais que um print, porque escala com
a fonte e não pixeliza.

```latex
% no preâmbulo
\usepackage{tikz}
\usetikzlibrary{positioning, arrows.meta}
```

```latex
\begin{figure}[ht]
\centering
\begin{tikzpicture}[
    box/.style={rectangle, draw=black!70, fill=blue!8, thick,
                minimum width=2.8cm, minimum height=0.9cm,
                text centered, rounded corners=2pt},
    arrow/.style={-{Stealth[length=2mm]}, thick, draw=black!70}
]
    \node[box] (data) {Dataset \& Z-Score};
    \node[box, right=0.8cm of data] (mlp) {Grafo \& Backprop};
    \node[box, right=0.8cm of mlp] (gui) {Interface PyQt6};
    \draw[arrow] (data) -- (mlp);
    \draw[arrow] (mlp) -- (gui);
\end{tikzpicture}
\caption{Fluxo de processamento.}
\label{fig:arquitetura}
\end{figure}
```

`positioning` é o que habilita `right=0.8cm of X`; `arrows.meta` é o que habilita
`Stealth`. Faltando qualquer um dos dois, o diagrama não compila.

Se o diagrama sair como texto no PDF, o problema não é o TikZ — veja o Erro 1 em
`20-latex-erros-comuns.md`.

## Imagem que não é usada

Arquivo em `figures/` sem nenhum `\includegraphics` correspondente costuma
significar requisito esquecido, não lixo.

```bash
for f in figures/*; do
  n=$(basename "$f"); grep -rq "$n" --include='*.tex' . || echo "NÃO USADA: $f"
done
```
