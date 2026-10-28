(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CompassoPresets=api;})(globalThis,function(){
 const study={title:'Dunlosky et al. (2013)',url:'https://pubmed.ncbi.nlm.nih.gov/26173288/'};
 const breaks={title:'Albulescu et al. (2022)',url:'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0272460'};
 const items=[
  {name:'Foco Geral',minutes:50,pause:10,method:'Escolha uma entrega concreta e faça uma pausa entre blocos.',evidence:'A revisão sobre micropausas encontrou benefícios para vigor e fadiga; ganhos de desempenho dependem da tarefa.',source:breaks},
  {name:'Programação · prática guiada',minutes:50,pause:10,method:'Implemente um exercício, explique sua solução e retome os pontos difíceis em outra sessão.',evidence:'Prática distribuída e testes de recuperação têm boa sustentação na revisão de técnicas de aprendizagem; não garantem aprender uma linguagem em um único bloco.',source:study},
  {name:'Revisão · recuperação ativa',minutes:25,pause:5,method:'Tente recordar ou responder questões antes de consultar o material.',evidence:'A revisão identifica a prática de testes e a distribuição do estudo como técnicas de alta utilidade.',source:study},
  {name:'Leitura · autoexplicação',minutes:30,pause:5,method:'Leia um trecho e explique, com suas palavras, como as ideias se conectam.',evidence:'A autoexplicação apresenta utilidade moderada na revisão; os resultados variam conforme a tarefa e a orientação.',source:study},
  {name:'Exercícios · prática e correção',minutes:40,pause:10,method:'Resolva sem consultar a resposta, confira os erros e programe uma revisão posterior.',evidence:'O perfil aplica princípios de recuperação e espaçamento; os minutos são uma escolha de organização do Compasso.',source:study},
  {name:'Escrita · produção concentrada',minutes:45,pause:10,method:'Produza uma seção ou rascunho definido e revise depois de uma pausa.',evidence:'Micropausas podem apoiar o bem-estar. A meta-análise não estabelece uma duração ideal universal de escrita.',source:breaks},
  {name:'Acompanhamento contínuo · 24h',minutes:0,pause:0,method:'Mantenha o acompanhamento durante o uso do PC e troque de projeto quando mudar de atividade.',evidence:'Este é um modo operacional contínuo, não uma recomendação de estudar ou trabalhar por 24 horas. Não há prazo de aprendizagem associado.',source:breaks}
 ];
 return {items,find:name=>items.find(item=>item.name===name)};
});
