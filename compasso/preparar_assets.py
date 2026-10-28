"""Download pinned public runtime assets, verifying SHA-256. No account or API key needed."""
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen

def prepare():
    root=Path(__file__).resolve().parent
    manifest=json.loads((root/'assets-manifest.json').read_text(encoding='utf-8'))
    for item in manifest:
        relative=Path(item['file'])
        if relative.is_absolute() or '..' in relative.parts or relative.parts[0] not in ('mediapipe','vendor'):raise ValueError('Caminho de asset inválido.')
        target=root/'web'/relative
        if target.is_file() and hashlib.sha256(target.read_bytes()).hexdigest()==item['sha256']:continue
        allowed=('https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629/','https://cdn.jsdelivr.net/npm/jspdf@2.5.1/')
        if not item['url'].startswith(allowed):raise ValueError('Origem de asset não aprovada.')
        print('Preparando',item['file'],flush=True)
        if item['bytes']==0:data=b''
        else:
            with urlopen(item['url'],timeout=60) as response:data=response.read(40_000_000)
        if len(data)!=item['bytes'] or hashlib.sha256(data).hexdigest()!=item['sha256']:raise ValueError('Integridade do asset não confere: '+item['file'])
        target.parent.mkdir(parents=True,exist_ok=True);temp=target.with_name(target.name+'.part');temp.write_bytes(data);temp.replace(target)
    print('Assets verificados. O núcleo local está pronto para uso offline.')

if __name__=='__main__':prepare()
