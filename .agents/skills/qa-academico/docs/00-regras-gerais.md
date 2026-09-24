# Regras gerais — valem para slides e documentos

## 1. Meça, não reaproveite

**Nunca reutilize um número calculado numa iteração anterior.** Se o arquivo de
imagem mudou, se o template mudou, se o slide mudou de tamanho, todos os números
derivados dele estão inválidos.

Caso real: um agente recebeu alturas calculadas para imagens 1024×517, 1024×588 e
1024×480, inseriu arquivos 1024×575, 1024×653 e 1024×533 com os mesmos nomes, e
aplicou as alturas antigas. As três imagens saíram esticadas.

Regra operacional: antes de escrever qualquer dimensão, **releia a dimensão real
do arquivo que você de fato inseriu**. Se divergir do que foi informado, pare e
avise em vez de aplicar o número recebido.

## 2. Faça backup antes de tocar no arquivo

`.pptx` e projetos LaTeX são frágeis. Copie o original antes da primeira edição.
Se a edição falhar no meio, você precisa conseguir voltar.

## 3. Trabalho estrutural antes de trabalho de conteúdo

Adicionar, remover, duplicar e reordenar vem primeiro. Editar texto e imagem
vem depois. A ordem inversa faz você clonar conteúdo já editado ou apagar
conteúdo que acabou de escrever.

## 4. Nunca invente dado

Vale para número de experimento, nome de biblioteca, métrica, citação e imagem.

- Se o dado não está no código, no log ou no arquivo, ele **não existe**.
- Se falta uma imagem, **pare e peça**. Não gere placeholder colorido, não
  reaproveite imagem de outro slide, não desenhe uma aproximação.
- Se um experimento não foi rodado, deixe a linha de fora e avise. Não estime,
  não interpole, não reaproveite número de execução antiga.
- Se você precisou "reformular mentalmente" o pedido para conseguir cumprir,
  isso é sinal de que a resposta é perguntar, não prosseguir.

## 5. Pare nos pontos de decisão

Quando a tarefa envolve escolha que muda o resultado para o usuário — qual
arquivo é o oficial, qual número entra na tabela, qual texto vai para revisão —
**pare e pergunte**. Entregar rápido com a premissa errada custa mais caro do
que uma pergunta.

## 6. Não altere o que não foi pedido

Num deck compartilhado, os slides de outras pessoas são intocáveis. Num
documento, seções que não fazem parte da tarefa ficam como estão.
Ao final, o diff dos arquivos não relacionados deve ser **vazio**.

## 7. Valide sempre, e valide olhando

Toda entrega passa por três camadas:

1. **Checagem programática** — assertivas numéricas, grep no log.
2. **Renderização** — gerar o PDF/imagem e **olhar**.
3. **Diff** — confirmar que nada além do escopo mudou.

Depois de ficar olhando o próprio código, você tende a ver o que espera, não o
que renderizou. A inspeção visual é obrigatória, não opcional.

## 8. Codificação e finais de linha

UTF-8 **sem BOM**, finais de linha LF. Um BOM (bytes `EF BB BF`) no início de um
`.tex` incluído por `\input` já causou caractere inválido e comportamento
inconsistente entre compiladores.

Verificação:

```bash
python3 -c "
import sys,glob
for f in glob.glob(sys.argv[1], recursive=True):
    b=open(f,'rb').read()
    if b.startswith(b'\xef\xbb\xbf'): print('BOM:', f)
    if b'\r\n' in b: print('CRLF:', f)
" '**/*.tex'
```

## 9. Não deixe script de conserto no projeto

Scripts descartáveis de patch (`fix.py`, `fix_strict2.py`, `write_clean.py`) com
caminhos absolutos de máquina local não pertencem ao repositório entregue.
Depois que a correção foi aplicada, o artefato é o arquivo corrigido — o script
que o gerou vai embora.

## 10. Relate o que ficou pendente

Toda entrega termina com: o que foi alterado, arquivo por arquivo; os valores
aplicados; e a lista explícita do que depende do usuário (imagens a fornecer,
textos a revisar, experimentos a rodar).
