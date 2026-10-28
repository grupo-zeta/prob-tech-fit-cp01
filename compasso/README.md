# Compasso

Aplicativo aberto para Windows que acompanha sessões de estudo e trabalho, registra sinais locais e ajuda o próprio usuário a revisar seu ritmo. Interface em português, com foco, relatório e análise de contexto. O código do aplicativo usa licença MIT; as dependências mantêm suas licenças.

**Não exige ChatGPT, Codex ou assinatura de IA.** O modo padrão funciona localmente, sem modelo generativo, chave de API ou conta externa. A interpretação das capturas é opcional: Ollama no próprio PC ou OpenAI com chave e créditos próprios.

## Abrir

### Versão portátil para Windows

Extraia todo o pacote Windows e execute **Compasso.exe**. Mantenha a pasta `_internal` junto do executável. Python já está incluído; não é necessário instalá-lo. Os dados ficam em `%LOCALAPPDATA%\Compasso` e não fazem parte da distribuição. O executável é um build local sem assinatura digital comercial.

### Código-fonte

Instale Python 3.11 ou posterior. Execute `Iniciar-Compasso.vbs`, `Iniciar-Compasso.cmd` ou `python app.py --open`. Não há pacotes pip obrigatórios para rodar o aplicativo. No clone do GitHub, `python preparar_assets.py` baixa uma vez os assets públicos de versões fixas e confere seus hashes. O iniciador faz essa preparação automaticamente. Os pacotes Windows prontos já incluem esses arquivos. Depois da preparação, o núcleo não depende de CDN durante o uso. O iniciador também reconhece um runtime Python local, se já disponível no computador.

O HUD abre no Edge; sem Edge, usa o navegador padrão. O servidor atende somente no próprio PC. Para iniciar apenas o servidor: `python app.py --no-open --no-tray`.

## Começar uma sessão

1. Selecione um dos perfis prontos ou crie seu projeto em **+ Proj.**
2. Escolha um bloco, **Personalizar** para informar de 1 a 1440 minutos, ou **Contínuo / 24h** para acompanhar sem limite de sessão.
3. A opção **Ativar câmera ao iniciar ou retomar** vem ligada. Ao clicar em **Iniciar foco**, o navegador solicita a permissão necessária; se a câmera for recusada ou estiver ausente, o acompanhamento de janelas e entradas continua.
4. Quando o rosto e as íris forem encontrados, siga a calibração de cinco alvos: centro, esquerda, direita, acima e abaixo. Clique em **Começar calibração** uma vez. A tela é ampliada quando o navegador permite; acompanhe somente o alvo amarelo. Os pontos avançam automaticamente depois de um intervalo de fixação e uma coleta espaçada. Se um ponto falhar, o aplicativo explica o motivo e permite repetir somente ele.
5. A seta **amarela**, na região dos olhos, mostra a direção ocular estimada. A seta **vermelha**, no nariz, mostra a direção da cabeça. Sem calibração válida, o programa não inventa uma direção ocular.
6. Pause ou conclua. O tempo, as categorias e os registros ficam salvos no PC. O relatório permite consultar cada dia, exportar PDF/CSV e gerar backup JSON.

Os perfis incluem programação, revisão por recuperação ativa, leitura com autoexplicação, exercícios, escrita e acompanhamento contínuo. Cada perfil mostra seu método e uma referência. **Os minutos são sugestões de organização, não um prazo cientificamente garantido para aprender algo.** Consulte `REFERENCIAS.md`.

## Inicialização do Windows e acompanhamento contínuo

Marque **Iniciar junto com o Windows** para registrar somente o iniciador do Compasso na conta atual do Windows. No próximo login, o serviço abre e apresenta a seleção de perfil, duração e câmera. A opção **Mostrar seleção de foco ao iniciar o Windows** permite desativar ou reativar esse pop-up. **Escolher depois** deixa o programa disponível pela bandeja, sem iniciar uma sessão.

