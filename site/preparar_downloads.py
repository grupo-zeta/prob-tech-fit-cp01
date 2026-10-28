from pathlib import Path
import sys,json,hashlib,shutil
if len(sys.argv)!=3:raise SystemExit('Uso: python preparar_downloads.py Windows.zip Fontes.zip')
root=Path(__file__).resolve().parent;p=root/'public/downloads';p.mkdir(parents=True,exist_ok=True)
data=Path(sys.argv[1]).read_bytes();parts=[]
for i,start in enumerate(range(0,len(data),20*1024*1024),1):
 name=f'Compasso-Windows-v4.1.1.part{i}';(p/name).write_bytes(data[start:start+20*1024*1024]);parts.append('/downloads/'+name)
(p/'compasso-v4.1.1.json').write_text(json.dumps({'parts':parts,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}),encoding='utf-8')
shutil.copy2(sys.argv[2],p/'Compasso-fontes-v4.1.1.zip')
guide=root.parent/'compasso/OLLAMA.md'
if guide.exists():shutil.copy2(guide,p/'OLLAMA.md')
print('Downloads preparados; arquivos grandes permanecem fora dos commits.')
