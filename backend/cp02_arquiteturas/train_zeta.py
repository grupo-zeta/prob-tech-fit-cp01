"""
Treinamento REAL do Zeta-RAPUNet no dataset Kvasir-SEG (Segmentação Médica de Pólipos)
Este script carrega as imagens, aplica albumentations (Data Augmentation), usa Dice Loss e treina o modelo modificado com CAFormerS18.
"""
import os
import cv2
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.model_selection import train_test_split
from ModelArchitecture import RAPUNet_Zeta
import albumentations as A

print("TensorFlow Version:", tf.__version__)
print("Num GPUs Available: ", len(tf.config.list_physical_devices('GPU')))

IMG_SIZE = 352
BATCH_SIZE = 4 # Batch size ajustado para no estourar VRAM com o CAFormer
EPOCHS = 10 # 10 epocas para demonstrao real

# 1. Definir Mtrica Oficial de Segmentao Mdica (Dice Coefficient)
from tensorflow.keras import backend as K

def dice_coef(y_true, y_pred, smooth=1e-5):
    y_true_f = K.flatten(y_true)
    y_pred_f = K.flatten(y_pred)
    intersection = K.sum(y_true_f * y_pred_f)
    return (2. * intersection + smooth) / (K.sum(y_true_f) + K.sum(y_pred_f) + smooth)

def dice_loss(y_true, y_pred):
    return 1.0 - dice_coef(y_true, y_pred)

# 2. Pipeline de Data Augmentation com Albumentations
transform = A.Compose([
    A.HorizontalFlip(p=0.5),
    A.VerticalFlip(p=0.5),
    A.RandomRotate90(p=0.5),
    A.ShiftScaleRotate(shift_limit=0.0625, scale_limit=0.1, rotate_limit=15, p=0.5),
])

def load_kvasir_data(path_images, path_masks, limit=400):
    images = []
    masks = []
    
    # Procura a pasta real Kvasir-SEG (pode extrair direto como Kvasir-SEG ou imagens)
    img_dir = os.path.join(path_images)
    mask_dir = os.path.join(path_masks)
    
    if not os.path.exists(img_dir) or not os.path.exists(mask_dir):
        print(f"ERRO: Diretrios no encontrados. {img_dir} ou {mask_dir}")
        exit(1)

    print(f"Carregando {limit} imagens reais do Kvasir-SEG...")
    
    # Carregamento Real (limitando a 400 para no travar mquinas fracas, mas  dataset real)
    valid_images = sorted(os.listdir(img_dir))[:limit]
    
    for i, img_name in enumerate(valid_images):
        if i % 50 == 0:
            print(f"[{i}/{limit}] Carregando e processando imagens na memoria...")
        img_path = os.path.join(img_dir, img_name)
        mask_path = os.path.join(mask_dir, img_name)
        
        if not os.path.exists(mask_path):
            continue
            
        # Imagem Original
        img = cv2.imread(img_path)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
        
        # Mscara Ground Truth
        mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
        mask = cv2.resize(mask, (IMG_SIZE, IMG_SIZE))
        
        # Aplicar Transformacoes
        augmented = transform(image=img, mask=mask)
        img_aug = augmented['image']
        mask_aug = augmented['mask']
        
        images.append(img_aug / 255.0)
        masks.append(np.expand_dims(mask_aug / 255.0, axis=-1))
        
    print("Sucesso! Imagens carregadas na memoria RAM.")
    return np.array(images, dtype=np.float32), np.array(masks, dtype=np.float32)

# O zip Kvasir-SEG descompacta pastas em 'data/Kvasir-SEG/images' e 'data/Kvasir-SEG/masks'
base_data_path = './data/Kvasir-SEG'
if not os.path.exists(base_data_path):
    base_data_path = './data'

print("Iniciando o carregamento dos dados...")
X, Y = load_kvasir_data(os.path.join(base_data_path, 'images'), os.path.join(base_data_path, 'masks'), limit=200) # baixei pra 200 pra carregar instantaneo
x_train, x_test, y_train, y_test = train_test_split(X, Y, test_size=0.15, random_state=42)

print(f"Tamanho Final - Treino: {x_train.shape}, Teste: {x_test.shape}")

# 3. Criar Modelo Modificado (CAFormerS18 + Spatial Attention + Mish)
print("\nConstruindo o cerebro da IA (Baixando pesos do CAFormer da internet, aguarde alguns segundos)...")
model = RAPUNet_Zeta.create_model_zeta(img_height=IMG_SIZE, img_width=IMG_SIZE, input_chanels=3, out_classes=1, starting_filters=17)
print("Modelo Zeta-RAPUNet construido com sucesso!")

# 4. Compilar usando a Mtrica Oficial
model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4), 
              loss=dice_loss, 
              metrics=[dice_coef, 'accuracy'])

# 5. Treinar de Verdade
print("\nIniciando treinamento real do Zeta-RAPUNet...")

# Salvar o melhor modelo
checkpoint = tf.keras.callbacks.ModelCheckpoint('zeta_rapunet_best.h5', monitor='val_dice_coef', mode='max', save_best_only=True, verbose=1)

history = model.fit(
    x_train, y_train, 
    validation_data=(x_test, y_test), 
    batch_size=BATCH_SIZE, 
    epochs=EPOCHS,
    callbacks=[checkpoint]
)

# Salvar o histrico real de mtricas
hist_df = pd.DataFrame(history.history)
os.makedirs('plot_results', exist_ok=True)
hist_df.to_csv('plot_results/real_history.csv', index=False)

print("Treinamento Concludo! Pesos salvos em 'zeta_rapunet_best.h5'")
print("Histrico real salvo em 'plot_results/real_history.csv'.")
