"""
Socratic Tutor - Adaptação do repositório 'nealdoran/socratic-tutor'
Modificado para demonstração acadêmica (CP-01/Zeta).
Integra RAG básico simulado e prompt-guardrails para evitar o "Atalho Cognitivo".
"""
import streamlit as st
import time
import random

st.set_page_config(page_title="Tutor Socrático de IA", page_icon="🎓")

st.title("🎓 Tutor Socrático (Letramento Crítico)")
st.markdown("*Inspirado no projeto open-source socratic-tutor. Objetivo: Bloquear atalhos cognitivos.*")

if "messages" not in st.session_state:
    st.session_state.messages = [
        {"role": "assistant", "content": "Olá! Sou seu tutor de IA. Qual conceito você está estudando hoje?"}
    ]

# Lista de respostas genéricas socráticas para manter a ilusão da conversa
respostas_genericas = [
    "Interessante! E como você conectaria essa ideia com a realidade do dia a dia?",
    "Excelente ponto! Mas pense por um instante: existem exceções para essa regra que você mencionou?",
    "Compreendo sua visão. Se tivéssemos que analisar isso pelo ponto de vista oposto, quais seriam os argumentos?",
    "Muito bom. Para aprofundarmos, qual você acha que é a causa raiz desse problema?",
    "Faz sentido. Mas será que a tecnologia por si só resolve isso, ou o comportamento humano é o maior fator aí?"
]

for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

if prompt := st.chat_input("Digite sua dúvida aqui..."):
    # Adiciona a mensagem do aluno
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # Lógica de Guardrail (Atalho Cognitivo) baseada na adaptação do repositório
    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        
        # Simulando tempo de processamento RAG
        time.sleep(1.5)
        
        prompt_lower = prompt.lower()
        if any(palavra in prompt_lower for palavra in ["me dê a resposta", "faça para mim", "resuma", "escreva", "pronto", "pronta"]):
            resposta = (
                "⚠️ **[GUARDRAIL ATIVADO]**\n\n"
                "Eu percebi que você está pedindo a resposta final ou um texto pronto. Como um Tutor Socrático, "
                "meu objetivo é desenvolver o seu **letramento crítico** e não atuar como um atalho cognitivo.\n\n"
                "Em vez de te dar a resposta, vamos construir juntos: **Qual é a primeira coisa que vem à sua mente sobre esse tema?**"
            )
        else:
            # Sorteia uma resposta filosófica diferente para não repetir igual um papagaio
            resposta = random.choice(respostas_genericas)
            
        message_placeholder.markdown(resposta)
        st.session_state.messages.append({"role": "assistant", "content": resposta})
