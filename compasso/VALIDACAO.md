# Validação — Compasso 4.1 — 28/10/2026

## Verificações concluídas

- 21 testes Python aprovados: persistência, migração, backup, sinais, consentimento, retenção, adaptadores opcionais de IA, sessão contínua e divisão de relatório na meia-noite.
- Testes JavaScript de visão aprovados com landmarks simulados: cinco zonas oculares, cabeça independente, articulações, visibilidade e rejeição de calibração inválida.
- Testes das políticas de bloqueio aprovados: domínios, subdomínios, listas de permissão/restrição e acesso local.
- Interface no Edge com câmera sintética: início automático da câmera, calibração, sessão/pausa/conclusão, relatório, PDF/CSV e ausência de erros JavaScript.
- Interface de capturas: opções desligadas por padrão, consentimento por sessão, pausa, seleção, autorização explícita e exclusão; envio externo interceptado no teste.
- Perfis e pop-up: referências, duração personalizada, contínuo e desativação do seletor inicial verificados no navegador.
- Bloqueio real testado em perfil isolado do Edge: redirecionamento, cobertura de página já aberta, preservação do texto digitado e liberação ao pausar/desconectar.
- Captura nativa GDI conferida em janela de teste controlada; nenhuma tela pessoal enviada à IA.
- MediaPipe processou imagem pública estática com 478 pontos faciais e 33 corporais. Isso verifica execução, não precisão humana.

## Limites e etapas em cada PC

- Webcam física, precisão individual do gaze, ergonomia e acessibilidade exigem conferência humana e calibração. As setas indicam estimativas geométricas.
- Continuidade foi testada por simulação temporal, sem executar 24 horas corridas. Inicialização foi testada por fluxo equivalente, sem reiniciar o Windows.
- A extensão precisa ser instalada e autorizada em cada navegador. Não bloqueia aplicativos nativos do Windows.
- Ollama 0.40.12 com gemma3:4b instalado neste PC: teste real por worker do Compasso com imagem sintética aprovado em 44,1 s; resumo em português persistido e imagem apagada. Não houve envio à OpenAI. Outros PCs precisam instalar o modelo e medir desempenho; veja OLLAMA.md.
- A chave privada do autor autenticou na OpenAI, mas a inferência sintética foi recusada por falta de cota/créditos. Não há teste bem-sucedido de análise real da API; mocks cobrem o fluxo. Chave e créditos não acompanham o pacote.
- Não há validação clínica, detector de ansiedade, diagnóstico de atenção ou prova de benefício educacional. Durações dos perfis são sugestões, não garantias de aprendizado.
- A aprovação do professor e a revisão da equipe continuam externas à validação técnica.

## Correção de calibração 4.1.1

Fluxo automático no navegador aprovado com câmera sintética; amostras antes da fixação recusadas, cinco alvos coletados sem novos cliques e setas independentes preservadas. Testes geométricos cobrem pequenas amplitudes estáveis, rejeição por ruído e indicação do ponto inválido. O erro relatado na webcam física ainda precisa ser retestado pelo usuário; não foi possível ler sua mensagem exata pela automação do navegador.
