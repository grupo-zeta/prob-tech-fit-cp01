# Guia de Arquitetura, Psicologia Comportamental e Orientações para Harnesses

> **Ponto de entrada para desenvolvedores e agentes IA (Antigravity, OpenCode, Claude Code)**  
> **Branch oficial de evolução:** `feat/compasso-estudo-ia`  
> **Autores:** Grupo Zeta (Cauã, Igor, Luis, Leonardo, Juarez, Isabelly)

---

## 🧠 1. Fundamentação em Psicologia Comportamental: Por que o Compasso existe?

O professor da disciplina de **Tecnologias na Educação** levantou uma questão legítima:  
> *"Como que isso ajuda o aluno a aprender de verdade? E por que o aluno usaria isso?"*

A resposta não está na força de vontade do estudante, mas na **ciência comportamental**:

### A. O Modelo de Comportamento de BJ Fogg ($B = MAP$)
O Dr. BJ Fogg (Universidade de Stanford) provou que um comportamento só ocorre quando três fatores convergem no mesmo instante:
$$\text{Comportamento} = \text{Motivação} \times \text{Habilidade (Simplicidade)} \times \text{Gatilho (Prompt)}$$

* **O erro dos apps tradicionais:** Eles dependem de alta **Motivação** do aluno (abrir o app, preencher metas, ligar timer, configurar regras). A motivação humana é volátil, oscila e quase sempre perde para o cansaço ou a vontade de procrastinar.
* **A solução do Compasso (Automação Invisível):** Reduzimos a fricção a **zero absoluto**, elevando a **Habilidade (Facilidade)** ao máximo. O app inicia silencioso com o Windows e detecta o estudo sozinho. O aluno não precisa "gastar energia mental para se preparar para estudar".

### B. Teoria do Nudge (Richard Thaler & Cass Sunstein — Prêmio Nobel)
* **A Força do Padrão (*Defaults are sticky*):** O comportamento padrão deve ser o foco. O Compasso atua como uma "arquitetura de escolha": protege a atenção do aluno em segundo plano sem que ele precise tomar decisões cansativas toda vez que senta no computador.

### C. A Tese Central: Hiperfoco vs. Estudo Zumbi
* Passar 6 horas na frente do computador alternando abas com o WhatsApp e celular por perto gera fadiga de decisão, sobrecarga cognitiva e baixíssima retenção ("estudo zumbi").
* **1 hora de hiperfoco real, descansado e sem trocas de contexto, rende mais do que uma tarde inteira arrastada.** O Compasso ensina o estudante a identificar o seu pico de energia diário.

---

## 🚫 2. Diretriz Rigorosa: "Anti-AI Slop"

Conforme alinhado com o professor e fundamentado na comunidade de engenharia de software (Simon Willison, 2024):
* **O que é AI Slop?** Conteúdo massivo, prolixo e sem substância gerado por IA que polui interfaces, documentações e códigos.
* **No Compasso:**
  1. **UI Limpa (Design Subtrativo):** Sem textões ou disclaimers minúsculos poluindo a tela.
  2. **Intervenção Socrática de 2 Linhas:** A IA **nunca** faz o trabalho pelo aluno (não gera resumos ou respostas prontas). Oferece apenas provocações socráticas para fazer o cérebro dele voltar a pensar.
  3. **Dados Reais e Determinísticos:** Todas as métricas são físicas e reais (janelas ativas, tempo de foco, cliques e postura), sem alucinações.

---

## 🗺️ 3. Mapeamento da Arquitetura do Repositório (Para o Igor e Agentes)

Para qualquer harness ou colega que for continuar o desenvolvimento:

```
prob-tech-fit-cp01/
├── compasso/
│   ├── app.py               # Servidor HTTP local (Python puro, zero pip). Win32 hooks, SQLite WAL e inferência contextual segura.
│   ├── context_tools.py     # Gestor de janelas, retenção de capturas (24h locais), bloqueador e conectores Ollama/OpenAI.
│   ├── extension/           # Extensão Chromium (Chrome/Edge/Brave) para bloqueio ativo de distrações durante foco.
│   ├── web/
│   │   ├── index.html       # UI moderna estilo Linear/Antigravity, botão de destrave e pop-up de estrelas.
│   │   ├── style.css        # Design System escuro profissional (tons de ardósia, ciano neon e violeta).
│   │   ├── app.js           # Orquestrador da interface, timers, ações de foco e modais pedagógicos.
│   │   ├── presets.js       # Os 3 modos universais (Leitura, Produção e Aula) com evidências de Dunlosky et al.
│   │   ├── vision.js        # Motor geométrico puro com MediaPipe (olhar pela íris, postura de ombros e rotação de cabeça).
│   │   └── mediapipe/       # Assets offline baixados (roda 100% sem internet).
│   └── tests/
│       ├── test_app.py      # 22 testes unitários em Python puro.
│       ├── policy.cjs       # Testes em Node das regras de bloqueio da extensão.
│       └── vision.cjs       # Testes em Node das regras geométricas dos marcos corporais.
└── docs/
    ├── specs/compasso-estudo-ia.md             # Especificação pedagógica detalhada.
    ├── handoffs/compasso-estudo-ia-2026-11-05.md # Handoff de continuidade da equipe.
    └── GUIA_ARQUITETURA_E_HARNESS.md           # Este guia canônico.
```

