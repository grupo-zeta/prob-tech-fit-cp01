# PPTX — geometria: EMU, proporção e transbordo

## A unidade

Tudo em OOXML é medido em **EMU** (English Metric Unit).

```
1 polegada = 914400 EMU
1 cm       = 360000 EMU
1 ponto    = 12700 EMU
```

Posição e tamanho aparecem sempre no mesmo par:

```xml
<a:off x="311700" y="1144075"/><a:ext cx="4150000" cy="3750000"/>
```

`off` é o canto superior esquerdo, `ext` é largura × altura.

## Descubra o tamanho do slide ANTES de qualquer cálculo

```bash
python3 -c "import zipfile,re; \
p=zipfile.ZipFile('deck.pptx').read('ppt/presentation.xml').decode(); \
print(re.search(r'sldSz[^/]*',p).group(0))"
```

Os dois formatos 16:9 mais comuns têm larguras **diferentes**:

| Formato | cx | cy | Polegadas |
|---|---|---|---|
| 16:9 "padrão Google Slides / LAYOUT_16x9" | 9144000 | 5143500 | 10 × 5,625 |
| 16:9 "widescreen / LAYOUT_WIDE" | 12192000 | 6858000 | 13,33 × 7,5 |

Caso real: um grid de 3 colunas foi montado com `x = 457200 | 4297680 | 8138160`
e `cx = 3657600` cada. Isso cabe num slide de 13,33", mas o deck era de 10" — a
terceira coluna inteira (texto + imagem) ficou fora do slide, invisível, e o
arquivo salvou sem reclamar. **Coordenada fora da borda é escrita, não é
recortada nem corrigida.**

## Regra de transbordo

Para todo shape:

```
off.x >= 0
off.y >= 0
off.x + ext.cx <= largura_do_slide
off.y + ext.cy <= altura_do_slide
```

Margem de segurança recomendada: 457200 EMU (0,5") de cada borda.
Reserve também a faixa do rodapé/logotipo do template — descubra onde ele está
abrindo um slide que você não vai editar e lendo o layout correspondente.

## Regra de proporção (a que mais quebra)

Uma imagem só não distorce se:

```
ext.cx / ext.cy  ==  largura_px / altura_px
```

Fluxo correto, sempre nesta ordem:

1. Leia as dimensões em pixels do arquivo que você **realmente** vai inserir.
2. Escolha a dimensão limitante (normalmente a largura da coluna).
3. Derive a outra.

```python
from PIL import Image
w_px, h_px = Image.open("figura.png").size
cx = 2590800                      # largura da coluna, escolhida por você
cy = round(cx * h_px / w_px)      # NUNCA chute, NUNCA reaproveite
```

Se a altura é que é limitante:

```python
cy = 3000000
cx = round(cy * w_px / h_px)
```

Tolerância na verificação: `abs(cx/cy - w_px/h_px) < 0.01`.

## Grid de N colunas

```python
W = 9144000          # largura do slide
margem = 457200
gap = 228600
n = 3

col = (W - 2*margem - (n-1)*gap) // n     # 2590800 para n=3
xs  = [margem + i*(col+gap) for i in range(n)]   # 457200, 3276600, 6096000
```

Legendas e imagens de todas as colunas usam o mesmo `y` e o mesmo `cx`.
Só o `cy` das imagens varia, porque cada uma tem sua proporção.

## Sobreposição entre texto e imagem

Duas caixas se sobrepõem quando existe interseção nos dois eixos:

```python
def sobrepoe(a, b):   # a, b = (x, y, cx, cy)
    ox = min(a[0]+a[2], b[0]+b[2]) - max(a[0], b[0])
    oy = min(a[1]+a[3], b[1]+b[3]) - max(a[1], b[1])
    return ox > 0 and oy > 0
```

Caso real: caixa de texto em `off(548640, ...)` com `cx=5303520` terminava em
5852160, e a imagem começava em 4697863 — 1.154.297 EMU de sobreposição. O
parágrafo mais longo passava por baixo da figura.

Exceção legítima: uma caixa de **título** larga que cruza a área de uma imagem
lateral não é defeito se o texto do título for curto e não alcançar a figura.
Verifique visualmente antes de "corrigir" isso.

## Texto que estoura a caixa

`ext.cy` de uma caixa de texto é o tamanho da caixa, não do texto. O texto pode
transbordar sem que a geometria acuse nada.

Se o texto renderizado ultrapassar o limite:

1. reduza o tamanho da fonte (`sz`, em centésimos de ponto: `sz="1400"` = 14pt);
2. reduza o espaçamento entre parágrafos (`<a:spcAft>`);
3. só então considere mudar a caixa.

Nunca deixe texto cortado. Nunca aumente a caixa para além da borda do slide.

## Herdar o estilo do template

Um shape com `sz` e `b="1"` explícitos ignora o estilo do layout e destoa dos
demais slides. Para um título ficar igual aos outros, copie a geometria do slide
modelo e **remova** o `sz` e o `b` explícitos, deixando herdar.

Para descobrir o padrão, leia o slide de referência:

```bash
python3 -c "import zipfile;zipfile.ZipFile('deck.pptx').extractall('unpacked')"
grep -o '<a:off[^/]*/><a:ext[^/]*/>' unpacked/ppt/slides/slide48.xml
```
