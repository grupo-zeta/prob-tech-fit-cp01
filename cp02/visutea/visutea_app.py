import streamlit as st
import cv2
import numpy as np
try:
    import mediapipe as mp
    mp_face_mesh = mp.solutions.face_mesh
    mp_drawing = mp.solutions.drawing_utils
except Exception as e:
    mp = None

st.set_page_config(page_title="VisuTEA - Educacao Inclusiva", page_icon="👁️", layout="wide")

st.title("👁️ VisuTEA")
st.markdown("Sistema de análise de **Atenção Social** por visão computacional para apoio a atividades educacionais inclusivas (TEA).")
st.info("💡 **Arquitetura Estável:** Captura nativa multiplataforma (PC/Mobile) com processamento Frame-a-Frame (Sem bloqueio de firewall/WebRTC).")

col1, col2 = st.columns([1.5, 1])

with col1:
    st.markdown("### 📸 Simulação de Interação")
    st.write("Posicione o rosto (reto, para baixo ou de lado) e capture a interação.")
    img_buffer = st.camera_input("Capturar Comportamento (Frame)")

with col2:
    st.markdown("### 📊 Relatório Clínico do Frame")
    if img_buffer is not None:
        # Converter imagem do Streamlit para OpenCV
        bytes_data = img_buffer.getvalue()
        cv2_img = cv2.imdecode(np.frombuffer(bytes_data, np.uint8), cv2.IMREAD_COLOR)
        
        estado_atual = "fora"
        detalhe = "Rosto nao detectado ou fora de enquadramento."
        color = (255, 0, 0) # Azul (Fora)
        
        # Processamento Principal (MediaPipe)
        if mp is not None:
            with mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1, min_detection_confidence=0.5) as face_mesh:
                rgb_frame = cv2.cvtColor(cv2_img, cv2.COLOR_BGR2RGB)
                results = face_mesh.process(rgb_frame)
                
                if results.multi_face_landmarks:
                    for face_landmarks in results.multi_face_landmarks:
                        nose_x = face_landmarks.landmark[1].x
                        nose_y = face_landmarks.landmark[1].y
                        
                        # Heuristica de Head Pose (Pitch/Yaw)
                        if nose_x < 0.35 or nose_x > 0.65:
                            estado_atual = "fora"
                            detalhe = "Desvio de atencao (Olhando para o lado)."
                            color = (255, 0, 0)
                        elif nose_y > 0.55:
                            estado_atual = "objeto"
                            detalhe = "Foco na atividade da mesa/objeto."
                            color = (0, 255, 255) # Amarelo
                        else:
                            estado_atual = "social"
                            detalhe = "Engajamento visual (Atenção ao Professor)."
                            color = (0, 255, 0) # Verde
                            
                        # Desenhar Malha
                        mp_drawing.draw_landmarks(
                            image=cv2_img,
                            landmark_list=face_landmarks,
                            connections=mp_face_mesh.FACEMESH_TESSELATION,
                            landmark_drawing_spec=None,
                            connection_drawing_spec=mp.solutions.drawing_styles.get_default_face_mesh_tesselation_style())
        
        else:
            # Sistema Anti-Falha (Caso o Windows bloqueie o MediaPipe)
            gray = cv2.cvtColor(cv2_img, cv2.COLOR_BGR2GRAY)
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            faces = face_cascade.detectMultiScale(gray, 1.3, 5)
            
            if len(faces) > 0:
                (x, y, w, h) = faces[0]
                cv2.rectangle(cv2_img, (x, y), (x+w, y+h), (0, 255, 0), 2)
                estado_atual = "social"
                detalhe = "Rosto frontal detectado (Atenção Social). Motor: OpenCV Haar."
                color = (0, 255, 0)
                
        # Mostrar resultado final
        cv2.putText(cv2_img, f"STATUS: {estado_atual.upper()}", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 3)
        st.image(cv2.cvtColor(cv2_img, cv2.COLOR_BGR2RGB), caption="Analise de IA Concluida", use_container_width=True)
        
        if estado_atual == "social":
            st.success(f"✅ **Status:** Atenção Social\n\n{detalhe}")
        elif estado_atual == "objeto":
            st.warning(f"⚠️ **Status:** Atenção ao Objeto\n\n{detalhe}")
        else:
            st.error(f"🚨 **Status:** Fora da Tarefa\n\n{detalhe}")
            
    else:
        st.write("Aguardando captura da interacao...")
