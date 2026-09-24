# Constituição Acadêmica (Regras Inquebráveis)

1. **Nunca reaproveite medidas de imagem ou slides**: Leia a geometria real do arquivo recém-gerado/inserido e calcule as proporções na hora.
2. **Reporte, não conserte silenciosamente**: Automações e hooks existem para apontar erros. Nunca modifique arquivos que mascaram um erro estrutural sem a aprovação explícita do usuário.
3. **Não invente dados**: Se uma execução quebrou ou não existe log, o relatório deve constar o erro. Nunca interpole ou chute valores de acurácia, tabela ou Loss.
4. **Trilha de Auditoria Rigorosa (Pipeline de Tabelas)**: Nunca escreva valores em tabelas manualmente. Utilize o pipeline de dados. 
   - *Atenção:* Resultado que vai para artigo tem que ser rastreável a um commit. Comite o código que está sendo medido antes de chamar o runner.py. Se estiver em meio a uma alteração, use um branch de trabalho — NUNCA comite código quebrado só para satisfazer esta regra.
   - *Nota:* Rodar com árvore suja é permitido apenas para exploração; esses resultados NÃO entram em tabelas de publicação.
