(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CompassoPolicy=api;})(globalThis,function(){
 function host(url){try{const parsed=new URL(url);return /^https?:$/.test(parsed.protocol)?parsed.hostname.toLowerCase():'';}catch{return '';}}
 function local(hostname){return ['localhost','127.0.0.1','[::1]'].includes(hostname);}
 function matches(hostname,domain){return hostname===domain||hostname.endsWith('.'+domain);}
 function blocked(url,policy){const hostname=host(url);if(!policy?.enabled||!hostname||local(hostname))return false;const listed=(policy.domains||[]).some(d=>matches(hostname,d));return policy.mode==='allowlist'?!listed:listed;}
 function rules(policy,redirectUrl){
  if(!policy?.enabled)return [];
  const redirect={type:'redirect',redirect:{url:redirectUrl}};
  if(policy.mode==='allowlist')return [
   {id:1,priority:1,action:redirect,condition:{regexFilter:'^https?://',resourceTypes:['main_frame']}},
   {id:2,priority:2,action:{type:'allow'},condition:{requestDomains:[...(policy.domains||[]),'localhost','127.0.0.1'],resourceTypes:['main_frame']}}
  ];
  if(!policy.domains?.length)return [];
  return [{id:1,priority:1,action:redirect,condition:{requestDomains:policy.domains,resourceTypes:['main_frame'],excludedRequestDomains:['localhost','127.0.0.1']}}];
 }
 return {blocked,rules,host};
});
