"""Restore an exported JSON backup into a new database; never overwrite existing data."""
import json
from pathlib import Path
import sqlite3
import sys

def restore(source, target):
    source, target = Path(source), Path(target)
    data = json.loads(source.read_text(encoding='utf-8-sig'))
    if data.get('format') != 'compasso-backup-v1':
        raise ValueError('Este arquivo não é um backup do Compasso.')
    if target.exists():
        raise ValueError('O banco de destino já existe. Preserve-o antes de restaurar.')
    # Build a separate temporary database and rename only after a complete import.
    import app
    temp = target.with_suffix('.restoring')
    if temp.exists(): raise ValueError('Já existe uma restauração temporária nesse local.')
    target.parent.mkdir(parents=True, exist_ok=True)
    store = app.Store(temp)
    try:
        with store.db:
            for table, columns in {
                'sessions':['id','started','ended','project','goal','status','objective','options'],
                'samples':['id','session_id','ts','seconds','app','idle','keys','clicks','scroll','face','centered','posture','blinks',*app.SAMPLE_EXTENSIONS],
                'categories':['app','category'], 'window_categories':['window_key','category'], 'settings':['key','value'],
                'captures':['id','session_id','created','app','title','filename','status','analysis_id'],
                'analyses':['id','session_id','created','objective','review','usage','source_count','model']
            }.items():
                rows = data.get(table,[])
                if not isinstance(rows,list): raise ValueError('Tabela inválida: '+table)
                placeholders = ','.join('?' for _ in columns)
                store.db.executemany(f'INSERT INTO {table}({",".join(columns)}) VALUES({placeholders})',
                    [tuple(row.get(c) for c in columns) for row in rows])
            store.db.execute("UPDATE sessions SET status='interrupted',ended=? WHERE ended IS NULL",(app.Store.now(),))
            # A JSON backup never includes raw screenshots; preserve only their metadata.
            store.db.execute("UPDATE captures SET status='expired' WHERE status IN ('ready','analyzing')")
        store.db.execute('PRAGMA wal_checkpoint(TRUNCATE)')
        store.db.close()
        temp.rename(target)
    except Exception:
        store.db.close()
        temp.unlink(missing_ok=True)
        raise
    print('Backup restaurado em',target)

if __name__ == '__main__':
    if len(sys.argv)!=3:
        raise SystemExit('Uso: python Restaurar-Backup.py backup.json caminho-do-novo-banco.sqlite3')
    restore(sys.argv[1],sys.argv[2])