O modo contínuo mantém o acompanhamento durante o uso do PC, inclusive atravessando a meia-noite. Cada relatório considera as amostras daquele dia. Pausas e períodos de suspensão do computador não entram no tempo ativo. Isso não é uma recomendação para estudar ou trabalhar por 24 horas. A câmera depende do navegador aberto e da permissão de vídeo; fechar o HUD ou usar a opção de minimizar para a bandeja libera a câmera. O monitor nativo pode continuar na sessão enquanto o serviço estiver em execução.

Na bandeja, dê duplo clique para reabrir e use **Encerrar Compasso** para parar o serviço. Para impedir a abertura no próximo login, desmarque a inicialização no aplicativo ou nas configurações de inicialização do Windows.

## Proteger sites durante o foco

A pasta `extension/` contém a extensão para Brave, Edge e Chrome. No aplicativo, abra **Preparar o bloco → Como instalar**. No gerenciador de extensões do navegador, ative o modo de desenvolvedor, escolha **Carregar sem compactação / Load unpacked** e selecione essa pasta. O navegador apresenta as permissões; a extensão precisa de acesso aos sites para aplicar as regras. Instale-a no navegador e perfil que você realmente utiliza.

Escolha uma lista de sites bloqueados ou uma lista de sites permitidos. O início protegido exige uma extensão conectada. As regras valem somente para uma sessão ativa, são retiradas ao pausar/concluir e são removidas quando a extensão detecta que o aplicativo desconectou. A sincronização normalmente leva cerca de 5 segundos; se o navegador suspender o serviço da extensão, pode levar até 30 segundos.

Uma página já aberta recebe uma proteção visual, preservando seu conteúdo e rascunhos. Mídia HTML em reprodução nessa página é pausada; não é retomada automaticamente. Novas navegações restritas são redirecionadas à página do Compasso. O recurso não é um controle parental ou barreira contra adulteração: não bloqueia aplicativos nativos, outros perfis, navegadores sem a extensão, todo tráfego em segundo plano ou áudio produzido por outros mecanismos. Não tenta fechar programas ou descartar documentos.

## Capturas e privacidade

Capturas de tela vêm desligadas e precisam ser autorizadas **para cada sessão**. A região visível da janela em primeiro plano é capturada no intervalo escolhido. **Capturar em 5s** dá tempo para trocar de janela. Capturas param com a pausa e podem ser desligadas pelo botão **Parar capturas e envios**. Um envio já iniciado pode terminar.

Há limite de 48 capturas por sessão e até 8 análises automáticas. As imagens brutas ficam localmente por aproximadamente 24 horas, podem ser apagadas pelo usuário e são apagadas após uma análise bem-sucedida. Os resumos permanecem no histórico. As janelas de acesso e gerenciadores de senha reconhecidos são ignorados, mas essa verificação não garante detectar todo conteúdo sensível: notificações ou outras janelas sobrepostas podem aparecer na região capturada. Revise as imagens antes de um envio externo.

Os sensores guardam horários, aplicativos, títulos/IDs de janelas, contagens de teclado/mouse, movimento amostrado do ponteiro e estimativas numéricas da câmera. Não guardam texto digitado, áudio, vídeo ou identificação facial. O navegador não envia o conteúdo das páginas para a IA por meio da extensão. A captura de tela é uma função separada e explícita.

## Três modos de análise

