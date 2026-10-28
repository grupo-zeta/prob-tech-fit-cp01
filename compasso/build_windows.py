"""Build a portable Windows folder. Install PyInstaller in your build environment first."""
import argparse
from pathlib import Path
import shutil
import subprocess
import sys

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--dist',default='dist');parser.add_argument('--work',default='work/build-windows');args=parser.parse_args()
    root=Path(__file__).resolve().parent;dist=Path(args.dist).resolve();work=Path(args.work).resolve();work.mkdir(parents=True,exist_ok=True)
    if (dist/'Compasso'/'data').exists() or (dist/'Compasso'/'.env.local').exists():raise SystemExit('O destino contém dados ou credenciais. Escolha uma pasta de build nova.')
    subprocess.run([sys.executable,str(root/'preparar_assets.py')],cwd=root,check=True)
    command=[sys.executable,'-m','PyInstaller','--noconfirm','--clean','--onedir','--windowed','--name','Compasso',
      '--icon',str(root/'compasso.ico'),'--distpath',str(dist),'--workpath',str(work/'cache'),'--specpath',str(work),
      '--add-data',str(root/'web')+';web','--add-data',str(root/'tray.ps1')+';.',
      '--add-data',str(root/'compasso.ico')+';.',str(root/'app.py')]
    subprocess.run(command,cwd=root,check=True)
    output=dist/'Compasso';shutil.copytree(root/'extension',output/'extension',dirs_exist_ok=True)
    for name in ('README.md','LICENSE','THIRD_PARTY_NOTICES.md','LICENSE-MediaPipe.txt','REFERENCIAS.md','VALIDACAO.md'):
        if (root/name).exists():shutil.copy2(root/name,output/name)
    python_license=Path(sys.base_prefix)/'LICENSE.txt'
    if python_license.exists():shutil.copy2(python_license,output/'LICENSE-Python.txt')
    print('Versão portátil gerada:',output)

if __name__=='__main__':main()
