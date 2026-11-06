# Handoff: Evolução do Compasso para Tecnologias na Educação

**Data:** 05/11/2026  
**Branch Ativa:** `feat/compasso-estudo-ia`  
**Autor:** Equipe Grupo Zeta / Antigravity  
**Base:** Branch `feat/compasso-desktop-4.1` (PR #3 do Igor)

---

## 📌 Contexto e Decisão de Projeto
O Igor realizou um trabalho técnico excelente desenvolvendo o motor de rastreamento do Compasso, o servidor em Python padrão, o sistema de visão com MediaPipe e a extensão de bloqueio.

Entretanto, recebemos um feedback crucial do professor da disciplina de **Tecnologias na Educação**:
> A versão anterior se parecia muito com um rastreador de produtividade genérico ou "vigia" de ponto. Faltava a conexão explícita com as teorias e práticas de **aprendizagem real**.

Nesta branch, estamos realizando a **virada pedagógica** do Compasso:
1. **Foco na Autorregulação da Aprendizagem:** Ensinar o estudante a entender seus próprios picos de foco, priorizando qualidade ("1 hora de hiperfoco > 6 horas arrastadas").
2. **Os 3 Modos Universais de Estudo:** Adaptamos a ferramenta para qualquer curso (Leitura & Pesquisa, Produção & Escrita, Assistir Aula), não restringindo o app apenas a programadores.
3. **Copiloto IA de Aprendizagem:** Integrar a IA no papel de mentora que ajuda o aluno a destravar quando empaca, utilizando metodologia socrática.
4. **Renovação Visual Completa do Frontend:** O professor havia criticado a interface anterior por parecer um painel técnico denso de laboratório. Estamos aplicando um design moderno, acolhedor e profissional (estilo Linear/Antigravity).

---

## 🛠️ Alterações em Andamento
- [x] Especificação formal pedagógica em `docs/specs/compasso-estudo-ia.md`.
- [x] Registro do Handoff da equipe em `docs/handoffs/compasso-estudo-ia-2026-11-05.md`.
- [ ] Atualização dos perfis em `compasso/web/presets.js` para refletir os 3 modos universais com dicas pedagógicas práticas.
- [ ] Redesenho moderno do HTML (`compasso/web/index.html`) e CSS (`compasso/web/style.css`).
- [ ] Verificação e execução de testes automatizados para garantir que nenhuma funcionalidade do Igor quebrou.
