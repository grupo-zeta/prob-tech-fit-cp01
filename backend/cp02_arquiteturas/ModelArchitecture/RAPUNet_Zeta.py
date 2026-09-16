import tensorflow as tf
from keras.layers import Conv2D, UpSampling2D, multiply, Activation, Lambda
from keras.layers import add, concatenate
from keras.models import Model
from keras_cv_attention_models import caformer

# Atenção Espacial (Spatial Attention) para focar na lesão e não no fundo
def spatial_attention(input_feature):
    # Calcula Average Pooling e Max Pooling ao longo do eixo dos canais
    avg_pool = tf.reduce_mean(input_feature, axis=3, keepdims=True)
    max_pool = tf.reduce_max(input_feature, axis=3, keepdims=True)
    concat = concatenate([avg_pool, max_pool], axis=3)
    
    # Camada convolucional para aprender a máscara de atenção (Mish activation para gradientes suaves)
    attention = Conv2D(1, kernel_size=7, padding='same', activation='sigmoid')(concat)
    return multiply([input_feature, attention])

# Camada convolucional base adaptada (usando Mish em vez de ReLU para evitar dying ReLUs)
def conv_block(x, filters, kernel_size=3):
    x = Conv2D(filters, kernel_size, padding='same')(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = Activation('mish')(x)
    return x

# RAPU Modificado com Atenção
def RAPU_Zeta(input_tensor, filters):
    # Convoluções Residuais
    x1 = conv_block(input_tensor, filters)
    x2 = conv_block(x1, filters)
    
    # Conexão Residual com Spatial Attention
    att = spatial_attention(x2)
    
    # Ajuste de dimensões se necessário
    if input_tensor.shape[-1] != filters:
        input_tensor = Conv2D(filters, 1, padding='same')(input_tensor)
        
    out = add([att, input_tensor])
    return out

def create_model_zeta(img_height, img_width, input_chanels, out_classes, starting_filters):
    # Backbone MetaFormer original preservado
    backbone = caformer.CAFormerS18(input_shape=(img_height, img_width, 3), pretrained="imagenet", num_classes=0)
    layer_names = ['stack4_block3_mlp_Dense_1', 'stack3_block9_mlp_Dense_1', 'stack2_block3_mlp_Dense_1', 'stack1_block3_mlp_Dense_1']
    layers = [backbone.get_layer(x).output for x in layer_names]
    
    input_layer = backbone.input
    print('Construindo Zeta-RAPUNet com Spatial Attention...')

    # Extração inicial
    p1 = Conv2D(starting_filters * 2, 3, strides=2, padding='same')(input_layer)  
    p2 = Conv2D(starting_filters * 4, 1, padding='same')(layers[3]) 
    p3 = Conv2D(starting_filters * 8, 1, padding='same')(layers[2]) 
    p4 = Conv2D(starting_filters * 16, 1, padding='same')(layers[1]) 
    p5 = Conv2D(starting_filters * 32, 1, padding='same')(layers[0]) 
    
    # Decodificador com blocos de Atenção (Modificação Substancial)
    t0 = RAPU_Zeta(input_layer, starting_filters)
    
    l1i = Conv2D(starting_filters * 2, 2, strides=2, padding='same')(t0)    
    s1 = add([l1i, p1])     
    t1 = RAPU_Zeta(s1, starting_filters * 2)
    
    l2i = Conv2D(starting_filters * 4, 2, strides=2, padding='same')(t1)
    s2 = add([l2i, p2])
    t2 = RAPU_Zeta(s2, starting_filters * 4)
    
    l3i = Conv2D(starting_filters * 8, 2, strides=2, padding='same')(t2)
    s3 = add([l3i, p3])
    t3 = RAPU_Zeta(s3, starting_filters * 8)
   
    l4i = Conv2D(starting_filters * 16, 2, strides=2, padding='same')(t3)
    s4 = add([l4i, p4])
    t4 = RAPU_Zeta(s4, starting_filters * 16)
    
    l5i = Conv2D(starting_filters * 32, 2, strides=2, padding='same')(t4)
    s5 = add([l5i, p5]) 
    
    t5 = RAPU_Zeta(s5, starting_filters * 32)
    
    # Agregação Final simplificada com Upsampling e Concatenação Atenta
    outd = concatenate([UpSampling2D((4,4))(t5), UpSampling2D((2,2))(t4), t3], axis=-1)
    outd = conv_block(outd, 32, 1)
    
    out1 = UpSampling2D(size=(8,8), interpolation='bilinear')(outd)
    
    output = Conv2D(out_classes, (1, 1), activation='sigmoid')(out1)
    
    model = Model(inputs=input_layer, outputs=output)
    return model
