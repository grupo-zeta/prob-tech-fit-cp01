---
name: qa-academico
description: >-
  Orquestra a suíte de verificação de qualidade de slides (PPTX) e documentos (LaTeX) no repositório.
---

# Skill: QA Acadêmico

Esta skill centraliza a validação de formato e qualidade para as entregas de artigos e apresentações.
Ao invocar esta skill, execute os validadores usando o `qa.py` na raiz do workspace.

## 1. Referência Bibliográfica
Consulte as regras em: `D:\workspace\.agents\rules\formatacao_academica\`
Se não souber os erros comuns de LaTeX ou regras de geometria de PPTX, leia os manuais lá antes.

## 2. Ordem de Execução

1. **Validação do LaTeX (Completa):**
   ```bash
   python D:\workspace\qa.py latex <DIRETÓRIO_DO_PROJETO> main.tex
   ```
   *Critério de Aceite:* Zero falhas. Erros nos logs ou BOM estático reprovam.

2. **Validação do PPTX:**
   ```bash
   python D:\workspace\qa.py pptx <ARQUIVO.pptx>
   ```
   *Critério de Aceite:* 0 erros. Avalie os avisos caso a caso.

## 3. Relatório
Entregue o resultado de ambas as saídas para o usuário e reporte sem consertar automaticamente.
