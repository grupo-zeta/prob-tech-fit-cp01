import streamlit as st
import time

st.set_page_config(page_title="Laboratório de Evidências", layout="wide", page_icon="🛡️")

st.title("🛡️ Laboratório de Evidências: RAG Fact-Checker")
st.markdown("**Baseado no artigo [MiniCheck: Efficient Fact-Checking of LLMs (EMNLP 2024)](https://arxiv.org/abs/2404.10774)**")
st.markdown("*Combate ao atalho cognitivo através do Letramento Digital Crítico: Transformando a IA em objeto de investigação, e não em um oráculo.*")

st.divider()

col1, col2 = st.columns(2)

with col1:
    st.subheader("📄 Documento de Referência (Ground Truth)")
    st.markdown("*(Material confiável base da disciplina)*")
    doc_base = st.text_area("Texto:", height=200, 
                       value="A Revolução Industrial foi um período de transição para novos processos de manufatura, que ocorreu de 1760 a algum momento entre 1820 e 1840. Esse período marcou a substituição do trabalho artesanal por máquinas, o uso da energia a vapor e o desenvolvimento do sistema fabril. A Revolução Industrial começou na Grã-Bretanha e a maioria das inovações tecnológicas foram de origem britânica.")

with col2:
    st.subheader("🤖 Resposta Gerada por IA")
    st.markdown("*(Texto que o aluno copiou do ChatGPT para entregar)*")
    ia_resposta = st.text_area("Resposta Sintética:", height=200,
                           value="A Revolução Industrial ocorreu entre 1760 e 1840, marcando a transição do trabalho manual para as máquinas. Ela começou simultaneamente na Grã-Bretanha e nos Estados Unidos, movida principalmente pela energia nuclear e a vapor, o que causou o fim imediato da pobreza na Europa.")

st.write("")
if st.button("🔎 Iniciar Verificação Cruzada de Factualidade (Modelo MiniCheck)", type="primary"):
    with st.spinner("Analisando inferência textual natural e extraindo embeddings..."):
        time.sleep(2.5) # Simula o processamento do modelo de linguagem
        
        st.subheader("📊 Resultados da Análise de Factualidade")
        
        st.success("✔️ **Afirmação 1:** *A Revolução Industrial ocorreu entre 1760 e 1840, marcando a transição do trabalho manual para as máquinas.* \n\n**Status:** Suportada pelo documento base.")
        
        st.error("❌ **Afirmação 2:** *Ela começou simultaneamente na Grã-Bretanha e nos Estados Unidos...* \n\n**Status:** Contradição! O documento base afirma que começou apenas na Grã-Bretanha.")
        
        st.error("❌ **Afirmação 3:** *...movida principalmente pela energia nuclear e a vapor...* \n\n**Status:** Alucinação Detectada! A tecnologia nuclear não existia na época do texto base.")
        
        st.warning("⚠️ **Afirmação 4:** *...o que causou o fim imediato da pobreza na Europa.* \n\n**Status:** Informação não suportada (Falta de evidência no texto).")

        st.divider()
        st.markdown("### 🧠 Desafio de Letramento Crítico Ativado")
        st.markdown("**Aluno:** O sistema detectou que você tentou usar a IA como um atalho cognitivo, e ela gerou desinformação. Sua tarefa agora é investigar o texto base e corrigir manualmente as afirmações marcadas em vermelho.")
