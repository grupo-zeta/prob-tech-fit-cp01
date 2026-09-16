# Como contribuir

## Fluxo sugerido

1. Escolha uma tarefa no Trello e confira o trabalho que já existe.
2. Com a cópia local sem alterações pendentes, atualize a branch principal e crie uma branch para a tarefa:

   ```sh
   git switch main
   git pull --ff-only origin main
   git switch -c docs/minha-tarefa
   ```

   Use um nome novo e descritivo; `docs/minha-tarefa` é apenas um exemplo.

3. Faça alterações pequenas, preservando os arquivos de outros integrantes.
4. Confira `git diff` e `git status`. Adicione ao commit somente os arquivos da tarefa, execute as verificações pertinentes e envie a branch.
5. Abra um pull request explicando o problema, os arquivos alterados e as verificações executadas. Relacione o card do Trello e peça revisão de outro integrante.

## Onde colocar cada material

- Texto e exportações do relatório: [docs](docs/README.md).
- Capturas, GIFs e vídeos: [assets](assets/README.md).
- Apresentação: [slides](slides/README.md).
- Interface: `frontend/`; API: `backend/`.
- Experimentos da CP-02: [backend/cp02_arquiteturas](backend/cp02_arquiteturas/README.md).

Para novos artefatos, prefira nomes descritivos, sem espaços, como `cp01-problema3-harness-2026-09-16.png`. Preserve nomes existentes que já estejam referenciados.

## Conferência antes de enviar

- Documentação: conferir links relativos, comandos e procedência das informações.
- Frontend: executar `npm run lint` e `npm run build` dentro de `frontend/`.
- API: iniciar o servidor e conferir `/api/health`; registrar que isso é uma verificação manual.
- Experimentos: informar dataset real ou simulado, ambiente, comando, parâmetros e métricas efetivamente calculadas.
- Capturas: mostrar resultados reais, sem tokens ou credenciais. Identificar ilustrações e simulações como tais.

Não incluir `.env`, tokens, dependências instaladas, datasets ou pesos de modelos em commits comuns. O `.gitignore` atual não cobre todos os artefatos Python; confira a lista de arquivos antes de adicioná-los.

## GitHub e Overleaf

O GitHub e o Overleaf são repositórios distintos. Publicar em um não atualiza automaticamente o outro. Antes de copiar conteúdo, compare as versões e preserve as alterações da equipe. Para uma exportação estática, registre origem e data conforme o [guia de docs](docs/README.md).