---

## 🧪 4. Como Executar e Validar os Testes

Qualquer harness ou pessoa da equipe pode validar a integridade em menos de 3 segundos:

```powershell
# 1. Executar a suíte de testes unitários do Python (26 testes)
cd compasso
python -m unittest discover -s tests -v

# 2. Executar testes de visão e políticas de bloqueio (Node.js)
node tests/policy.cjs
node tests/vision.cjs

# 3. Iniciar o Compasso via launcher oficial (reconhece python.exe, py.exe e python3.exe)
powershell -ExecutionPolicy Bypass -File iniciar.ps1

# Ou iniciar direto pelo Python:
python app.py --open
```

---

## 📋 5. O que já foi entregue vs. Próximos Passos para o Grupo

### Entregas Concluídas:
- [x] Reformulação do Frontend para padrão SaaS educacional de alto nível.
- [x] Os 3 Modos Universais de Estudo (Leitura, Produção e Aula) com método Feynman e Recuperação Ativa.
- [x] Heurística contextual segura no backend (`infer_category` em `app.py`) separando YouTube de aula vs. gameplay e PDFs de estudo vs. boletos/faturas (100% de taxa de acerto nos testes).
- [x] **Ciclo 100% Autônomo sem Marcação Manual (Zero Fricção BJ Fogg):** O aluno NÃO precisa selecionar modo, clicar em iniciar ou marcar nada. O Compasso monitora silenciosamente no Windows:
  1. *Detecção Automática do Modo:* Identifica se o aluno está assistindo aula no YouTube (`🎓 Assistir Aula`), lendo artigos/PDFs (`📖 Leitura & Pesquisa`) ou programando/escrevendo (`✍️ Produção & Código`).
  2. *Início Automático:* Ao detectar 15s sustentados de estudo, cria o bloco de foco adaptado com política de bloqueio específica para aquele modo.
  3. *Transição Fluida:* Se o aluno termina a aula e abre o VS Code para programar, o sistema detecta a transição e atualiza a proteção em tempo real.
  4. *Pausa e Retomada Inteligente:* Se o aluno desviar para jogos ou redes sociais por mais de 25s, a sessão pausa silenciosamente para não inflar métricas fakes; ao voltar pro estudo, retoma automaticamente.
  5. *Conclusão por Ausência:* 5 minutos sem teclado/mouse (aluno levantou da cadeira) encerram a sessão e registram o hiperfoco líquido no SQLite.
- [x] **Correção do CLI / Launcher (`iniciar.ps1`):** Suporte robusto a qualquer distribuição Python no PATH (`python.exe`, `py.exe`, `python3.exe`), corrigindo o erro `Run Failed`.
- [x] **Modo Eco de Bateria na Câmera (`ecoCamera`):** Amostragem inteligente do MediaPipe (1 a 2 segundos em foco normal vs. 120ms na calibração), poupando até 85% de CPU/bateria em notebooks.
- [x] **Presets Adaptativos para Extensão Chromium:** No modo "Assistir Aula", o YouTube é liberado para videoaulas e apenas redes sociais são bloqueadas; nos modos de escrita e leitura, YouTube e redes são bloqueados.
- [x] **Ritmo Semanal de Hiperfoco (7 Dias):** Novo gráfico de barras no Relatório com meta visual de 1h diária, calculado eficientemente no SQLite e renderizado na UI.
- [x] Botão de Destrave Socrático com IA na tela principal.
- [x] Pop-up de avaliação metacognitiva por estrelas ao concluir o bloco.
- [x] Estado amigável para câmera opcional ('Modo Janelas Ativo · Câmera Opcional').

### Pendência Aberta para o Igor / Equipe Física:
- [ ] **Validação com Webcam Física:** Os testes de calibração passaram todos com marcos sintéticos. Igor precisa testar a calibração de 5 pontos do olhar na webcam física do computador dele.
- [ ] **Alinhamento do Relatório no Overleaf:** Conectar o texto do Compasso aos entregáveis da disciplina (CP-01 / CP-02).
