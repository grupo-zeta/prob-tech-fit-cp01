import streamlit as st
import time
import re

st.set_page_config(page_title="SmartPrompt Educator", layout="wide", page_icon="🧠")

st.title("🧠 SmartPrompt Educator: Filtro Cognitivo")
st.markdown("**Tecnologia Educacional para Mitigação de Atalhos Cognitivos e Avaliação de Letramento Digital**")
st.markdown("*Em vez de avaliar a resposta da IA, esta tecnologia avalia a PERGUNTA do estudante, forçando o desenvolvimento do Letramento Crítico antes de acionar a Inteligência Generativa.*")

st.divider()

st.subheader("👨‍🎓 Terminal do Estudante")
prompt_aluno = st.text_area("Digite o seu comando (prompt) para a Inteligência Artificial:", height=150,
                            value="Escreva um resumo completo sobre a Revolução Francesa para eu entregar no meu trabalho de amanhã.")

if st.button("🚀 Processar Prompt (Análise Cognitiva)"):
    with st.spinner("Analisando estrutura sintática, intenção cognitiva e nível de abstração do prompt..."):
        time.sleep(1.5)
        
        # Algoritmo heurístico de avaliação de letramento crítico
        prompt_lower = prompt_aluno.lower()
        
        # Penalidades (Atalhos)
        atalhos = ["escreva", "resumo completo", "faça", "resolva", "para eu entregar", "pronto", "me dê a resposta"]
        # Bônus (Pensamento Crítico)
        criticos = ["como", "por que", "quais os impactos", "diferença", "explique", "me ajude a entender", "relação", "pontos principais para"]
        
        penalidade_score = sum(20 for p in atalhos if p in prompt_lower)
        bonus_score = sum(25 for c in criticos if c in prompt_lower)
        
        score_base = 50
        score_final = max(0, min(100, score_base - penalidade_score + bonus_score))
        
        st.subheader("📊 Relatório de Letramento Digital")
        
        # Progress bar
        st.progress(score_final / 100.0)
        
        col1, col2 = st.columns(2)
        with col1:
            st.metric("Índice de Letramento Crítico", f"{score_final}%")
            
            if score_final < 50:
                st.error("🚨 **Diagnóstico:** Atalho Cognitivo Grave.")
                st.write("O seu comando terceiriza totalmente o pensamento para a máquina. Você está agindo como um consumidor passivo de informação.")
            elif score_final < 80:
                st.warning("⚠️ **Diagnóstico:** Letramento Digital Mediano.")
                st.write("O seu comando é útil, mas ainda pode explorar melhor o raciocínio. Tente pedir para a IA te fazer pensar junto com ela.")
            else:
                st.success("✅ **Diagnóstico:** Alto Letramento Crítico.")
                st.write("Excelente! Você está utilizando a IA como uma parceira de raciocínio, mantendo a autonomia cognitiva.")
        
        with col2:
            st.markdown("### 🛠️ Intervenção Pedagógica Automática")
            if score_final < 50:
                st.markdown("**Acesso à IA Generativa: ❌ BLOQUEADO**")
                st.markdown("*Sugestão de Reescrita para liberar o acesso:*")
                st.info('"Poderia me explicar os principais fatores que levaram à Revolução Francesa, para que eu possa estruturar o meu trabalho?"')
            else:
                st.markdown("**Acesso à IA Generativa: ✅ LIBERADO**")
                st.markdown("*Enviando seu prompt para o modelo de linguagem...*")
                
