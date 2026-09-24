import streamlit as st
import warnings
warnings.filterwarnings("ignore")
import sys
import os
import json

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
import logging
logging.getLogger("google").setLevel(logging.ERROR)

import asyncio
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import google.generativeai as genai

# Configuração da Página
st.set_page_config(page_title="OpenTutor Zeta", layout="wide", page_icon="🚀")

# Injetando CSS Customizado para deixar lindo
st.markdown("""
<style>
    .hero-container {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 30px;
        border-radius: 15px;
        color: white;
        text-align: center;
        box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        margin-bottom: 30px;
    }
    .hero-container h1 { color: white !important; font-size: 3rem; margin-bottom: 10px;}
    .hero-container p { font-size: 1.2rem; opacity: 0.9; }
    
    /* Animação Flip Card 3D */
    .flip-card {
        background-color: transparent;
        width: 100%;
        height: 220px;
        perspective: 1000px;
        margin-bottom: 20px;
    }
    .flip-card-inner {
        position: relative;
        width: 100%;
        height: 100%;
        text-align: center;
        transition: transform 0.6s;
        transform-style: preserve-3d;
        cursor: pointer;
    }
    .flip-card:hover .flip-card-inner {
        transform: rotateY(180deg);
    }
    .flip-card-front, .flip-card-back {
        position: absolute;
        width: 100%;
        height: 100%;
        backface-visibility: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        border-radius: 15px;
        box-shadow: 0 8px 16px rgba(0,0,0,0.1);
        font-size: 1.1rem;
        font-weight: 500;
    }
    .flip-card-front {
        background-color: #ffffff;
        color: #333;
        border: 2px solid #667eea;
    }
    .flip-card-back {
        background-color: #667eea;
        color: white;
        transform: rotateY(180deg);
    }
</style>
""", unsafe_allow_html=True)

# Chave API
P1 = "AQ.Ab8RN6LnQRtUdWKaU"
P2 = "vFVdG-8gT9395qeIefbrkTi928uG1Q8cQ"
genai.configure(api_key=P1 + P2)
model = genai.GenerativeModel('gemini-3.6-flash')

# Header Bonito
st.markdown("""
<div class="hero-container">
    <h1>🚀 OpenTutor Zeta</h1>
    <p>O Futuro do Letramento Digital: Do Atalho Cognitivo à Síntese Ativa</p>
</div>
""", unsafe_allow_html=True)

col1, col2 = st.columns([1, 1.2], gap="large")

with col1:
    st.markdown("### 📚 Sua Matéria-Prima")
    texto_aluno = st.text_area(
        "Cole seu texto base aqui:", 
        height=350,
        placeholder="Cole o artigo, anotação ou texto gerado pelo ChatGPT aqui..."
    )
    gerar = st.button("✨ Criar Ambiente de Estudo Interativo", type="primary", use_container_width=True)

with col2:
    st.markdown("### 🧠 Laboratório Metacognitivo")
    
    if gerar:
        if len(texto_aluno) < 50:
            st.error("Insira um texto um pouco maior para a IA conseguir trabalhar (Mín. 50 caracteres).")
        else:
            with st.spinner("✨ Engenharia Pedagógica em andamento..."):
                try:
                    # Prompts
                    prompt_flashcards = f"Crie exatos 3 flashcards sobre o texto. Retorne APENAS um JSON válido neste formato: [{{\"pergunta\": \"sua pergunta\", \"resposta\": \"sua resposta\"}}]. Não inclua blocos de markdown ```json.\n\nTexto: {texto_aluno}"
                    prompt_socratico = f"Crie 2 perguntas reflexivas sobre o texto. Formate como uma lista markdown bonita. Não dê as respostas.\n\nTexto: {texto_aluno}"
                    prompt_pontos_cegos = f"Identifique 2 'Pontos Cegos' (coisas importantes que não estão no texto e o aluno deveria pesquisar). Formate em markdown com emojis.\n\nTexto: {texto_aluno}"
                    
                    resp_flashcards = model.generate_content(prompt_flashcards)
                    resp_socratico = model.generate_content(prompt_socratico)
                    resp_pontos_cegos = model.generate_content(prompt_pontos_cegos)
                    
                    # Limpeza do JSON
                    json_str = resp_flashcards.text.strip()
                    if json_str.startswith("```json"):
                        json_str = json_str.replace("```json", "").replace("```", "").strip()
                    elif json_str.startswith("```"):
                        json_str = json_str.replace("```", "").strip()
                        
                    flashcards = json.loads(json_str)
                    
                    # Abas Estilizadas
                    tab1, tab2, tab3 = st.tabs(["📇 Flashcards (Gire!)", "🗣️ Quiz Socrático", "🔎 Pontos Cegos"])
                    
                    with tab1:
                        st.caption("Passe o mouse (ou toque) nos cartões para revelar a resposta!")
                        for card in flashcards:
                            st.markdown(f"""
                            <div class="flip-card">
                              <div class="flip-card-inner">
                                <div class="flip-card-front">
                                  <h3>🤔 {card.get('pergunta', 'Pergunta')}</h3>
                                </div>
                                <div class="flip-card-back">
                                  <p>💡 {card.get('resposta', 'Resposta')}</p>
                                </div>
                              </div>
                            </div>
                            """, unsafe_allow_html=True)
                            
                    with tab2:
                        st.info("Responda mentalmente ou no caderno. O objetivo é forçar o raciocínio além do texto.")
                        st.markdown(resp_socratico.text)
                        
                    with tab3:
                        st.error("🚨 Limites do seu texto encontrados:")
                        st.markdown(resp_pontos_cegos.text)
                        
                except Exception as e:
                    st.error(f"Erro ao processar: {e}")
    else:
        st.info("Cole seu material à esquerda e clique no botão para transformar o texto passivo em um estudo ativo e interativo.")

