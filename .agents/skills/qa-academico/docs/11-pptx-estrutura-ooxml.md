# PPTX — estrutura do pacote OOXML

Um `.pptx` é um ZIP de XMLs. Entender quatro arquivos resolve quase tudo.

```
[Content_Types].xml              declara o tipo de cada parte e cada extensão de mídia
ppt/presentation.xml             <p:sldIdLst> = a ORDEM dos slides
ppt/_rels/presentation.xml.rels  rId -> caminho do arquivo de slide
ppt/slides/slideN.xml            o conteúdo de um slide
ppt/slides/_rels/slideN.xml.rels rId -> layout, imagens, notas desse slide
ppt/media/                       as imagens
```

## Ordem de apresentação ≠ nome do arquivo

Esta é a armadilha número um. O slide que aparece em 56º lugar pode ser o
`slide57.xml`. Sempre resolva o mapeamento antes de editar:

```python
import zipfile, re
z = zipfile.ZipFile("deck.pptx")
pres = z.read("ppt/presentation.xml").decode()
rels = dict(re.findall(r'Id="([^"]+)"[^>]*Target="([^"]+)"',
                       z.read("ppt/_rels/presentation.xml.rels").decode()))
for i, (sid, rid) in enumerate(re.findall(r'<p:sldId id="(\d+)" r:id="([^"]+)"/>', pres), 1):
    print(i, rels[rid])
```

Editar `slide50.xml` achando que é o 50º da apresentação já produziu correção
aplicada no slide errado.

## Slide duplicado

Sintoma: o mesmo slide aparece duas vezes na apresentação.
Causa: duas entradas `<p:sldId>` apontando para o **mesmo** part.

```xml
<p:sldId id="300" r:id="rId74"/>   <!-- ambas -->
<p:sldId id="301" r:id="rId56"/>   <!-- para slides/slide57.xml -->
```

Correção: remova **uma** das entradas de `<p:sldIdLst>` e a `Relationship`
correspondente em `ppt/_rels/presentation.xml.rels`. **Não apague o
`slideN.xml`** — a outra entrada ainda o usa.

Detecção:

```python
alvos = [rels[rid] for _, rid in ids]
dups = [t for t in set(alvos) if alvos.count(t) > 1]
```

## Nunca copie um slide na mão

Duplicar um slide exige: criar o arquivo, criar o `.rels` dele, registrar em
`[Content_Types].xml`, criar a `Relationship` em `presentation.xml.rels` e
inserir o `<p:sldId>` na posição certa de `<p:sldIdLst>`. Esquecer um desses
passos gera arquivo que o PowerPoint recusa abrir.

Use uma ferramenta que faça todo o registro. E saiba que um slide duplicado
ainda **referencia** as mesmas partes de gráfico/SmartArt do original — editar
o gráfico de um altera o do outro.

## Relationships órfãs

Um `slideN.xml.rels` pode listar imagens que nenhum `<p:pic>` usa. Isso incha o
arquivo e confunde validadores.

```python
usadas  = set(re.findall(r'r:embed="([^"]+)"', slide_xml))
rels_img = dict(re.findall(r'Id="([^"]+)"[^>]*Target="\.\./media/([^"]+)"', rels_xml))
orfas = set(rels_img) - usadas
```

Antes de remover: **veja o que são**. Numa correção real, as "órfãs" eram
exatamente os prints que faltavam em outro slide — recuperá-las poupou o
trabalho de refazer as capturas.

## Editar o XML sem corromper

```bash
python3 -c "import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall('unpacked')" deck.pptx
# ... edite unpacked/ppt/slides/slideN.xml ...
(cd unpacked && rm -f ../out.pptx && zip -Xr ../out.pptx .)
```

Três detalhes que quebram o arquivo:

- **Zipar de fora do diretório.** Tem que ser de dentro (`cd unpacked`), senão o
  ZIP ganha um nível de pasta a mais e o arquivo não abre.
- **Não apagar o `.pptx` de saída antes.** `zip` atualiza em vez de recriar, e
  partes que você removeu sobrevivem.
- **Parsear com `xml.etree.ElementTree`.** O round-trip reescreve os prefixos de
  namespace e corrompe o deck. Use `defusedxml.minidom`, ou edição por texto
  com regex quando a mudança for pontual.

## Limitações do python-docx/python-pptx

`python-pptx` é excelente para ler e para checagens programáticas, mas:

- não duplica slide (a única entrada é `add_slide(layout)`);
- `text_frame.text = "..."` colapsa o parágrafo num run sem estilo — atribua
  `run.text` para preservar formatação;
- não lê SVG/EMF, que é o que a maior parte da arte de template usa
  (`add_picture` levanta `UnidentifiedImageError`).

Para edição estrutural, XML direto costuma ser mais seguro.

## Estrutura de texto

Uma linha = um `<a:p>`. Nunca concatene itens num parágrafo só.
Rótulo em negrito e valor normal = **dois runs** no mesmo parágrafo:

```xml
<a:p>
  <a:r><a:rPr lang="pt-BR" sz="1400" b="1"/><a:t>accuracy: </a:t></a:r>
  <a:r><a:rPr lang="pt-BR" sz="1400"/><a:t>0.885</a:t></a:r>
</a:p>
```

Marcadores: deixe herdar do layout. Só sobrescreva com `<a:buChar>`,
`<a:buAutoNum>` ou `<a:buNone>`. Nunca escreva um `•` literal no texto.
