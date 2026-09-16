import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

print("="*50)
print("SISTEMA DE PREDIÇÃO DE EVASÃO SILENCIOSA (EAD/NOTURNO)")
print("="*50)

# 1. Carregando os dados de engajamento do AVA (ex: Moodle UFRPE)
df = pd.read_csv('dataset_ead.csv')
print("[1] Dados de engajamento carregados (Logs do Moodle).")

# Transformando dados categóricos em números (Diurno=0, Noturno=1, EAD=2)
df['turno'] = df['turno'].map({'Diurno': 0, 'Noturno': 1, 'EAD': 2})

X = df[['dias_sem_logar', 'entregas_atrasadas', 'interacoes_forum', 'turno']]
y = df['evadiu']

# 2. Treinando a Inteligência Artificial (Random Forest)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
modelo = RandomForestClassifier(n_estimators=100, random_state=42)
modelo.fit(X_train, y_train)
print("[2] Modelo preditivo treinado com sucesso!")

# 3. Simulando um aluno real do Noturno/EAD
print("\n--- Analisando Aluno Alvo (João, Turno Noturno) ---")
# João: 14 dias sem logar, 2 entregas atrasadas, 0 interações no fórum, turno Noturno (1)
aluno_joao = [[14, 2, 0, 1]] 
predicao = modelo.predict(aluno_joao)
probabilidade = modelo.predict_proba(aluno_joao)[0][1] * 100

if predicao[0] == 1:
    print(f"⚠️ ALERTA VERMELHO: O aluno tem {probabilidade:.1f}% de chance de EVASÃO SILENCIOSA.")
    print("Ação recomendada: Disparar e-mail de resgate ou contatar via WhatsApp imediatamente.")
else:
    print("✅ Aluno com engajamento normal. Baixo risco de evasão.")
