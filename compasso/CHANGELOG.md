# Histórico de alterações

## 4.1.1 — 28/10/2026

- Calibração com um clique inicial, intervalo de fixação, amostras espaçadas e avanço automático dos cinco alvos.
- Ampliação da tela quando permitida; erros identificam o ponto e preservam os demais.
- Mensagens distinguem rosto/íris ausentes, olhos pouco visíveis, leituras inconsistentes e movimento da cabeça.
- Separação mínima dos alvos considera o ruído observado, com piso absoluto; leitura inconsistente continua recusada. A abertura ocular aceita proporções menores, mantendo olhos fechados sem leitura.
- Testes com câmera e landmarks sintéticos aprovados; confirmação com webcam física pendente.

## 4.1.0 — 28/10/2026

- Capturas opcionais por sessão, consentimento separado para análise, retenção limitada e exclusão após processamento.
- Provedores opcionais Ollama e OpenAI; funcionamento local padrão sem conta externa.
- Extensão de bloqueio de páginas com listas por sessão e liberação ao pausar, concluir ou desconectar.
- Marca C com órbitas laranja, setas independentes de olhar e cabeça e controles simplificados.
- Perfis de projeto com referências e durações sugeridas; tempo personalizado até 1440 minutos e modo contínuo.
- Câmera vinculada ao início/retomada, seleção opcional ao iniciar com Windows e relatórios por dia em sessões que atravessam a meia-noite.
- Build Windows portátil com Python e assets incluídos; fonte pública sem credenciais, dados pessoais ou pesos de modelos.

## 3.1.0 — 28/10/2026

Completados os sinais mostrados no terceiro print da aula de 16/10/2026, preservando o HUD roxo/ciano e as três abas.

- Olhar pelas íris, calibrado em cinco pontos, separado da direção da cabeça; zonas centro/esquerda/direita/acima/abaixo e ausência de leitura quando a geometria não é confiável. Capturas insuficientes, instáveis e inconsistentes são recusadas.
- Cabeça em três eixos; esqueleto de 33 pontos, ombros/quadris/tronco e ângulos de cotovelos/joelhos visíveis. Postura funciona mesmo sem rosto e não classifica partes ocultas como alinhadas.
- Mouse com movimento, distância acumulada em pixels e posição amostrada, além de cliques e rolagem. O teclado continua armazenando somente contagens.
- Janela ativa por título e ID, com separação de contextos no mesmo aplicativo. Categorias de janela têm prioridade sobre o padrão do aplicativo.
- Relatório, linha do tempo, PDF, CSV e backup incluem os novos sinais; CSV exporta as amostras detalhadas.
- Migração aditiva do SQLite com cópia consistente automática de bancos anteriores. Restauração de backups 3.0 e 3.1, sem inventar dados ausentes.
- Ajuste da linha do tempo para 360 px, sem mudar as cores ou a organização principal.

## 3.0.0 — 28/10/2026

Reconstrução inicial a partir das imagens do Compasso HUD v2.1: foco, projetos, monitoramento por aplicativo, câmera local, relatórios, SQLite, bandeja e inicialização opcional.
