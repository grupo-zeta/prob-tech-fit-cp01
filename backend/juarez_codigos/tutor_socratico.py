import time

print("="*50)
print("TUTOR DE IA SOCRÁTICO - COMBATENDO O ATALHO COGNITIVO")
print("="*50)

def analisar_prompt(prompt):
    print("\n[IA Analisando intenção do aluno...]")
    time.sleep(2)
    
    # Palavras-chave que indicam "Atalho Cognitivo" (quer a resposta pronta)
    atalhos = ["me dê a resposta", "escreva para mim", "faz a redação", "resposta da questão", "resolva"]
    
    for atalho in atalhos:
        if atalho in prompt.lower():
            return True
    return False

def responder_como_tutor():
    print("\nALUNO: Faça a redação sobre a Revolução Industrial para mim.")
    prompt_aluno = "Faça a redação sobre a Revolução Industrial para mim."
    
    if analisar_prompt(prompt_aluno):
        print("\n🤖 [SISTEMA DE LETRAMENTO CRÍTICO ATIVADO]")
        print("TUTOR IA: Eu não vou escrever a redação por você, pois isso prejudica seu aprendizado.")
        print("TUTOR IA: Em vez disso, vamos pensar juntos. Quais foram as duas principais invenções tecnológicas dessa época que você lembra?")
    else:
        print("TUTOR IA: Ótima pergunta! Vamos aprofundar esse conceito...")

responder_como_tutor()
print("\n[Conclusão]: A IA bloqueou o atalho cognitivo e forçou a metacognição do aluno.")