- **Local — métricas sem modelo:** padrão. Calcula categorias, trocas, cobertura visual e sugestões por regras. Não interpreta o conteúdo de uma imagem e não se apresenta como modelo de IA treinado.
- **Ollama — modelo visual local:** opcional, sem conta OpenAI. Instale Ollama e um modelo que aceite imagens, como `gemma3:4b`; selecione esse modo e o nome do modelo. O aplicativo chama somente o serviço local no próprio PC. Não há migração automática para nuvem se ele falhar. O modelo não vem incluído: exige download separado e recursos de memória/processamento adequados.
- **OpenAI — API opcional:** cada pessoa configura a própria chave e créditos. A chave pode estar na variável de ambiente `OPENAI_API_KEY` ou no arquivo local `.env.local`, junto do aplicativo. Nunca publique esse arquivo. A chamada usa o modelo `gpt-6-luna`, saída estruturada e `store: false`. Isso não equivale a prometer retenção zero pelo provedor; valem as políticas da API. O uso pode ter custo independente do plano ChatGPT/Codex.

Para uma análise manual, selecione de uma a quatro capturas da mesma sessão no relatório, escolha o provedor e confirme o processamento. As respostas são sugestões baseadas em amostras, sujeitas a erros. Não diagnosticam atenção, emoções, fadiga ou condições de saúde e não devem decidir notas, acesso à educação ou avaliação de outras pessoas. O alinhamento das imagens é comparado ao objetivo declarado, sem bloquear sites por decisão autônoma da IA.

## Precisão dos sinais

MediaPipe fornece malha refinada com íris e pontos corporais. O Compasso estima gaze por posição relativa das íris e calibração individual; não mede exatamente o ponto visto na tela. Direção da cabeça usa geometria facial em três eixos. Os ângulos são aproximados. Postura inclui ombros, tronco, quadris e ângulos de cotovelos/joelhos visíveis; partes ocultas ficam sem leitura. Não é uma avaliação ergonômica ou clínica. Óculos, luz, enquadramento e características individuais afetam os resultados.

A inatividade significa ausência de entrada por pelo menos 60 segundos, não desatenção. O nome do aplicativo não explica sozinho o propósito do seu uso: classifique cada contexto de janela de acordo com a tarefa.

## Backup

No relatório, **Exportar backup** cria JSON com sessões, amostras, categorias e resumos. Não inclui chave nem imagens brutas. Para restaurar em um banco novo, use `python Restaurar-Backup.py backup.json novo-banco.sqlite3`. O restaurador recusa sobrescrever dados e aceita formatos anteriores. Imagens ausentes ficam expiradas, preservando os resumos.

No código-fonte, os dados ficam em `data/`; no portátil, em `%LOCALAPPDATA%\Compasso`. Encerre o serviço antes de copiar bancos diretamente. Migrações criam uma cópia SQLite consistente antes de adicionar colunas.

## Compartilhar no GitHub

Publique a **cópia pública limpa** ou o pacote de código-fonte gerado por `empacotar.py`. A pasta de trabalho do autor pode conter `.env.local`, bancos e capturas; ela não deve ser enviada diretamente por arrastar e soltar. `.gitignore` protege esses caminhos em Git, e o empacotador exclui credenciais, dados, imagens de uso, caches e builds.

A distribuição não carrega a chave do autor. Para os colegas, o modo local não exige cadastro ou pagamento. Publique o ZIP portátil como release e os fontes no repositório. Não há instalação de IA local ou criação de conta externa automática.

## Desenvolvimento

`python -m unittest discover -s tests -v` verifica armazenamento, consentimento, janelas, movimento, modelos opcionais e sessões contínuas. Os scripts Node em `tests/` verificam visão, bloqueio real em perfil isolado e interface. Use `COMPASSO_PORT` e `COMPASSO_DB` para bancos e portas de teste separados. Nenhum teste automatizado depende de webcam física.

Para gerar o Windows portátil, instale PyInstaller em um ambiente de build e execute `python build_windows.py`. A saída fica em `dist/Compasso`. `python empacotar.py Compasso-fontes.zip` gera a distribuição de fontes limpa. Veja `VALIDACAO.md` para o que foi efetivamente verificado e o que permanece dependente de teste humano.

[Guia de IA local](OLLAMA.md): configuração do Ollama e evidência do teste real com imagem sintética.
