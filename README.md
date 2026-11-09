# Grupo Zeta - Tecnologias na Educação

## Compasso — Piloto Automático de Foco & Espelho Metacognitivo

> **Branch Oficial de Evolução:** `feat/compasso-estudo-ia`  
> **Fundamentação Pedagógica:** Modelo de Comportamento BJ Fogg ($B=MAP$), Nudge e Autorregulação da Aprendizagem (Zimmerman).  
> **Guia Completo da Arquitetura e Harness:** Veja [`docs/GUIA_ARQUITETURA_E_HARNESS.md`](docs/GUIA_ARQUITETURA_E_HARNESS.md).

O Compasso é um companheiro autônomo e privacy-first para o estudante. Em vez de exigir que o aluno configure timers e preencha formulários antes de estudar (fricção cognitiva que causa abandono), o Compasso opera com **Zero Fricção**:
1. **Dedução Automática de Modo:** Detecta se o aluno está assistindo videoaula no YouTube (`🎓 Assistir Aula`), lendo artigos/PDFs (`📖 Leitura & Pesquisa`) ou programando/escrevendo (`✍️ Produção & Código`).
2. **Proteção Adaptativa:** Libera o YouTube durante videoaulas e bloqueia redes sociais; ao abrir o VS Code ou editor de texto, passa a proteger contra o YouTube automaticamente.
3. **Pausa e Retomada Inteligente:** Pausa o foco ao detectar distrações prolongadas (jogos/redes) para não inflar métricas fakes, e retoma sozinho ao voltar ao estudo.
4. **Ritmo Semanal:** Mostra na UI o histórico de 7 dias com meta visual de 1h diária de hiperfoco (*1h de hiperfoco real > 6h de estudo zumbi*).
5. **Anti-AI Slop:** 100% dos dados em SQLite local, sem telemetria na nuvem, com copiloto socrático mínimo (2 linhas) quando o aluno empacar.

Validação: **26 testes unitários em Python** (`python -m unittest discover -s tests -v`) e testes de visão/política em Node 100% aprovados.


**Disciplina:** Tecnologias na Educação (Licenciatura em Computação)
**Entrega:** CP-01 (Prob-Tech Fit)

## 👥 Integrantes e Papéis

| Nome | Papel (Metodologia Agile) |
| :--- | :--- |
| **Cauã** | Scrum Master |
| **Luis** | Hipster (Design / UI / UX) |
| **Leonardo** | Hacker (Desenvolvedor) |
| **Igor** | Hacker (Desenvolvedor) |
| **Juarez** | Hacker (Desenvolvedor) |
| **Isabelly** | Scrum Master + Hustler (Negócios / Foco no Produto) |

---

## 🎯 Resumo da Entrega: Prob-Tech Fit
Esta entrega (CP-01) foca em mapear dores reais do contexto escolar e alinhá-las a soluções tecnológicas viáveis. Mapeamos **4 problemas educacionais emergentes** e propusemos **4 tecnologias associadas** para a mitigação de cada um, garantindo que o encaixe problema-tecnologia (Prob-Tech Fit) seja sólido e justificado pedagogicamente.

---

## 🔗 Links e Artefatos
* 📋 **[Quadro Trello (Gestão das Sprints)](https://trello.com/b/0OXwZaKW)**
* 📄 **[Relatório Técnico (Overleaf)](https://www.overleaf.com/project/6a922427f1ca2007335f685f)** — requer permissão no projeto.
* 🖥️ **[Deck de Apresentação (Canva)](https://canva.link/xdmufknua10pk0b)** — arquivos exportados em [slides](slides/).

## 📂 Estrutura do Repositório
* `/docs`: Relatórios em PDF e cópias estáticas geradas a partir do Overleaf.
* `/assets`: GIFs, vídeos e capturas de tela demonstrando as tecnologias propostas.
* `/slides`: Arquivos editáveis (e PDFs) da apresentação montada pelo Hipster.

## Guia de navegação

| Local | Conteúdo atual | Orientações |
| :--- | :--- | :--- |
| [docs](docs/) | Trecho LaTeX da fundamentação dos problemas da CP-01 | [Relatório e atualização das cópias](docs/README.md) |
| [frontend](frontend/) | Aplicação React + Vite, ainda com a tela inicial do template | Comandos abaixo; [README original do template](frontend/README.md) |
| [backend](backend/) | API Express com `GET /api/health` | [Execução da API](backend/README.md) |
| [backend/cp02_arquiteturas](backend/cp02_arquiteturas/) | Arquitetura, treinamento e ilustrações da CP-02 | [Escopo e limitações dos experimentos](backend/cp02_arquiteturas/README.md) |
| [assets](assets/) | Pasta reservada para demonstrações e capturas | [Organização das evidências](assets/README.md) |
| [slides](slides/) | Pasta reservada para a apresentação | [Organização dos slides](slides/README.md) |

A CP-01 e os materiais da CP-02 estão no mesmo repositório. Os caminhos atuais são mantidos para preservar as referências existentes.

## Executar o protótipo web

Pré-requisitos: Git, Node.js e npm compatíveis com os pacotes dos respectivos `package-lock.json`. Cada aplicação tem suas próprias dependências; não há `package.json` na raiz.

Em um terminal, a partir da raiz do repositório:

```sh
cd frontend
npm ci
npm run dev
```

Abra o endereço que o Vite informar no terminal. Em outro terminal, também a partir da raiz:

```sh
cd backend
npm ci
node index.js
```

A API usa a porta `3001` por padrão. Abra `http://localhost:3001/api/health` para verificar a resposta. A tela atual do frontend não consulta essa API.

Verificações disponíveis no frontend, executadas dentro de `frontend/`:

```sh
npm run lint
npm run build
```

O backend ainda não possui testes automatizados implementados: seu comando `npm test` é o placeholder inicial. Os scripts Python da CP-02 possuem dependências próprias e não são instalados por `npm ci`.

## Colaborar e acompanhar pendências

Consulte [CONTRIBUTING.md](CONTRIBUTING.md) antes de enviar alterações. `github_setup.ps1` é o script de criação inicial do repositório; quem clonou o projeto existente não precisa executá-lo.

Pendências de organização para a equipe:

- Exportar para `docs/` a versão do relatório que será entregue, registrando sua data.
- Adicionar as evidências e os slides nas pastas correspondentes.
- Registrar versões do ambiente e resultados medidos antes de apresentar experimentos da CP-02 como validação do modelo.

