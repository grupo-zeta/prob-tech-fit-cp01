"""Build source-only distributable. User data and credentials must never enter a release."""
from pathlib import Path
import sys
from zipfile import ZipFile, ZIP_DEFLATED

def package(target):
    root=Path(__file__).resolve().parent
    target=Path(target).resolve()
    forbidden={'data','work','__pycache__','runtime','node_modules','.git','dist','build'}
    with ZipFile(target,'w',ZIP_DEFLATED,compresslevel=6) as archive:
        for file in root.rglob('*'):
            relative=file.relative_to(root)
            if not file.is_file() or file.resolve()==target:continue
            if forbidden.intersection(relative.parts):continue
            if relative.parts[:2] in (('web','mediapipe'),('web','vendor')):continue
            if file.name.startswith('.env') or file.suffix.lower() in ('.bak','.pyc','.zip'):continue
            archive.write(file,Path('Compasso')/relative)
        names=archive.namelist()
        if any('/.env' in name or '/data/' in name for name in names):raise RuntimeError('Pacote rejeitado: contém arquivo privado.')
    print('Pacote salvo sem credenciais, histórico ou capturas:',target)

if __name__=='__main__':
    if len(sys.argv)!=2:raise SystemExit('Uso: python empacotar.py caminho-do-arquivo.zip')
    package(sys.argv[1])
