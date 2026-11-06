(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CompassoPresets=api;})(globalThis,function(){
 const study={title:'Dunlosky et al. (2013) - Técnicas Eficazes de Aprendizagem',url:'https://pubmed.ncbi.nlm.nih.gov/26173288/'};
 const breaks={title:'Albulescu et al. (2022) - Efeito de Micropausas',url:'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0272460'};
 const items=[
  {name:'📖 Leitura & Pesquisa',minutes:35,pause:5,method:'Leia com atenção ativa. A cada seção, formule com suas próprias palavras a ideia central (Método Feynman).',evidence:'A autoexplicação e elaboração ativa aumentam a retenção a longo prazo segundo a psicologia cognitiva.',source:study},
  {name:'✍️ Produção & Escrita',minutes:45,pause:10,method:'Mão na massa: escreva um trecho, resolva problemas ou elabore seu trabalho sem alternar janelas.',evidence:'Prática focada sem troca de contexto reduz a sobrecarga cognitiva e acelera o estado de fluxo.',source:study},
  {name:'🎓 Assistir Aula',minutes:40,pause:5,method:'Acompanhe a videoaula pausando para anotar dúvidas pontuais em vez de apenas assistir passivamente.',evidence:'O consumo ativo com sínteses periódicas supera o consumo passivo contínuo.',source:study},
  {name:'Programação — prática guiada',minutes:50,pause:10,method:'Implemente um exercício, explique sua solução e retome os pontos difíceis em outra sessão.',evidence:'Prática distribuída e testes de recuperação têm boa sustentação na revisão de técnicas de aprendizagem.',source:study},
  {name:'Revisão — recuperação ativa',minutes:25,pause:5,method:'Tente recordar ou responder questões antes de consultar o material de apoio.',evidence:'A prática de recuperação ativa (active recall) é classificada como uma das técnicas de maior utilidade formativa.',source:study},
  {name:'Exercícios — prática e correção',minutes:40,pause:10,method:'Resolva sem consultar a resposta antecipadamente, confira os erros e programe uma revisão.',evidence:'O perfil aplica princípios de recuperação e espaçamento do aprendizado.',source:study},
  {name:'Foco Geral',minutes:50,pause:10,method:'Escolha uma entrega concreta e faça uma pausa revigorante entre os blocos.',evidence:'A revisão sobre micropausas encontrou benefícios para vigor e redução da fadiga mental.',source:breaks},
  {name:'Acompanhamento contínuo — 24h',minutes:0,pause:0,method:'Mantenha o acompanhamento silencioso durante o uso do PC sem limite de tempo.',evidence:'Modo contínuo de observação do ritmo do usuário.',source:breaks}
 ];
 return {items,find:name=>items.find(item=>item.name===name)};
});
