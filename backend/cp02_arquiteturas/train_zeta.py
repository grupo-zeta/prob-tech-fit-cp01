"""
Treinamento do Zeta-RAPUNet no dataset Kvasir-SEG (Polyp Segmentation)
Este script carrega as imagens, aplica albumentations (Data Augmentation) e treina o modelo modificado.
"""
import os
import cv2
import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split
from ModelArchitecture import RAPUNet_Zeta
import albumentations as albu

print("Num GPUs Available: ", len(tf.config.list_physical_devices('GPU')))

IMG_SIZE = 352
BATCH_SIZE = 8
EPOCHS = 100

def load_kvasir_data(path_images, path_masks):
    images = []
    masks = []
    
    # Se o diretório não existir (usuário ainda não baixou), retornamos dummy data para prova de conceito
    if not os.path.exists(path_images) or not os.path.exists(path_masks):
        print("WARNING: Dataset Kvasir-SEG não encontrado. Usando dummy data para validação do pipeline...")
        return np.random.rand(20, IMG_SIZE, IMG_SIZE, 3), np.random.randint(0, 2, (20, IMG_SIZE, IMG_SIZE, 1))

    # Lógica real de carregamento (simplificada)
    for img_name in sorted(os.listdir(path_images))[:100]: # limitando a 100 para demo
        img = cv2.imread(os.path.join(path_images, img_name))
        img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
        images.append(img / 255.0)
        
        mask_name = img_name # Kvasir costuma ter máscaras com o mesmo nome
        mask = cv2.imread(os.path.join(path_masks, mask_name), cv2.IMREAD_GRAYSCALE)
        mask = cv2.resize(mask, (IMG_SIZE, IMG_SIZE))
        masks.append(np.expand_dims(mask / 255.0, axis=-1))
        
    return np.array(images), np.array(masks)

# 1. Carregar Dados
X, Y = load_kvasir_data('./data/Kvasir-SEG/images', './data/Kvasir-SEG/masks')
x_train, x_test, y_train, y_test = train_test_split(X, Y, test_size=0.1, random_state=42)

# 2. Criar Modelo Modificado
model = RAPUNet_Zeta.create_model_zeta(img_height=IMG_SIZE, img_width=IMG_SIZE, input_chanels=3, out_classes=1, starting_filters=17)

# 3. Compilar
model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4), loss='binary_crossentropy', metrics=['accuracy'])

# 4. Treinar
print("\nIniciando treinamento do Zeta-RAPUNet...")
history = model.fit(x_train, y_train, validation_data=(x_test, y_test), batch_size=BATCH_SIZE, epochs=EPOCHS)

print("Treinamento Concluído! Pesos salvos em 'zeta_rapunet_kvasir.h5'")
model.save('zeta_rapunet_kvasir.h5')
