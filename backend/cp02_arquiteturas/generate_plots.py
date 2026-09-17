"""
Gerador de Grficos REAIS e Inferncia REAL para o Zeta-RAPUNet
L o histrico verdadeiro salvo pelo train_zeta.py e faz inferncia em imagens de teste.
"""
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import os
import cv2
import tensorflow as tf
from ModelArchitecture import RAPUNet_Zeta

# 1. Carregar e Plotar Curvas Reais de Treinamento
hist_path = 'plot_results/real_history.csv'
if not os.path.exists(hist_path):
    print("ERRO: O histrico real ainda no existe. Rode o 'python train_zeta.py' primeiro!")
    exit(1)

df = pd.read_csv(hist_path)
epochs = np.arange(1, len(df) + 1)

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

# Plot Loss
ax1.plot(epochs, df['loss'], label='Treino (Zeta)', color='red')
ax1.plot(epochs, df['val_loss'], label='Validao (Zeta)', color='orange')
ax1.set_title('Curva de Loss (Dice Loss)')
ax1.set_xlabel('poca')
ax1.set_ylabel('Loss')
ax1.legend()
ax1.grid(True, alpha=0.3)

# Plot Dice
ax2.plot(epochs, df['dice_coef'], label='Treino (Zeta)', color='green')
ax2.plot(epochs, df['val_dice_coef'], label='Validao (Zeta)', color='lightgreen')
ax2.set_title('Mtrica de Desempenho (Dice Score)')
ax2.set_xlabel('poca')
ax2.set_ylabel('Dice Score')
ax2.legend()
ax2.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('plot_results/training_curves.png', dpi=300)
print("Grfico de curvas REAL salvo em plot_results/training_curves.png")

# 2. Inferncia Real em imagens do Kvasir-SEG
print("\nIniciando Inferncia Real...")
model_path = 'zeta_rapunet_best.h5'

if not os.path.exists(model_path):
    print("ERRO: Modelo no encontrado. Rode o 'train_zeta.py' primeiro.")
    exit(1)

# Precisamos passar o custom_object pro Keras carregar a funo de loss/metric customizada
from tensorflow.keras import backend as K
def dice_coef(y_true, y_pred, smooth=1e-5):
    y_true_f = K.flatten(y_true)
    y_pred_f = K.flatten(y_pred)
    intersection = K.sum(y_true_f * y_pred_f)
    return (2. * intersection + smooth) / (K.sum(y_true_f) + K.sum(y_pred_f) + smooth)

def dice_loss(y_true, y_pred):
    return 1.0 - dice_coef(y_true, y_pred)

model = tf.keras.models.load_model(model_path, custom_objects={'dice_loss': dice_loss, 'dice_coef': dice_coef, 'Activation': tf.keras.layers.Activation})

# Pega a primeira imagem de teste (exemplo da pasta)
base_data_path = './data/Kvasir-SEG/images'
base_mask_path = './data/Kvasir-SEG/masks'
if not os.path.exists(base_data_path):
    base_data_path = './data/images'
    base_mask_path = './data/masks'

test_img_name = os.listdir(base_data_path)[-1] # Pega uma imagem do final (possivelmente do conjunto de teste)

img = cv2.imread(os.path.join(base_data_path, test_img_name))
img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
img_resized = cv2.resize(img, (352, 352))
input_tensor = np.expand_dims(img_resized / 255.0, axis=0)

gt_mask = cv2.imread(os.path.join(base_mask_path, test_img_name), cv2.IMREAD_GRAYSCALE)
gt_mask = cv2.resize(gt_mask, (352, 352))

# Inferncia da Rede Zeta
pred_mask = model.predict(input_tensor)[0, :, :, 0]

fig2, axes = plt.subplots(1, 3, figsize=(12, 4))
titles = ['Imagem Original', 'Ground Truth (Mdico)', 'Predio (Zeta-RAPUNet - Inferncia Real)']

images = [img_resized, gt_mask, pred_mask > 0.5]
cmaps = [None, 'gray', 'gray']

for i, ax in enumerate(axes):
    if cmaps[i]:
        ax.imshow(images[i], cmap=cmaps[i])
    else:
        ax.imshow(images[i])
    ax.set_title(titles[i])
    ax.axis('off')

plt.tight_layout()
plt.savefig('plot_results/segmentation_results.png', dpi=300)
print("Inferncia REAL concluda! Grfico salvo em plot_results/segmentation_results.png")

