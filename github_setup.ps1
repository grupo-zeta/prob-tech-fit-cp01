# ==============================================================================
# SCRIPT DE SETUP DO REPOSITÓRIO: GRUPO ZETA
# ==============================================================================

$ORG_NAME = "grupo-zeta"
$REPO_NAME = "prob-tech-fit-cp01"

Write-Host "Iniciando setup do repositório $ORG_NAME/$REPO_NAME..." -ForegroundColor Cyan

# 1. Inicializar o Git e fazer o primeiro commit
git init
git add .
git commit -m "chore: setup inicial do monorepo (frontend react + backend node)"
git branch -M main

# 2. Criar o repositório público diretamente dentro da Organização via GitHub CLI
Write-Host "Criando repositório público na nuvem..." -ForegroundColor Yellow
gh repo create "$ORG_NAME/$REPO_NAME" --public --source=. --remote=origin --push

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "SETUP CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
Write-Host "O repositório está no ar em: https://github.com/$ORG_NAME/$REPO_NAME" -ForegroundColor Cyan
Write-Host ""
Write-Host "(Nota: Para convidar os membros do grupo depois, vá em 'Settings -> Collaborators' na interface do GitHub)" -ForegroundColor Yellow
