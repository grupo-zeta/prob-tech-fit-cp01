# CP-01: Protótipos de Tecnologias Educacionais

Este diretório contém os códigos-fonte dos protótipos de demonstração para a entrega **CP-01 (Prob-Tech Fit)**, resolvendo dois dos problemas levantados pelo grupo.

## Estrutura

- `tema1_tutor/app.py`: Interface em Streamlit demonstrando um Tutor Socrático que atua contra o "Atalho Cognitivo", baseando-se em projetos de Letramento Crítico com IA.
- `tema2_evasao/predicao_oulad.py`: Script Python com modelo preditivo (Random Forest) utilizando dados simulados do OULAD para prever a Evasão Silenciosa (Learning Analytics).

## Como Executar

Estes protótipos utilizam Python e exigem as bibliotecas correspondentes. Recomendamos rodar em um ambiente virtual (`venv`).

### 1. Tutor Socrático
No terminal, a partir da raiz do repositório:
```sh
pip install streamlit
streamlit run backend/cp01_tecnologias/tema1_tutor/app.py
```
O navegador será aberto automaticamente na porta `8501`.

### 2. Predição de Evasão (OULAD)
No terminal, a partir da raiz do repositório:
```sh
pip install pandas scikit-learn numpy
python backend/cp01_tecnologias/tema2_evasao/predicao_oulad.py
```
O script exibirá no terminal o relatório de classificação do algoritmo.
