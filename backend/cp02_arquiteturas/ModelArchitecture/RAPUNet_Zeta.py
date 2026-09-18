import tensorflow as tf
from tensorflow.keras.layers import Conv2D, UpSampling2D, multiply, Activation, Lambda
from tensorflow.keras.layers import concatenate
from tensorflow.keras.models import Model

def spatial_attention(input_feature):
    avg_pool = Lambda(lambda x: tf.reduce_mean(x, axis=3, keepdims=True))(input_feature)
    max_pool = Lambda(lambda x: tf.reduce_max(x, axis=3, keepdims=True))(input_feature)
    concat = concatenate([avg_pool, max_pool], axis=3)
    attention = Conv2D(1, kernel_size=7, padding='same', activation='sigmoid')(concat)
    return multiply([input_feature, attention])

def conv_block(x, filters):
    x = Conv2D(filters, 3, padding='same')(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = Activation('mish')(x)
    
    x = Conv2D(filters, 3, padding='same')(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = Activation('mish')(x)
    return x

def RAPU_DecoderBlock(inputs, skip_features, filters):
    # Upsampling
    x = UpSampling2D((2,2))(inputs)
    
    # Concatenar com features puladas do encoder (Skip Connection)
    x = concatenate([x, skip_features], axis=-1)
    
    # Bloco convolucional com Mish
    x = conv_block(x, filters)
    
    # Adicionar nossa Atenção Espacial (Substancial mod)
    x = spatial_attention(x)
    return x

def create_model_zeta(img_height, img_width, input_chanels, out_classes, starting_filters=16):
    print("Construindo Zeta-RAPUNet com ResNet50V2 + Spatial Attention + Mish...")
    
    input_layer = tf.keras.layers.Input(shape=(img_height, img_width, 3))
    
    # Encoder: ResNet50V2
    encoder = tf.keras.applications.ResNet50V2(input_tensor=input_layer, include_top=False, weights='imagenet')
    
    # Features do Encoder (Skips)
    # Entrada: 352x352
    s1 = encoder.get_layer('conv1_conv').output         # 176x176
    s2 = encoder.get_layer('conv2_block3_1_relu').output  # 88x88
    s3 = encoder.get_layer('conv3_block4_1_relu').output  # 44x44
    s4 = encoder.get_layer('conv4_block6_1_relu').output  # 22x22
    
    # Bridge (Fundo do U-Net)
    b1 = encoder.get_layer('post_relu').output            # 11x11
    b1 = conv_block(b1, starting_filters * 16)
    
    # Decoder
    d1 = RAPU_DecoderBlock(b1, s4, starting_filters * 8)  # 22x22
    d2 = RAPU_DecoderBlock(d1, s3, starting_filters * 4)  # 44x44
    d3 = RAPU_DecoderBlock(d2, s2, starting_filters * 2)  # 88x88
    d4 = RAPU_DecoderBlock(d3, s1, starting_filters)      # 176x176
    
    # Camada final para voltar ao tamanho original (352x352)
    d5 = UpSampling2D((2,2))(d4)
    d5 = conv_block(d5, starting_filters)
    
    output = Conv2D(out_classes, (1, 1), activation='sigmoid')(d5)
    
    model = Model(inputs=input_layer, outputs=output)
    return model
