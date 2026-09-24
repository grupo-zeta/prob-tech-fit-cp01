# 🧠 VisuTEA: Documentação Oficial do Projeto

## 1. Visão Geral e o Problema
No ambiente escolar inclusivo, crianças com Transtorno do Espectro Autista (TEA) frequentemente enfrentam barreiras de comunicação e sobrecarga sensorial. Para o professor, é um desafio em salas cheias perceber quando um aluno está perdendo o foco (Atenção Social), entrando em sobrecarga (cobrindo os ouvidos) ou utilizando estereotipias motoras (*stimming* como o *flapping* de mãos) para se autorregular.

O **VisuTEA** nasce para ser um "copiloto passivo" do educador. É um sistema de Visão Computacional que roda diretamente no navegador do celular ou tablet do professor, fornecendo métricas visuais e em tempo real sobre o estado comportamental do aluno.

---

## 2. A Solução (Inovação de Valor)
Diferente de equipamentos caros de *Eye-Tracking* ou hardwares vestíveis (como o Google Glass), o VisuTEA democratiza o monitoramento.
* **Passivo e Não-Invasivo:** O aluno não precisa vestir nada. A câmera do tablet do professor ou do computador da sala faz a leitura a distância.
* **Privacidade Absoluta (Edge AI):** Nenhuma imagem ou vídeo sai do celular do professor. O vídeo não é gravado nem processado em nuvem. A Inteligência Artificial roda 100% no navegador (Client-Side), transformando a imagem em meras coordenadas matemáticas (pontos cegos).

---

## 3. Arquitetura e Stack Tecnológico
O projeto foi construído focando na leveza e portabilidade:
* **Backend:** `Flask` (Python) para servir a página web e criar rotas de integração, encapsulado de forma segura via Cloudflare Tunnels para acesso remoto.
* **Frontend:** `HTML5 + CSS + JavaScript` responsivo, otimizado para visualização em modo escuro (Dark Mode) em telas de celular.
* **Motor de IA (Computer Vision):** `Google MediaPipe` (FaceMesh e Pose Detection). Operando via JavaScript e WebAssembly, extrai até 468 pontos do rosto e 33 marcações corporais a 16+ FPS em hardware de celular comum.

---

## 4. Algoritmos Biomecânicos e Métricas

### A. Rastreio de Atenção (Foco Visual / Gaze)
Para substituir ferramentas caras de rastreio ocular, o VisuTEA usa uma heurística baseada na inclinação da cabeça (*Head Pose Estimation*):
* **Como funciona:** O algoritmo calcula o *Pitch* (inclinação vertical) e o *Yaw* (rotação horizontal) usando o ponto do nariz (Landmark 1 do FaceMesh) em relação às bordas do rosto.
* **Classificação:**
  1. **Atenção Social:** O aluno está olhando para frente (foco no professor/quadro).
  2. **Atenção ao Objeto:** O aluno está olhando para baixo (foco na mesa/atividade).
  3. **Desvio:** O aluno está olhando para os lados (possível distração ou evitação de contato visual).

### B. Detecção de Sobrecarga Sensorial
Ocorre quando o ambiente se torna hostil (muito barulho ou luz) para o aluno neurodivergente.
* **Como funciona:** O modelo MediaPipe Pose cruza as coordenadas dos punhos (Landmarks 15 e 16) com a posição das orelhas (Landmarks 7 e 8) e do topo da cabeça.
* **Regra Matemática:** Se a distância euclidiana entre as mãos e as orelhas for menor que um limiar pré-estabelecido por mais de 1,5 segundos, o HUD aciona um alerta vermelho ("Sobrecarga").

### C. Estereotipias Motoras (Stimming)
Comportamentos repetitivos que o aluno usa para aliviar tensão ou demonstrar excitação.
* **Hand Flapping:** O algoritmo mapeia a variação no eixo Y das mãos (aceleração para cima e para baixo). Se a oscilação rítmica bater entre 2.0 Hz e 6.0 Hz, o sistema registra o *flapping*.
* **Balanço de Tronco (Rocking):** O algoritmo analisa a coordenada central do peito/ombros. Se houver um movimento pendular anteroposterior (para frente e para trás) constante entre 0.8 Hz e 2.2 Hz, o alerta de *rocking* é acionado.

---

## 5. Aplicação Futura e Expansão
O VisuTEA não gera diagnósticos clínicos (não substitui um médico). Ele atua como um sistema de suporte à decisão educacional. 
Os próximos passos do projeto incluem a exportação de relatórios em `.csv` (percentual de tempo focado vs. desvio), permitindo que a escola tenha dados quantitativos para apresentar aos pais ou coordenadores pedagógicos ao avaliar a eficácia da didática aplicada ao aluno.
