# Especificação Compasso 4.1

Estado: escopo solicitado e autorizado pelo autor em conversa; aprovação da equipe pendente no pull request. Não representa aprovação do professor.

## Objetivo
Entregar aplicativo Windows de acompanhamento pessoal de estudo/trabalho preservando o HUD roxo/ciano, três abas e marca C orbital laranja.

## Escopo solicitado
Seis sinais: olhar, direção da cabeça, pose corporal, malha facial, teclado/mouse e janela ativa. Setas distintas amarelo/vermelho; registros e relatórios locais. Projetos prontos com referências, criação própria, duração personalizada e modo contínuo. Câmera no início do foco e seletor opcional no login do Windows. Capturas e análise de imagens com consentimento separado; OpenAI e Ollama opcionais. Bloqueio de páginas por extensão durante a sessão. Distribuição pública sem dados ou credenciais do autor e portátil sem instalação de Python.

## Critérios de aceitação
- Modo padrão funciona sem ChatGPT, chave ou modelo generativo.
- Nenhuma captura ou análise remota é ativada apenas pela instalação.
- Pausa/conclusão/desconexão liberam o bloqueio do navegador.
- Ausência de leitura não é substituída por medição inventada.
- Tempo contínuo atravessa dias e relatórios separam amostras por data.
- Credenciais, histórico, capturas e pesos não entram no Git.
- Revisão humana antes de integrar à main; trabalhos anteriores preservados.

## Fora do escopo
Diagnóstico de ansiedade/emoção por biometria, decisões educacionais automatizadas, bloqueio de aplicativos nativos e garantia clínica de atenção/produtividade.

Implementação e evidências: `compasso/README.md` e `compasso/VALIDACAO.md`. Limites dos testes e instalação por usuário estão documentados.
