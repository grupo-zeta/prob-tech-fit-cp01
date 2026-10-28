# IA local com Ollama

## Configuração concluída neste PC em 28/10/2026

Ollama 0.40.12 instalado para o usuário Windows; serviço local respondendo. Modelo visual gemma3:4b baixado e verificado. Sem login, chave ou créditos da OpenAI.

Teste real pelo worker do Compasso em banco separado, com imagem artificial de uma aula de Python: resumo e sugestões em português, resposta estruturada válida, registro de análise e exclusão da imagem após sucesso. Tempo observado: 44,1 segundos, incluindo carregamento inicial. Não foi usada webcam nem captura pessoal. Um único teste não estabelece qualidade ou latência em outros computadores.

## Selecionar no Compasso

Antes de iniciar uma sessão, abra Preparar o bloco → Como interpretar as capturas? → Ollama · modelo visual no PC. Modelo: gemma3:4b. Autorize capturas apenas quando desejar. Para análise manual, selecione imagens no Relatório, confirme o processamento na aba IA Preditiva e clique Analisar capturas selecionadas. A configuração visual ainda precisa ser selecionada: a automação da interface foi interrompida antes desse clique. Nenhuma captura pessoal foi ativada durante a instalação.

O processamento é local. Manter Ollama disponível; não é preciso manter a janela de conversa dele aberta. Se não responder, abra Ollama no menu Iniciar. O serviço padrão é acessível somente no próprio computador, porta 11434. A análise de imagens é uma revisão de contexto, não um diagnóstico ou previsão clínica.

## Em outro PC

1. Instalar Ollama do site oficial: https://ollama.com/download/windows
2. No PowerShell: `ollama pull gemma3:4b`
3. Selecionar o modo Ollama no Compasso, como descrito acima.

O modelo ocupa aproximadamente 3,4 GB além do aplicativo Ollama. O modelo e o instalador não estão embutidos no ZIP do Compasso nem no Git. Após download, a análise local não exige cobrança por chamada ou assinatura de ChatGPT. Velocidade depende de hardware e disponibilidade de memória. Fontes oficiais: https://docs.ollama.com/windows e https://ollama.com/library/gemma3:4b .
