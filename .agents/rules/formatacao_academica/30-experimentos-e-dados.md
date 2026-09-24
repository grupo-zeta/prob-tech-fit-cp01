# Experimentos e integridade de dados

Os outros guias desta pasta cuidam do **formato** — geometria de slide,
compilação de LaTeX. Este cuida do **conteúdo**, que é onde os erros custam
nota e credibilidade em vez de só ficarem feios.

Regra que resume tudo: **todo número num artefato tem que ter um log que o
gerou.** Se você não consegue apontar o arquivo de saída da execução, o número
não entra.

---

## 1. Reprodutibilidade antes de qualquer experimento

Antes de rodar a primeira variação, o pipeline precisa de:

- **`--seed` obrigatório**, propagado para tudo que usa aleatoriedade: o
  embaralhamento do split, a inicialização dos pesos, dropout, qualquer
  amostragem. Uma seed só, um ponto de entrada.
- **Prova de determinismo**: duas execuções com a mesma seed devem dar
  exatamente o mesmo resultado. Rode duas vezes e compare antes de seguir.
- **Split estratificado de verdade** quando o problema é de classificação:
  separe os índices por classe, embaralhe dentro de cada classe, tire a fração
  de cada uma, junte. `shuffle` seguido de fatiamento **não** é estratificado —
  a proporção de classes flutua a cada execução.

Sem isso, comparar duas configurações não mede o hiperparâmetro: mede o ruído
da partição. A tabela fica bonita e não significa nada.

Verificação mínima a reportar: contagem de exemplos por classe em treino e em
teste.

## 2. Um eixo por vez

Para a discussão das variações fazer sentido, mude **uma** coisa de cada vez a
partir de uma configuração base:

| Eixo | Exemplo |
|---|---|
| pré-processamento | nenhum / min-max / z-score |
| arquitetura | mais rasa, mais larga, mais profunda |
| ativação | ReLU / tanh / sigmoid nas ocultas |
| learning rate | uma ordem de grandeza acima e abaixo |
| regularização | com e sem dropout / early stopping |

Tudo o mais fixo, seed igual. Duas mudanças simultâneas produzem um resultado
que não se sabe atribuir a nada.

## 3. Registre o fracasso como resultado

`NaN na época 12 com lr 0.02 e sem normalização` é um dado, e dos bons — mostra
explosão de gradientes. Divergência, não convergência e instabilidade entram na
tabela como o que são.

O que **não** entra: valor estimado, valor interpolado, valor reaproveitado de
execução antiga com outra configuração, e valor "aproximado do que deu na vez
passada".

Se uma linha da tabela não tem log, ela sai da tabela e vira pendência.

## 4. Auditoria de tabela herdada

Ao pegar um relatório que já tem tabela, trate cada linha como **não confiável
até provar o contrário**. Para cada uma, pergunte: qual execução gerou isto?
Se ninguém sabe, rode de novo.

Foi assim que se descobriu que duas das três linhas de uma Tabela 1 podiam nunca
ter sido executadas — estavam lá havia várias versões do documento, e ninguém
tinha perguntado.

## 5. Inventário de stack: leia o código, não o requirements

`requirements.txt` lista o que está **instalado**. O relatório descreve o que
**participa** da solução. São conjuntos diferentes.

Como levantar:

```bash
grep -rhE '^\s*(import|from) ' --include='*.py' src/ | sort -u
```

Depois, para cada biblioteca encontrada, responda: ela está no caminho crítico
descrito no diagrama de arquitetura, ou é ferramenta auxiliar de um script
isolado? Só a primeira categoria entra na seção de Método.

E o inverso importa igual: se a especificação pedia algo "do zero" e o código
realmente não usa biblioteca para aquilo, **diga isso explicitamente**. Ausência
de dependência é ponto forte, não omissão.

Nunca escreva nome de biblioteca que você não viu num `import`.

## 6. Um nome, uma coisa

Se o relatório chama X de "harness", o slide chama X de "harness" e a figura
mostra X, os três X têm que ser a mesma coisa.

Caso real: o texto descrevia o harness como script de avaliação em Python, o
slide dizia "harness autônomo com orquestração via Context Tree", e a figura era
um print da IDE agêntica. Três coisas, um nome. Quem avalia percebe.

Ao encontrar isso: escolha uma definição, aplique nos dois artefatos, e renomeie
o outro conceito.

## 7. Verifique o artefato, não o relato do artefato

Um agente que diz "corrigi e o validador aprovou" pode estar certo e o arquivo
errado. Peça o arquivo, rode o validador você mesmo, renderize e olhe.

Caso real: o relato de correção estava fiel ao que o agente fez, e mesmo assim
três imagens saíram distorcidas — ele aplicou alturas corretas para arquivos que
não eram os que inseriu. Nenhuma leitura do relato pegaria isso; a primeira
execução do validador pegou.

## 8. Checklist de aceite dos dados

Antes de fechar qualquer relatório com resultado experimental:

- [ ] seed fixa e determinismo comprovado com duas execuções
- [ ] split estratificado, com contagem por classe reportada
- [ ] cada linha da tabela tem um log de execução identificável
- [ ] uma variável por vez entre as linhas comparadas
- [ ] falhas e divergências registradas como resultado
- [ ] bibliotecas do Método conferidas contra os `import` do código
- [ ] termos técnicos com significado único entre relatório, slides e figuras
- [ ] artefatos finais verificados por execução própria, não por relato

## 9. Ideia que vale o esforço: tabela como artefato de build

O modo definitivo de tornar número inventado impossível é remover o caminho
manual até a tabela:

```
runner.py --seed 42 --config zscore_13_8_5_1   ->  results/zscore_13_8_5_1_s42.json
build_table.py results/*.json                  ->  sections/tabela_metricas.tex
```

O `.tex` da tabela passa a ser gerado, nunca editado à mão. Se uma configuração
não foi executada, a linha simplesmente não existe — não há como escrevê-la.
