# Site Compasso

Página direta com download Windows, apresentação, dúvidas, contato pelo GitHub e perfil local. A identidade usa roxo/ciano e marca orbital laranja. Esta exportação React/Vite funciona sem o servidor do site anterior, conta ChatGPT ou banco remoto.

## Executar

Node compatível com Vite 8 (20.19+ ou 22.12+). Na pasta site:

```sh
npm ci
python preparar_downloads.py CAMINHO/Compasso-Windows-v4.1.1.zip CAMINHO/Compasso-fontes-v4.1.1.zip
npm run dev
```

Os dois ZIPs são os entregáveis limpos do aplicativo, distribuídos separadamente. A preparação divide o ZIP Windows em partes de até 20 MiB; o botão do site reconstitui um único ZIP e confere SHA256 no navegador. Os binários/modelos não são enviados como arquivos comuns do Git. Sem preparar os downloads, as páginas e o perfil funcionam, mas o botão de download informa falha.

Para hospedar: `npm run build`, publicar a pasta dist em hospedagem estática na raiz de um domínio (com os downloads preparados). O diretório public/downloads é gerado localmente e ignorado pelo Git. Não há publicação automática ao enviar esta branch. A publicação do Sites anterior continua privada até o proprietário decidir alterar o acesso.

## Perfil e privacidade

Nome opcional e objetivo; importação de backup compasso-backup-v1 por arquivo de até 15 MB. Mostra totais por dia/projeto e categorias definidas no aplicativo. O backup é lido em memória; somente os totais, nome e objetivo ficam no localStorage. Não guarda capturas/títulos de janelas, não envia backup e não sincroniza contas automaticamente. Não confundir este perfil local com a conta do painel web anterior, que foi preservado na hospedagem original.

Contato abre uma solicitação no GitHub do grupo; exige conta GitHub e a mensagem é pública. Nenhuma mensagem é enviada automaticamente.

## Validação

Build e checagem TypeScript da versão hospedada aprovados. Teste no Edge headless verificou download idêntico ao ZIP Windows, persistência do perfil, importação/erro de arquivo, categorias por janela, divisão diária, ausência de POST ao site e layout de 360 a 1440 px. Dados usados nos testes são sintéticos. A acurácia da webcam do aplicativo continua exigindo teste humano.
