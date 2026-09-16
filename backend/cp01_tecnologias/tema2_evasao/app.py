import streamlit as st
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import time

st.set_page_config(page_title="Radar Preditivo EAD", layout="wide", page_icon="📊")

# CSS para embelezar
st.markdown("""
<style>
    .hero { background: linear-gradient(135deg, #2b5876 0%, #4e4376 100%); padding: 30px; border-radius: 10px; color: white; margin-bottom: 25px;}
    .hero h1 { color: white !important;}
    .stProgress > div > div > div > div { background-image: linear-gradient(to right, #f77062 0%, #fe5196 100%); }
</style>
""", unsafe_allow_html=True)

# Cache do modelo para ficar instantâneo na tela
@st.cache_resource
def treinar_modelo():
    np.random.seed(42)
    n_samples = 1000
    clicks = np.random.normal(500, 200, n_samples)
    dias_ativos = np.random.normal(60, 30, n_samples)
    score = np.random.normal(70, 15, n_samples)
    atrasos = np.random.exponential(5, n_samples)
    
    # Simulação da Evasão OULAD
    evasao = ((clicks < 200) & (dias_ativos < 20)) | (atrasos > 15) | (score < 40)
    evasao = evasao.astype(int)
    
    df = pd.DataFrame({'cliques': clicks, 'dias_ativos': dias_ativos, 'score': score, 'atrasos': atrasos})
    y = evasao
    
    clf = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
    clf.fit(df, y)
    return clf

model = treinar_modelo()

st.markdown("""
<div class="hero">
    <h1>📊 Radar Preditivo: Evasão no EAD</h1>
    <p>Early Warning System alimentado por Machine Learning (Random Forest) inspirado no dataset OULAD.</p>
</div>
""", unsafe_allow_html=True)

col1, col2 = st.columns([1, 1.5], gap="large")

with col1:
    st.markdown("### ⚙️ Telemetria do Estudante")
    st.caption("Ajuste os controles abaixo para simular o comportamento de um aluno no portal AVA:")
    
    c_clicks = st.slider("🖱️ Cliques Totais no AVA", 0, 1000, 150, help="Quantidade de interações com o portal")
    c_dias = st.slider("📅 Dias Ativos na Plataforma", 0, 120, 15, help="Dias logados neste semestre")
    c_score = st.slider("📝 Média das Avaliações", 0, 100, 45)
    c_atrasos = st.slider("⏳ Dias de Atraso Acumulados", 0, 30, 12, help="Entregas de trabalhos")
    
    analisar = st.button("🔍 Analisar Risco com Machine Learning", type="primary", use_container_width=True)

with col2:
    st.markdown("### 📡 Painel da Coordenação")
    
    if analisar:
        with st.spinner("Mapeando árvores de decisão..."):
            time.sleep(0.8) # pequeno delay para dar sensação de processamento
            
            # Formata os dados pro modelo
            entrada = pd.DataFrame([[c_clicks, c_dias, c_score, c_atrasos]], 
                                   columns=['cliques', 'dias_ativos', 'score', 'atrasos'])
            risco = model.predict_proba(entrada)[0][1] * 100
            
            # Painel de Resultado
            if risco >= 60:
                st.error(f"🚨 RISCO ALTO DE EVASÃO: {risco:.1f}%")
                st.markdown("**Protocolo Acionado:** Enviar alerta para o polo de apoio presencial e ligação imediata do tutor comunitário.")
                st.progress(int(risco) / 100.0)
            elif risco >= 30:
                st.warning(f"🟡 RISCO MODERADO: {risco:.1f}%")
                st.markdown("**Protocolo:** Enviar e-mail motivacional e recomendação de trilha de nivelamento.")
                st.progress(int(risco) / 100.0)
            else:
                st.success(f"✅ RISCO BAIXO (Aluno Retido): {risco:.1f}%")
                st.markdown("**Protocolo:** Engajamento saudável detectado.")
                st.progress(int(risco) / 100.0)
            
            st.divider()
            
            st.markdown("#### 🩻 Como a IA tomou essa decisão? (Feature Importance)")
            st.caption("Este gráfico mostra o peso de cada variável matemática para chegar na conclusão acima.")
            
            # Importâncias
            importances = model.feature_importances_
            features = ['Cliques no AVA', 'Dias Ativos', 'Média Avaliações', 'Atrasos']
            imp_df = pd.DataFrame({'Impacto (%)': importances * 100}, index=features).sort_values('Impacto (%)', ascending=True)
            
            st.bar_chart(imp_df, horizontal=True)
    else:
        st.info("Ajuste as métricas do aluno à esquerda e clique em Analisar para prever a evasão em tempo real.")

