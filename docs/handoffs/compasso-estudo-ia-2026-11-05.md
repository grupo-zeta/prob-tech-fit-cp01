# Handoff: Evolução do Compasso para Tecnologias na Educação

**Data:** 08/11/2026 (Atualizado)  
**Branch Ativa:** `feat/compasso-estudo-ia`  
**Autor:** Equipe Grupo Zeta / Antigravity  
**Base:** Branch `feat/compasso-desktop-4.1` (PR #3 do Igor)

---

## 📌 Contexto e Decisão de Projeto
O Igor realizou um trabalho técnico excelente desenvolvendo o motor de rastreamento do Compasso, o servidor em Python padrão, o sistema de visão com MediaPipe e a extensão de bloqueio.

Entretanto, dois feedbacks cruciais do professor da disciplina de **Tecnologias na Educação** guiam esta branch:
1. **Falta de conexão com a aprendizagem:** Parecia um vigia corporativo. Convertemos para um **Espelho de Autorregulação da Aprendizagem** (1 hora de hiperfoco > 6 horas arrastadas).
2. **Diretriz Rígida: "NÃO ENTRAR EM AI SLOP"** (veja seção detalhada abaixo).

---

## 🚫 Diretriz Anti-AI Slop (Pesquisa & Aplicação Prática)

O termo **"AI Slop"** (cunhado e popularizado na comunidade de engenharia de software por Simon Willison em maio de 2024 como o análogo de *spam*) define o lixo digital, prolixo e de baixo valor gerado em massa por LLMs sem edição ou intenção humana deliberada.

O professor pontuou que o AI Slop não é apenas código ruim, mas sim:
1. **Slop de Documentação:** Textos inflados artificialmente com parágrafos genéricos, tabelas redundantes e jargões acadêmicos vazios para "parecer profundo". Destrói a confiança do leitor/avaliador e soterra o sinal real.
2. **Slop de Interface (UI):** Interfaces entupidas de textos minúsculos, disclaimers em cada botão, formulários poluídos e explicações longas que ninguém lê.
3. **Slop Funcional:** Enfiar chatbots que cospem respostas prontas mastigadas, tirando a agência cognitiva do estudante.

### 🛡️ Como o Compasso combate o AI Slop:
- **Linguagem Humana, Direta e Concisa:** Nada de parágrafos inflados. Frases curtas e objetivas.
- **UI Limpa (Design Subtrativo):** Menos texto na tela, mais foco visual. Se um botão é autoexplicativo, remove-se a legenda.
- **Intervenção Socrática de 2 Linhas:** A IA nunca faz o trabalho pelo aluno. Dá apenas a fagulha inicial (ex.: *"Qual é a primeira pequena parte dessa tarefa que você consegue rascunhar agora?"*).
- **Dados Reais e Determinísticos:** Rastreamento com medidas reais de janelas e tempo, sem métricas alucinadas.

---

## ✅ Alterações Concluídas
- [x] Especificação formal pedagógica em `docs/specs/compasso-estudo-ia.md`.
- [x] Atualização dos perfis em `compasso/web/presets.js` para refletir os 3 modos universais com dicas pedagógicas práticas (Feynman e Recuperação Ativa).
- [x] Redesenho moderno do HTML (`compasso/web/index.html`) e CSS (`compasso/web/style.css`) padrão Linear/Antigravity.
- [x] Heurística contextual segura no backend (`app.py`): YouTube de aula vs gameplay, PDFs de artigos vs boletos, sem falsos positivos.
- [x] Botão e modal rápido "Empacou no conteúdo? Destravar com Copiloto IA" com 3 opções de 1 clique.
- [x] Pop-up de celebração e micro-avaliação (1 a 5 estrelas) ao concluir o bloco.
- [x] Estado amigável para câmera opcional ("Modo Janelas Ativo · Câmera Opcional").
- [x] 22 testes unitários em Python e testes de visão/política em Node 100% aprovados.
- [x] Branch sincronizada no GitHub: `https://github.com/grupo-zeta/prob-tech-fit-cp01/tree/feat/compasso-estudo-ia`.
