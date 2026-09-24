---
name: inspect-existing-project
description: Procedimento obrigatrio para investigar o cdigo-fonte antes de sugerir ou implementar solues.
---

# Skill: Inspeo de Projeto Existente (Harness)

## Quando utilizar
Sempre que o usurio pedir para criar uma nova funcionalidade, corrigir um bug ou alterar a arquitetura, e voc ainda no tiver o mapeamento completo do projeto na memria.

## Procedimento (Obrigatrio)
1. **Mapeamento Topolgico:** Rode list_dir ou procure por arquivos README.md e 
equirements.txt/package.json na raiz.
2. **Localizao de Entidades:** Use ind_by_name e grep_search para encontrar classes, mtodos e variveis cruciais mencionadas no pedido.
3. **Leitura Criteriosa:** No leia o arquivo inteiro se no for necessrio, use paginao ou linhas especficas (iew_file com limites).
4. **Declarao de Entendimento:** Apresente ao usurio um resumo do que encontrou e como isso impacta a tarefa ANTES de escrever o cdigo.
5. **Armadilhas:** No reescreva cdigos sem entender os imports paralelos. Sempre faa fallback para a doc se encontrar uso de bibliotecas de terceiros desconhecidas.
