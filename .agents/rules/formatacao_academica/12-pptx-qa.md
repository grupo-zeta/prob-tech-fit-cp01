# PPTX — QA obrigatório antes de entregar

Nenhuma entrega é declarada pronta com qualquer item destes falhando.

## 1. Checagem programática

```bash
python scripts/validar_pptx.py deck.pptx
```

O script verifica, para o deck inteiro:

- shapes fora da borda do slide;
- imagens com proporção distorcida em relação ao arquivo de origem;
- entradas duplicadas em `<p:sldIdLst>`;
- relationships de imagem órfãs;
- sobreposição entre caixa de texto e imagem.

Sai com código 1 se achar problema. Use como gate.

## 2. Conteúdo

```bash
markitdown deck.pptx
```

Procure conteúdo faltando, texto na ordem errada, e resíduo de template:

```bash
markitdown deck.pptx | grep -iE "\bx{3,}\b|lorem|ipsum|\bTODO|\[insert|SKIPPED"
```

Qualquer resultado é bug, corrija antes de entregar.

## 3. Renderização visual — obrigatória

```bash
soffice --headless --convert-to pdf deck.pptx
rm -f slide-*.jpg
pdftoppm -jpeg -r 150 deck.pdf slide
```

Renderize e **olhe** os slides que você tocou, mais o slide de referência ao
lado, para comparar. O que procurar, em ordem de frequência:

1. texto cortado ou transbordando a caixa ou a borda do slide;
2. imagem estourando a borda;
3. imagem visivelmente achatada ou esticada (proporção errada);
4. elementos sobrepostos: texto por cima de figura, linha cortando palavra;
5. colunas desalinhadas entre si;
6. espaçamento irregular — um vão grande de um lado, aperto do outro;
7. margem menor que 0,5" das bordas;
8. contraste baixo: texto claro em fundo claro, ícone escuro em fundo escuro;
9. rodapé/logotipo do template coberto por conteúdo novo;
10. resíduo de placeholder.

Compare com o slide modelo: alinhamento de título, largura da coluna de texto,
negrito nos rótulos, tamanho de fonte.

## 4. Contagem e diff

```bash
# o total de slides bate com o esperado?
python3 -c "import zipfile,re; \
p=zipfile.ZipFile('deck.pptx').read('ppt/presentation.xml').decode(); \
print(len(re.findall(r'<p:sldId ', p)), 'slides')"
```

Descompacte original e resultado em pastas separadas e faça diff dos
`ppt/slides/*.xml`. Tudo que não estava no escopo deve estar idêntico.

## 5. Abrir de verdade

LibreOffice renderiza arquivos que o PowerPoint recusa. Se o destino final é
PowerPoint, abra no PowerPoint pelo menos uma vez antes de entregar.

## Relato final

```
Slide N:
  - o que mudou
  - geometria aplicada: off(x,y) ext(cx,cy) de cada shape tocado
  - proporção verificada: cx/cy = A vs largura/altura da imagem = B
Pendências do usuário:
  - imagens a fornecer (nome e caminho)
  - textos a revisar
```
