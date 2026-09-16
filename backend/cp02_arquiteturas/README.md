# CP-02 — arquitetura e experimentos

## Arquivos atuais

| Arquivo | Finalidade observada no código |
| :--- | :--- |
| [ModelArchitecture/RAPUNet_Zeta.py](ModelArchitecture/RAPUNet_Zeta.py) | Construção do modelo com CAFormerS18, atenção espacial e ativação Mish |
| [train_zeta.py](train_zeta.py) | Carregamento de dados, criação do modelo e treinamento |
| [generate_plots.py](generate_plots.py) | Geração de curvas e máscaras simuladas para ilustração |
| [plot_results](plot_results/) | Imagens já versionadas |

## O que é simulação e o que precisa de validação

`generate_plots.py` gera curvas por fórmulas com ruído aleatório e máscaras geométricas. Ele não carrega o histórico de treinamento, pesos ou imagens reais do Kvasir-SEG. As figuras geradas por esse script são ilustrações; não comprovam superioridade do modelo nem métricas obtidas experimentalmente. Para atribuir procedência às imagens já versionadas, registre como cada arquivo foi produzido.

`train_zeta.py` usa dados aleatórios se as pastas do dataset não existirem. Quando elas existem, o carregamento está limitado aos primeiros 100 nomes ordenados. O script configura 100 épocas, batch de 8 e imagens de 352 × 352; calcula `binary_crossentropy` e `accuracy`, sem implementar Dice como métrica de treinamento. Importa albumentations, mas não aplica uma transformação de aumento de dados no fluxo atual.

## Ambiente e caminhos

Não há um arquivo de dependências Python com versões fixadas nesta pasta. Os imports atuais dependem de TensorFlow, Keras, keras-cv-attention-models, OpenCV, NumPy, scikit-learn, albumentations e Matplotlib. A compatibilidade entre versões ainda precisa ser validada e registrada antes de publicar uma receita reproduzível.

Os caminhos dos scripts são relativos ao diretório de execução. Execute a partir de `backend/cp02_arquiteturas/`, com o ambiente preparado e o dataset disponível em:

```text
data/Kvasir-SEG/images/
data/Kvasir-SEG/masks/
```

O comando `python train_zeta.py` inicia treinamento e grava `zeta_rapunet_kvasir.h5`. A construção do backbone solicita pesos pré-treinados ImageNet. Confira dados, compatibilidade e recursos disponíveis antes de iniciar.

O comando `python generate_plots.py` sobrescreve as duas imagens em `plot_results/`; use uma cópia de trabalho se quiser preservar os arquivos atuais. Nenhum desses comandos foi executado como parte desta revisão de documentação.

## Registro de um experimento futuro

Registre commit do código, versões das dependências, hardware, origem dos dados, divisão de treino/validação/teste, sementes, parâmetros, logs e métricas calculadas. Compare base e modificação usando o mesmo protocolo antes de concluir que houve melhoria. Identifique separadamente as evidências reais e os materiais ilustrativos.
