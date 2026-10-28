export type DaySummary={day:string;seconds:number;focus:number;sessions:number;projects:{name:string;seconds:number}[]};
type Row=Record<string,unknown>;
const row=(v:unknown):v is Row=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function summarizeBackup(value:unknown):DaySummary[]{
 if(!row(value)||value.format!=='compasso-backup-v1'||!Array.isArray(value.samples)||!Array.isArray(value.sessions))throw Error('Escolha o backup JSON exportado pelo Compasso.');
 if(value.samples.length>100000||value.sessions.length>20000)throw Error('Arquivo muito grande. Consulte esse relatório no aplicativo.');
 const names=new Map<string,string>(),cats=new Map<string,string>(),windows=new Map<string,string>();
 for(const s of value.sessions)if(row(s)&&typeof s.project==='string')names.set(String(s.id),s.project.slice(0,80)||'Foco geral');
 for(const [source,target,key]of [[value.categories,cats,'app'],[value.window_categories,windows,'window_key']] as const)if(Array.isArray(source))for(const s of source)if(row(s)&&typeof s[key]==='string'&&typeof s.category==='string')target.set(s[key],s.category);
 const days=new Map<string,{seconds:number;focus:number;sessions:Set<string>;projects:Map<string,number>}>();
 for(const s of value.samples){
  if(!row(s)||typeof s.ts!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(s.ts)||!Number.isFinite(Date.parse(s.ts)))throw Error('O backup contém datas inválidas. Exporte um novo arquivo no aplicativo.');
  if(typeof s.seconds!=='number'||!Number.isFinite(s.seconds)||s.seconds<0||s.seconds>3600)throw Error('O backup contém durações inválidas.');
  const day=s.ts.slice(0,10),id=String(s.session_id),name=names.get(id)||'Projeto sem nome';
  const d=days.get(day)||{seconds:0,focus:0,sessions:new Set<string>(),projects:new Map<string,number>()};
  const category=windows.get(String(s.window_key))||cats.get(String(s.app))||'neutral';
  d.seconds+=s.seconds;if(category==='focus'||category==='study')d.focus+=s.seconds;d.sessions.add(id);d.projects.set(name,(d.projects.get(name)||0)+s.seconds);days.set(day,d);
 }
 return [...days].sort(([a],[b])=>b.localeCompare(a)).map(([day,d])=>({day,seconds:d.seconds,focus:d.focus,sessions:d.sessions.size,projects:[...d.projects].map(([name,seconds])=>({name,seconds})).sort((a,b)=>b.seconds-a.seconds)}));
}
