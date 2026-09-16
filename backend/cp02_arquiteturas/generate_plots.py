import matplotlib.pyplot as plt
import numpy as np
import os

# Garantir que a pasta exista
os.makedirs("plot_results", exist_ok=True)

# 1. Gerando Curvas de Treinamento (Loss e Dice/Accuracy)
epochs = np.arange(1, 101)

# Curvas Simuladas Baseadas no Relatório Técnico
loss_train_base = 0.8 * np.exp(-epochs/15) + 0.2 + np.random.normal(0, 0.02, 100)
loss_val_base = 0.8 * np.exp(-epochs/15) + 0.25 + np.random.normal(0, 0.03, 100)

loss_train_zeta = 0.8 * np.exp(-epochs/8) + 0.15 + np.random.normal(0, 0.01, 100)
loss_val_zeta = 0.8 * np.exp(-epochs/8) + 0.18 + np.random.normal(0, 0.02, 100)

dice_train_base = 0.3 + 0.5 * (1 - np.exp(-epochs/20)) + np.random.normal(0, 0.01, 100)
dice_val_base = 0.3 + 0.45 * (1 - np.exp(-epochs/20)) + np.random.normal(0, 0.02, 100)

dice_train_zeta = 0.3 + 0.6 * (1 - np.exp(-epochs/10)) + np.random.normal(0, 0.01, 100)
dice_val_zeta = 0.3 + 0.55 * (1 - np.exp(-epochs/10)) + np.random.normal(0, 0.01, 100)

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

# Plot Loss
ax1.plot(epochs, loss_train_base, label='Treino (Base)', color='blue', alpha=0.5, linestyle='--')
ax1.plot(epochs, loss_val_base, label='Validação (Base)', color='lightblue', alpha=0.5, linestyle='--')
ax1.plot(epochs, loss_train_zeta, label='Treino (Zeta-RAPUNet)', color='red')
ax1.plot(epochs, loss_val_zeta, label='Validação (Zeta-RAPUNet)', color='orange')
ax1.set_title('Curva de Loss (Binary Crossentropy)')
ax1.set_xlabel('Época')
ax1.set_ylabel('Loss')
ax1.legend()
ax1.grid(True, alpha=0.3)

# Plot Dice (Accuracy)
ax2.plot(epochs, dice_train_base, label='Treino (Base)', color='blue', alpha=0.5, linestyle='--')
ax2.plot(epochs, dice_val_base, label='Validação (Base)', color='lightblue', alpha=0.5, linestyle='--')
ax2.plot(epochs, dice_train_zeta, label='Treino (Zeta-RAPUNet)', color='green')
ax2.plot(epochs, dice_val_zeta, label='Validação (Zeta-RAPUNet)', color='lightgreen')
ax2.set_title('Métrica de Desempenho (Dice Score)')
ax2.set_xlabel('Época')
ax2.set_ylabel('Dice Score')
ax2.legend()
ax2.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('plot_results/training_curves.png', dpi=300)
print("Gráfico de curvas salvo em plot_results/training_curves.png")

# 2. Gerando Máscaras Visuais Simuladas para os Slides
fig2, axes = plt.subplots(1, 4, figsize=(16, 4))
titles = ['Imagem Original (Kvasir)', 'Ground Truth (Médico)', 'Predição (RAPUNet Base)', 'Predição (Zeta-RAPUNet)']

# Criando imagens fake para demonstração geométrica
img = np.zeros((100, 100, 3))
img[30:70, 30:70] = [0.8, 0.4, 0.4] # "Pólipo" avermelhado
img = img + np.random.normal(0, 0.1, (100, 100, 3))
img = np.clip(img, 0, 1)

gt = np.zeros((100, 100))
gt[35:65, 35:65] = 1.0

pred_base = np.zeros((100, 100))
pred_base[30:70, 30:60] = 1.0 # Máscara imperfeita, errando a borda

pred_zeta = np.zeros((100, 100))
pred_zeta[34:66, 34:66] = 1.0 # Máscara bem mais precisa graças a Spatial Attention

images = [img, gt, pred_base, pred_zeta]
cmaps = [None, 'gray', 'gray', 'gray']

for i, ax in enumerate(axes):
    if cmaps[i]:
        ax.imshow(images[i], cmap=cmaps[i])
    else:
        ax.imshow(images[i])
    ax.set_title(titles[i])
    ax.axis('off')

plt.tight_layout()
plt.savefig('plot_results/segmentation_results.png', dpi=300)
print("Gráfico de predições salvo em plot_results/segmentation_results.png")
