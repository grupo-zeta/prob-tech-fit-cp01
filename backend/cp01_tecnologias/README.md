# CP-01: ProtÃ³tipos de Tecnologias Educacionais

Este diretÃ³rio contÃ©m os cÃ³digos-fonte dos protÃ³tipos de demonstraÃ§Ã£o para a entrega **CP-01 (Prob-Tech Fit)**, resolvendo dois dos problemas levantados pelo grupo.

## Estrutura

- `tema1_prompt_evaluator/app.py`: Interface em Streamlit demonstrando um RAG Fact-Checker baseado no artigo MiniCheck (2024), focado em detectar alucinaÃ§Ãµes de LLMs e treinar Letramento Digital CrÃ­tico, baseando-se em projetos de Letramento CrÃ­tico com IA.
- `tema2_evasao/predicao_oulad.py`: Script Python com modelo preditivo (Random Forest) utilizando dados simulados do OULAD para prever a EvasÃ£o Silenciosa (Learning Analytics).

## Como Executar

Estes protÃ³tipos utilizam Python e exigem as bibliotecas correspondentes. Recomendamos rodar em um ambiente virtual (`venv`).

### 1. LaboratÃ³rio de EvidÃªncias (MiniCheck)
No terminal, a partir da raiz do repositÃ³rio:
```sh
pip install streamlit nltk accelerate
pip install "minicheck @ git+https://github.com/Liyan06/MiniCheck.git@main"
streamlit run backend/cp01_tecnologias/tema1_prompt_evaluator/app.py
```
O navegador serÃ¡ aberto automaticamente na porta `8501`.

### 2. PrediÃ§Ã£o de EvasÃ£o (OULAD)
No terminal, a partir da raiz do repositÃ³rio:
```sh
pip install pandas scikit-learn numpy
python backend/cp01_tecnologias/tema2_evasao/predicao_oulad.py
```
O script exibirÃ¡ no terminal o relatÃ³rio de classificaÃ§Ã£o do algoritmo.



