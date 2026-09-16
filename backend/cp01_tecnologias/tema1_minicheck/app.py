import streamlit as st
import nltk
import os

# --- Correção para o erro de memória/accelerate no Windows ---
os.makedirs("./offload", exist_ok=True)
import transformers
orig_from_pretrained = transformers.AutoModelForSequenceClassification.from_pretrained

@classmethod
def patched_from_pretrained(cls, *args, **kwargs):
    kwargs["offload_folder"] = "./offload"
    return orig_from_pretrained.__func__(cls, *args, **kwargs)

transformers.AutoModelForSequenceClassification.from_pretrained = patched_from_pretrained
# -----------------------------------------------------------

try:
    from minicheck.minicheck import MiniCheck
    MINICHECK_INSTALLED = True
except ImportError:
    MINICHECK_INSTALLED = False

st.set_page_config(page_title="Laboratório de Evidências (Real)", layout="wide", page_icon="🛡️")

st.title("🛡️ Laboratório de Evidências: RAG Fact-Checker (Motor Real)")
st.markdown("**Utilizando a biblioteca oficial [MiniCheck](https://github.com/Liyan06/MiniCheck) rodando inferência real localmente!**")

if not MINICHECK_INSTALLED:
    st.error("⚠️ MiniCheck não está instalado. Feche isso e instale com: pip install \"minicheck @ git+https://github.com/Liyan06/MiniCheck.git@main\"")
    st.stop()

# Baixa tokenizador de sentenças do NLTK se não tiver
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')
    nltk.download('punkt_tab')
from nltk.tokenize import sent_tokenize

@st.cache_resource
def load_minicheck_model():
    # Inicializa o modelo real (RoBERTa-large ou Flan-T5)
    # roberta-large é o mais rápido/leve para CPU
    return MiniCheck(model_name='roberta-large', cache_dir='./ckpts')

scorer = load_minicheck_model()

col1, col2 = st.columns(2)

with col1:
    st.subheader("📄 Documento Fonte (Referência Acadêmica)")
    doc_base = st.text_area("Texto fornecido pelo professor:", height=200, 
                       value="O aumento da concentração de gases de efeito estufa contribui para o aquecimento global. A revolução industrial marcou o início das altas emissões de carbono na atmosfera devido à queima de combustíveis fósseis.")

with col2:
    st.subheader("🤖 Resposta Gerada pela IA")
    ia_resposta = st.text_area("O que o aluno tentou usar como resposta:", height=200,
                           value="O aumento dos gases de efeito estufa contribui para o aquecimento global. Além disso, a revolução industrial ajudou a reduzir a temperatura média do planeta e eliminar os combustíveis fósseis.")

st.write("")
if st.button("🔎 Executar MiniCheck Real (Inferência de Redes Neurais)", type="primary"):
    with st.spinner("O modelo MiniCheck está lendo os textos e calculando a factualidade... (Pode levar alguns segundos na CPU)"):
        # Quebrar a resposta em sentenças separadas (melhor prática do MiniCheck)
        sentences = sent_tokenize(ia_resposta)
        docs = [doc_base] * len(sentences)
        
        # Executa a inferência REAL
        pred_label, raw_prob, _, _ = scorer.score(docs=docs, claims=sentences)
        
        st.subheader("📊 Resultados da Análise de Factualidade")
        
        for i, sentence in enumerate(sentences):
            label = pred_label[i]
            prob = raw_prob[i]
            
            if label == 1:
                st.success(f"✔️ **Afirmação:** *{sentence}*\n\n**Status:** Suportada (Confiança da IA: {prob*100:.1f}%)")
            else:
                st.error(f"❌ **Afirmação:** *{sentence}*\n\n**Status:** Alucinação / Contradição (Confiança da IA: {prob*100:.1f}%)")
        
        st.divider()
        st.markdown("### 🧠 Desafio de Letramento Crítico Ativado")
        st.markdown("**O que fazer agora?** Use as evidências do texto da esquerda para reescrever as afirmações em vermelho.")

