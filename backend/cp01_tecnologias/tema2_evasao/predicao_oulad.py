"""
Predição de Evasão (Dropout) usando o dataset OULAD
Adaptado do repositório: reinhardjvv/elen4025-oulad-group03
Algoritmo Moderno: XGBoost/RandomForest
"""
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score

print("="*60)
print("📚 LEARNING ANALYTICS: OULAD DROPOUT PREDICTION")
print("="*60)
print("Simulando extração de dados do Open University Learning Analytics Dataset (OULAD)...")

# Como o OULAD original tem centenas de megabytes (vários arquivos CSV), 
# criamos um subconjunto representativo das features de engajamento do 'studentVle.csv' e 'studentInfo.csv'
# para demonstração imediata no vídeo.

np.random.seed(42)
n_samples = 1000

data = {
    'id_estudante': range(1, n_samples + 1),
    'cliques_materiais': np.random.poisson(lam=50, size=n_samples),
    'dias_ativos_ava': np.random.randint(5, 100, size=n_samples),
    'score_avaliacoes': np.random.normal(loc=65, scale=15, size=n_samples).clip(0, 100),
    'atraso_entregas_dias': np.random.exponential(scale=5, size=n_samples).astype(int),
}
df = pd.DataFrame(data)

# Lógica do projeto original: Menos cliques e mais atrasos = Evasão (Withdrawn)
prob_evasao = (
    (df['cliques_materiais'] < 30).astype(int) * 0.4 +
    (df['dias_ativos_ava'] < 20).astype(int) * 0.3 +
    (df['atraso_entregas_dias'] > 10).astype(int) * 0.3
)
df['target_evasao'] = (np.random.rand(n_samples) < prob_evasao).astype(int)

print(f"\n[OK] Dataset carregado: {n_samples} alunos.")
print("Features utilizadas: Cliques no AVA, Dias Ativos, Score Avaliações, Atrasos.")

# Preparando o modelo
X = df.drop(columns=['id_estudante', 'target_evasao'])
y = df['target_evasao']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("\n🚀 Treinando modelo (RandomForestClassifier - Algoritmo de Árvores de Decisão)...")
model = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
model.fit(X_train, y_train)

# Avaliação
y_pred = model.predict(X_test)
acc = accuracy_score(y_test, y_pred)

print(f"\n✅ Acurácia do Modelo: {acc*100:.2f}%")
print("\nRelatório de Classificação (Precision / Recall / F1-Score):")
print(classification_report(y_test, y_pred, target_names=["Retido (Continua)", "Evasão (Dropout)"]))

print("\n🔎 TESTE PRÁTICO (Early Warning System):")
aluno_risco = pd.DataFrame({
    'cliques_materiais': [15],
    'dias_ativos_ava': [10],
    'score_avaliacoes': [40],
    'atraso_entregas_dias': [12]
})

probabilidade = model.predict_proba(aluno_risco)[0][1] * 100
print(f"Aluno Teste -> Cliques: 15, Dias Ativos: 10, Atraso: 12 dias.")
print(f"⚠️ Risco de Evasão Calculado pela IA: {probabilidade:.1f}%")
if probabilidade > 50:
    print("-> AÇÃO: Disparar notificação para coordenação pedagógica (Intervenção Precoce).")
