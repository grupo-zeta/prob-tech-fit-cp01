"""Compasso: local Windows focus companion. Python standard library only."""
import argparse
import ctypes as C
from contextlib import closing
from ctypes import wintypes as W
import datetime as D
import json
import hashlib
import math
import mimetypes
import os
from pathlib import Path
import secrets
import sqlite3
import subprocess
import sys
import threading
import time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from context_tools import ContextManager

FROZEN=bool(getattr(sys,'frozen',False))
ASSETS=Path(getattr(sys,'_MEIPASS',Path(__file__).resolve().parent))
ROOT=Path(sys.executable).resolve().parent if FROZEN else Path(__file__).resolve().parent
DATA_ROOT=(Path(os.environ.get('LOCALAPPDATA',str(ROOT)))/'Compasso') if FROZEN else ROOT/'data'
EXTENSION_ROOT=ROOT/'extension' if (ROOT/'extension').is_dir() else ASSETS/'extension'
PORT = int(os.environ.get('COMPASSO_PORT', '8765'))
CATEGORIES = {'focus', 'study', 'neutral', 'distraction'}
INPUT_COUNTERS = ('keys', 'clicks', 'scroll', 'moves', 'mouse_distance')
SAMPLE_EXTENSIONS = {
    'moves':'INTEGER', 'mouse_distance':'REAL', 'mouse_x':'INTEGER', 'mouse_y':'INTEGER',
    'window_id':'TEXT', 'window_title':'TEXT', 'window_key':'TEXT',
    'gaze_direction':'TEXT', 'gaze_x':'REAL', 'gaze_y':'REAL',
    'head_yaw':'REAL', 'head_pitch':'REAL', 'head_roll':'REAL',
    'pose_points':'INTEGER', 'shoulder_tilt':'REAL', 'trunk_lean':'REAL', 'hip_tilt':'REAL',
    'elbow_left':'REAL', 'elbow_right':'REAL', 'knee_left':'REAL', 'knee_right':'REAL'
}


def window_key(app, title):
    return hashlib.sha256((app+'\0'+title).encode('utf-8')).hexdigest()


def number(data, key, low=-180, high=180):
    value = data.get(key)
    if value is None: return None
    if isinstance(value, bool): raise ValueError('Medida inválida: '+key)
    value = float(value)
    if not math.isfinite(value) or not low <= value <= high:
        raise ValueError('Medida fora do intervalo: '+key)
    return value


class WindowsMonitor:
    def __init__(self):
        self.available = os.name == 'nt'
        self.lock = threading.Lock()
        self.counts = dict(keys=0, clicks=0, scroll=0, moves=0, mouse_distance=0.0)
        self.mouse_position = None
        self.hooks_ready = False
        if self.available:
            self.u = C.WinDLL('user32', use_last_error=True)
            self.k = C.WinDLL('kernel32', use_last_error=True)
            self.u.GetForegroundWindow.restype = W.HWND
            self.u.GetWindowThreadProcessId.argtypes = [W.HWND, C.POINTER(W.DWORD)]
            self.u.GetWindowTextW.argtypes = [W.HWND, W.LPWSTR, C.c_int]
            self.u.GetCursorPos.argtypes = [C.POINTER(W.POINT)]
            point = W.POINT()
            if self.u.GetCursorPos(C.byref(point)): self.mouse_position = (point.x,point.y)
            self.k.OpenProcess.restype = W.HANDLE
            self.k.OpenProcess.argtypes = [W.DWORD, W.BOOL, W.DWORD]
            self.k.QueryFullProcessImageNameW.argtypes = [W.HANDLE, W.DWORD, W.LPWSTR, C.POINTER(W.DWORD)]
            self.k.CloseHandle.argtypes = [W.HANDLE]
            threading.Thread(target=self._hooks, daemon=True).start()

    def _hooks(self):
        result_type = C.c_ssize_t
        callback = C.WINFUNCTYPE(result_type, C.c_int, W.WPARAM, W.LPARAM)
        self.u.SetWindowsHookExW.argtypes = [C.c_int, callback, W.HINSTANCE, W.DWORD]
        self.u.SetWindowsHookExW.restype = W.HANDLE
        self.u.CallNextHookEx.argtypes = [W.HANDLE, C.c_int, W.WPARAM, W.LPARAM]
        self.u.CallNextHookEx.restype = result_type
        self.k.GetModuleHandleW.argtypes = [W.LPCWSTR]
        self.k.GetModuleHandleW.restype = W.HMODULE

        def keyboard(code, msg, data):
            if code >= 0 and msg in (0x100, 0x104):
                with self.lock:
                    self.counts['keys'] += 1
            return self.u.CallNextHookEx(None, code, msg, data)

        class MouseEvent(C.Structure):
            _fields_ = [('pt', W.POINT), ('mouseData', W.DWORD), ('flags', W.DWORD),
                        ('time', W.DWORD), ('dwExtraInfo', C.c_size_t)]

        def mouse(code, msg, data):
            if code >= 0:
                event = C.cast(data, C.POINTER(MouseEvent)).contents
                self.record_mouse(msg, event.pt.x, event.pt.y)
            return self.u.CallNextHookEx(None, code, msg, data)

        self._keyboard, self._mouse = callback(keyboard), callback(mouse)
        module = self.k.GetModuleHandleW(None)
        self._kh = self.u.SetWindowsHookExW(13, self._keyboard, module, 0)
        self._mh = self.u.SetWindowsHookExW(14, self._mouse, module, 0)
        self.hooks_ready = bool(self._kh and self._mh)
        msg = W.MSG()
        while self.u.GetMessageW(C.byref(msg), None, 0, 0) > 0:
            self.u.TranslateMessage(C.byref(msg))
            self.u.DispatchMessageW(C.byref(msg))

    def record_mouse(self, msg, x, y):
        """No click targets or raw trajectory: totals and latest position only."""
        with self.lock:
            if msg == 0x200:
                position = (x, y)
                if self.mouse_position is not None and position != self.mouse_position:
                    self.counts['moves'] += 1
                    self.counts['mouse_distance'] += math.hypot(x-self.mouse_position[0], y-self.mouse_position[1])
                self.mouse_position = position
            elif msg in (0x201, 0x204, 0x207, 0x20B):
                self.counts['clicks'] += 1
            elif msg in (0x20A, 0x20E):
                self.counts['scroll'] += 1

    def snapshot(self):
        if not self.available:
            return dict(app='Monitor indisponível', idle=0, **dict.fromkeys(INPUT_COUNTERS, 0), hooks=False,
                        mouse_x=None, mouse_y=None, window_id='', window_title='')
        hwnd = self.u.GetForegroundWindow()
        pid = W.DWORD()
        self.u.GetWindowThreadProcessId(hwnd, C.byref(pid))
        title = C.create_unicode_buffer(513)
        self.u.GetWindowTextW(hwnd, title, len(title))
        handle = self.k.OpenProcess(0x1000, False, pid.value)
        app = 'Windows / protegido'
        if handle:
            size, name = W.DWORD(32768), C.create_unicode_buffer(32768)
            if self.k.QueryFullProcessImageNameW(handle, 0, name, C.byref(size)):
                app = Path(name.value).stem
            self.k.CloseHandle(handle)

        class LastInput(C.Structure):
            _fields_ = [('cbSize', W.UINT), ('dwTime', W.DWORD)]
        info = LastInput(C.sizeof(LastInput), 0)
        self.u.GetLastInputInfo(C.byref(info))
        self.k.GetTickCount.restype = W.DWORD
        idle = ((self.k.GetTickCount() - info.dwTime) & 0xffffffff) / 1000
        with self.lock:
            counts = self.counts.copy()
            position = self.mouse_position
        return dict(app=app, idle=round(idle), hooks=self.hooks_ready, **counts,
                    mouse_x=position[0] if position else None, mouse_y=position[1] if position else None,
                    window_id=f'{pid.value}:{int(hwnd or 0):x}', window_title=title.value)


class Store:
    def __init__(self, path):
        self.lock = threading.RLock()
        existed = str(path) != ':memory:' and Path(path).is_file() and Path(path).stat().st_size > 0
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.executescript('''
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS sessions(id INTEGER PRIMARY KEY, started TEXT, ended TEXT,
              project TEXT, goal INTEGER, status TEXT);
            CREATE TABLE IF NOT EXISTS samples(id INTEGER PRIMARY KEY, session_id INTEGER, ts TEXT,
              seconds REAL, app TEXT, idle REAL, keys INTEGER, clicks INTEGER, scroll INTEGER,
              face INTEGER, centered INTEGER, posture INTEGER, blinks INTEGER);
            CREATE TABLE IF NOT EXISTS categories(app TEXT PRIMARY KEY, category TEXT);
            CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
            CREATE TABLE IF NOT EXISTS window_categories(window_key TEXT PRIMARY KEY, category TEXT);
        ''')
        columns = {r[1] for r in self.db.execute('PRAGMA table_info(samples)')}
        missing = {name:kind for name,kind in SAMPLE_EXTENSIONS.items() if name not in columns}
        session_columns = {r[1] for r in self.db.execute('PRAGMA table_info(sessions)')}
        session_missing = {name:kind for name,kind in {'objective':'TEXT','options':'TEXT'}.items() if name not in session_columns}
        if missing or session_missing:
            # SQLite's backup API includes committed WAL data; keep a recoverable pre-migration copy.
            if existed:
                backup_path = str(path)+('.before-v3.1-' if missing else '.before-v4-')+str(time.time_ns())+'.bak'
                with closing(sqlite3.connect(backup_path)) as backup: self.db.backup(backup)
            with self.db:
                for name, kind in missing.items(): self.db.execute(f'ALTER TABLE samples ADD COLUMN {name} {kind}')
                for name, kind in session_missing.items(): self.db.execute(f'ALTER TABLE sessions ADD COLUMN {name} {kind}')
                self.db.execute('PRAGMA user_version=3')
        self.db.execute("UPDATE sessions SET status='interrupted', ended=? WHERE ended IS NULL", (self.now(),))
        self.db.commit()
        self.active = None
        self.paused = False
        self.camera = {}
        self.token = secrets.token_urlsafe(32)
        self.monitor = WindowsMonitor()
        self.live = self.monitor.snapshot()
        self.previous = self.live.copy()
        self.last = time.monotonic()
        self.report_cache=None
        self.context = ContextManager(self,ROOT,Path(path).resolve().parent)

    @staticmethod
    def now():
        return D.datetime.now().astimezone().isoformat(timespec='seconds')

    def tick(self):
        with self.lock:
            now = time.monotonic()
            delta = now - self.last
            self.last = now
            self.live = self.monitor.snapshot()
            counts = {k: max(0, self.live.get(k, 0) - self.previous.get(k, 0)) for k in INPUT_COUNTERS}
            self.previous = self.live.copy()
            if not self.active or self.paused or delta > 3:
                return
            cam = self.camera if now - self.camera.get('received', 0) < 4 else {}
            sample = dict(session_id=self.active, ts=self.now(), seconds=delta, app=self.live['app'],
                idle=self.live['idle'], **counts, **{k:cam.get(k) for k in ('face','centered','posture')},
                blinks=cam.get('blinks',0), mouse_x=self.live.get('mouse_x'), mouse_y=self.live.get('mouse_y'),
                window_id=self.live.get('window_id',''), window_title=self.live.get('window_title',''),
                window_key=window_key(self.live['app'],self.live.get('window_title','')))
            sample.update({k:cam.get(k) for k in SAMPLE_EXTENSIONS if k not in sample})
            self.db.execute(f'INSERT INTO samples({",".join(sample)}) VALUES({",".join("?" for _ in sample)})',tuple(sample.values()))
            self.camera['blinks'] = 0
            self.db.commit()

    def category(self, app):
        row = self.db.execute('SELECT category FROM categories WHERE app=?', (app,)).fetchone()
        return row[0] if row else 'neutral'

    def live_category(self):
        key = window_key(self.live['app'],self.live.get('window_title',''))
        row = self.db.execute('SELECT category FROM window_categories WHERE window_key=?',(key,)).fetchone()
        return row[0] if row else self.category(self.live['app'])

    def report(self, day=None, session_id=None):
        day = day or D.date.today().isoformat()
        try:
            D.date.fromisoformat(day)
        except ValueError:
            raise ValueError('Data inválida')
        query='SELECT * FROM samples WHERE substr(ts,1,10)=?'
        params=[day]
        if session_id is not None:query+=' AND session_id=?';params.append(session_id)
        rows = [dict(r) for r in self.db.execute(query+' ORDER BY id',params)]
        category_map = dict(self.db.execute('SELECT app,category FROM categories'))
        window_category_map = dict(self.db.execute('SELECT window_key,category FROM window_categories'))
        apps, cats = {}, {k: 0 for k in CATEGORIES}
        windows = {}
        gaze_directions = {k:0 for k in ('center','left','right','up','down')}
        gaze_coverage = pose_coverage = head_coverage = mouse_distance = 0
        moves = window_switches = blinks = 0
        total = face = centered = posture = switches = keys = clicks = scroll = idle = 0
        prev = None
        for r in rows:
            sec = r['seconds']
            category = window_category_map.get(r['window_key'], category_map.get(r['app'], 'neutral'))
            r['category'] = category
            total += sec
            cats[category] += sec
            app = apps.setdefault(r['app'], dict(app=r['app'], seconds=0, category=category,
                categories={k:0 for k in CATEGORIES}))
            app['seconds'] += sec
            app['categories'][category] += sec
            if app['category'] != category: app['category'] = 'mixed'
            if r['window_id']:
                context = (r['window_id'],r['window_title'])
                window = windows.setdefault(context,dict(id=r['window_id'],key=r['window_key'],app=r['app'],
                    title=r['window_title'],seconds=0,category=category))
                window['seconds'] += sec
            if prev and prev['session_id'] == r['session_id']:
                gap = (D.datetime.fromisoformat(r['ts'])-D.datetime.fromisoformat(prev['ts'])).total_seconds()
                if gap <= 3:
                    if prev['app'] != r['app']: switches += 1
                    if prev['window_id'] and r['window_id'] and (prev['window_id'],prev['window_title']) != (r['window_id'],r['window_title']):
                        window_switches += 1
            prev = r
            if r['face'] == 1:
                face += sec
                centered += sec if r['centered'] == 1 else 0
            posture += sec if r['posture'] == 1 and r['trunk_lean'] is not None else 0
            idle += sec if r['idle'] >= 60 else 0
            keys += r['keys']; clicks += r['clicks']; scroll += r['scroll']
            moves += r['moves'] or 0; mouse_distance += r['mouse_distance'] or 0; blinks += r['blinks'] or 0
            if r['gaze_direction'] in gaze_directions:
                gaze_directions[r['gaze_direction']] += sec; gaze_coverage += sec
            if r['posture'] is not None and r['trunk_lean'] is not None: pose_coverage += sec
            if r['head_yaw'] is not None: head_coverage += sec
        # At most 90 proportional bins, without inventing values in empty intervals.
        timeline = []
        width = max(1, (len(rows) + 89) // 90)
        for i in range(0, len(rows), width):
            chunk = rows[i:i+width]
            votes = {k: sum(r['seconds'] for r in chunk if r['category'] == k) for k in CATEGORIES}
            timeline.append(dict(category=max(votes, key=votes.get), camera=any(r['face'] == 1 for r in chunk),
                centered=any(r['centered'] == 1 for r in chunk),
                gaze=any(r['gaze_direction']=='center' for r in chunk), gaze_valid=any(r['gaze_direction'] in gaze_directions for r in chunk),
                posture=any(r['posture']==1 and r['trunk_lean'] is not None for r in chunk),
                pose_valid=any(r['posture'] is not None and r['trunk_lean'] is not None for r in chunk),
                input=any(r['keys'] or r['clicks'] or r['scroll'] or r['moves'] for r in chunk),
                mouse=any(r['moves'] for r in chunk),window=chunk[0]['window_title'],app=chunk[0]['app'],ts=chunk[0]['ts']))
        session_query='''SELECT s.*, COALESCE(SUM(p.seconds),0) seconds FROM sessions s
          LEFT JOIN samples p ON p.session_id=s.id AND substr(p.ts,1,10)=?
          WHERE (substr(s.started,1,10)=? OR EXISTS(SELECT 1 FROM samples q WHERE q.session_id=s.id AND substr(q.ts,1,10)=?))'''
        session_params=[day,day,day]
        if session_id is not None:session_query+=' AND s.id=?';session_params.append(session_id)
        sessions=[dict(r) for r in self.db.execute(session_query+' GROUP BY s.id ORDER BY s.id DESC',session_params)]
        return dict(day=day,total=total,categories=cats,apps=sorted(apps.values(),key=lambda a:-a['seconds']),
            windows=sorted(windows.values(),key=lambda a:-a['seconds']),window_switches=window_switches,
            gaze_directions=gaze_directions,gaze_coverage=gaze_coverage,pose_coverage=pose_coverage,head_coverage=head_coverage,
            moves=moves,mouse_distance=mouse_distance,blinks=blinks,
            face=face,centered=centered,posture=posture,switches=switches,keys=keys,clicks=clicks,scroll=scroll,idle=idle,timeline=timeline,sessions=sessions)

    def state(self):
        with self.lock:
            active = dict(self.db.execute('SELECT * FROM sessions WHERE id=?', (self.active,)).fetchone()) if self.active else None
            elapsed = self.db.execute('SELECT COALESCE(SUM(seconds),0) FROM samples WHERE session_id=?', (self.active,)).fetchone()[0]
            today=D.date.today().isoformat();now=time.monotonic()
            if self.report_cache is None or self.report_cache[1]!=today or now-self.report_cache[0]>5:
                self.report_cache=(now,today,self.report())
            return dict(version='4.1.1',token=self.token,active=active,paused=self.paused,elapsed=elapsed,live=self.live,
                category=self.live_category(),camera={k:v for k,v in self.camera.items() if k!='received'},
                startup=startup_enabled(), report=self.report_cache[2],context=self.context.status())

    def resume_maintenance(self,checkpoint):
        with self.lock:
            age=time.time()-float(checkpoint.get('created',0))
            row=self.db.execute('SELECT * FROM sessions WHERE id=?',(int(checkpoint['session_id']),)).fetchone()
            if not row or not 0<=age<600 or row['started']!=checkpoint.get('started'):
                raise ValueError('Checkpoint de atualização inválido ou expirado.')
            self.db.execute("UPDATE sessions SET ended=NULL,status='active' WHERE id=?",(row['id'],))
            self.db.commit();self.active=row['id'];self.paused=bool(checkpoint.get('paused',True));self.last=time.monotonic()
            self.context.on_start(self.context.validate_options({}));self.report_cache=None

    def action(self, action, data):
        with self.lock:
            if action == 'start':
                if self.active:
                    raise ValueError('Já há uma sessão em andamento')
                goal = int(data.get('goal', 50))
                if not 0 <= goal <= 1440:
                    raise ValueError('Escolha de 1 a 1440 minutos, ou 0 para acompanhamento contínuo.')
                project = str(data.get('project', 'Foco Geral')).strip()[:100] or 'Foco Geral'
                options=self.context.validate_options(data)
                if options['guard_enabled'] and time.monotonic()-self.context.extension_seen>=25:
                    raise ValueError('Conecte a extensão no navegador que você usa antes de iniciar o foco protegido, ou desmarque a proteção para uma sessão sem bloqueio.')
                objective=str(data.get('objective','')).strip()[:1500] or project
                cur = self.db.execute("INSERT INTO sessions(started,project,goal,status,objective,options) VALUES(?,?,?,'active',?,?)", (self.now(), project, goal,objective,json.dumps(options)))
                self.active, self.paused = cur.lastrowid, False
                self.context.on_start(options)
                self.last = time.monotonic()
                self.previous = self.monitor.snapshot()
            elif action == 'pause':
                if not self.active:
                    raise ValueError('Inicie uma sessão')
                self.paused = not self.paused
                self.camera = {}
                self.last = time.monotonic()
            elif action == 'finish':
                if self.active:
                    self.db.execute("UPDATE sessions SET ended=?,status='completed' WHERE id=?", (self.now(),self.active))
                self.active, self.paused, self.camera = None, False, {}
            elif action == 'classify':
                category = data.get('category')
                if category not in CATEGORIES:
                    raise ValueError('Categoria inválida')
                app = str(data.get('app', self.live['app']))[:300]
                if data.get('scope') == 'window':
                    title = str(data.get('title',self.live.get('window_title','')))[:512]
                    self.db.execute('INSERT OR REPLACE INTO window_categories VALUES(?,?)',(window_key(app,title),category))
                else:
                    self.db.execute('INSERT OR REPLACE INTO categories VALUES(?,?)', (app,category))
            elif action == 'camera':
                if not self.active or self.paused:
                    return {}
                camera = {k: (None if data.get(k) is None else int(bool(data[k]))) for k in ('face','centered','posture')}
                direction = data.get('gaze_direction')
                if direction is not None and direction not in ('center','left','right','up','down'):
                    raise ValueError('Direção do olhar inválida')
                camera.update({k:number(data,k) for k in ('head_yaw','head_pitch','head_roll','shoulder_tilt','trunk_lean','hip_tilt','elbow_left','elbow_right','knee_left','knee_right')})
                camera.update({k:number(data,k,-2,2) for k in ('gaze_x','gaze_y')})
                camera['pose_points'] = number(data,'pose_points',0,33)
                camera['gaze_direction'] = direction
                if not camera['face']:
                    for k in ('centered','head_yaw','head_pitch','head_roll','gaze_direction','gaze_x','gaze_y'): camera[k] = None
                elif camera['gaze_x'] is None or camera['gaze_y'] is None:
                    camera['gaze_direction'] = None
                camera.update(received=time.monotonic(),blinks=min(10,max(0,int(data.get('blinks',0)))) + self.camera.get('blinks',0))
                self.camera = camera
            elif action == 'camera_off':
                self.camera = {}
            elif action == 'startup':
                set_startup(bool(data.get('enabled')))
            elif action == 'capture_now':
                self.context.request_capture(delay=5)
            elif action == 'capture_delete':
                self.context.delete_capture(str(data.get('id','')))
            elif action == 'context_stop':
                self.context.options['capture_enabled']=False;self.context.options['allow_ai_upload']=False
                self.context.message='Capturas e novos envios à IA desligados. Um envio já iniciado pode terminar.'
            elif action == 'analyze_captures':
                self.context.request_analysis(data.get('ids'),bool(data.get('consent',False)),provider=data.get('provider','local'),local_model=data.get('local_model','gemma3:4b'))
            else:
                raise ValueError('Ação desconhecida')
            self.db.commit()
            if action in ('start','pause','finish','classify'):self.report_cache=None
            return dict(ok=True)


def startup_enabled():
    if os.name != 'nt': return False
    import winreg
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r'Software\Microsoft\Windows\CurrentVersion\Run') as key:
            return bool(winreg.QueryValueEx(key, 'Compasso')[0])
    except OSError: return False


def set_startup(enabled):
    if os.name != 'nt': raise ValueError('Disponível no Windows')
    import winreg
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, r'Software\Microsoft\Windows\CurrentVersion\Run') as key:
        if enabled:
            command=f'"{sys.executable}" --startup' if FROZEN else f'wscript.exe "{ROOT / "Iniciar-Compasso.vbs"}" --startup'
            winreg.SetValueEx(key,'Compasso',0,winreg.REG_SZ,command)
        else:
            try: winreg.DeleteValue(key,'Compasso')
            except FileNotFoundError: pass


def open_window(startup=False):
    url = f'http://127.0.0.1:{PORT}/?v=4.1.1'+('&startup=1' if startup else '')
    candidates = [Path(os.environ.get('PROGRAMFILES(X86)',''))/'Microsoft/Edge/Application/msedge.exe',
                  Path(os.environ.get('PROGRAMFILES',''))/'Microsoft/Edge/Application/msedge.exe']
    for edge in candidates:
        if edge.is_file():
            subprocess.Popen([str(edge),f'--app={url}','--window-size=510,940',f'--user-data-dir={DATA_ROOT / "browser"}'])
            return
    import webbrowser
    webbrowser.open(url)


def window_action(action):
    if os.name != 'nt': return
    u = C.WinDLL('user32')
    u.GetWindowTextW.argtypes = [W.HWND, W.LPWSTR, C.c_int]
    u.ShowWindow.argtypes = [W.HWND,C.c_int]
    u.SetForegroundWindow.argtypes = [W.HWND]
    u.SetWindowPos.argtypes = [W.HWND,W.HWND,C.c_int,C.c_int,C.c_int,C.c_int,W.UINT]
    found = []
    callback = C.WINFUNCTYPE(W.BOOL,W.HWND,W.LPARAM)
    def visit(hwnd, _):
        title = C.create_unicode_buffer(1024)
        u.GetWindowTextW(hwnd,title,1024)
        if title.value.startswith('Compasso •'):
            found.append(hwnd)
            if action == 'minimize': u.ShowWindow(hwnd,0)
            elif action == 'restore':
                u.ShowWindow(hwnd,9); u.SetForegroundWindow(hwnd)
            elif action in ('pin','unpin'):
                u.SetWindowPos(hwnd,W.HWND(-1 if action=='pin' else -2),0,0,0,0,0x13)
        return True
    u.EnumWindows(callback(visit),0)
    if action == 'restore' and not found: open_window()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,directory=str(ASSETS/'web'),**kwargs)

    def log_message(self,*args): pass

    def end_headers(self):
        if not self.path.startswith('/api/'):
            self.send_header('Cache-Control','no-cache')
        self.send_header('X-Content-Type-Options','nosniff')
        super().end_headers()

    def valid_host(self):
        return self.headers.get('Host') in (f'127.0.0.1:{PORT}',f'localhost:{PORT}')

    def respond(self,data,status=200):
        body = json.dumps(data,ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Cache-Control','no-store')
        self.send_header('Content-Length',str(len(body)))
        self.end_headers(); self.wfile.write(body)

    def do_OPTIONS(self):
        if self.valid_host() and self.path=='/api/extension/policy' and self.extension_origin():
            self.send_response(204);self.extension_headers();self.end_headers()
        else:self.respond({'error':'Origem inválida'},403)

    def extension_origin(self):
        import re
        origin=self.headers.get('Origin') or 'chrome-extension://'+self.headers.get('X-Compasso-Extension','')
        return bool(re.fullmatch(r'chrome-extension://[a-p]{32}',origin))

    def extension_headers(self):
        origin=self.headers.get('Origin') or 'chrome-extension://'+self.headers.get('X-Compasso-Extension','')
        self.send_header('Access-Control-Allow-Origin',origin)
        self.send_header('Access-Control-Allow-Methods','GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers','X-Compasso-Extension')
        self.send_header('Access-Control-Allow-Private-Network','true')
        self.send_header('Vary','Origin')

    def do_GET(self):
        if not self.valid_host(): return self.respond({'error':'Host inválido'},403)
        if self.path=='/api/extension/policy':
            if not self.extension_origin():return self.respond({'error':'Disponível apenas à extensão do navegador'},403)
            body=json.dumps(self.server.store.context.policy()).encode()
            self.send_response(200);self.extension_headers();self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body);return
        if self.path.startswith('/api/capture/'):
            try:
                file=self.server.store.context.image_path(self.path.removeprefix('/api/capture/'))
                body=file.read_bytes()
                self.send_response(200);self.send_header('Content-Type','image/png');self.send_header('Content-Length',str(len(body)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body)
            except (ValueError,OSError):self.respond({'error':'Imagem indisponível'},404)
            return
        if self.path == '/api/state': return self.respond(self.server.store.state())
        if self.path == '/api/backup':
            with self.server.store.lock:
                return self.respond({
                    'format':'compasso-backup-v1', 'exported':Store.now(),
                    **{table:[dict(r) for r in self.server.store.db.execute('SELECT * FROM '+table)]
                       for table in ('sessions','samples','categories','window_categories','settings','captures','analyses')}
                })
        if self.path.startswith('/api/samples?'):
            from urllib.parse import urlparse,parse_qs
            day = parse_qs(urlparse(self.path).query).get('day',[D.date.today().isoformat()])[0]
            try:
                D.date.fromisoformat(day)
                with self.server.store.lock:
                    return self.respond([dict(r) for r in self.server.store.db.execute(
                        'SELECT * FROM samples WHERE substr(ts,1,10)=? ORDER BY id',(day,))])
            except ValueError: return self.respond({'error':'Data inválida'},400)
        if self.path.startswith('/api/report'):
            from urllib.parse import urlparse,parse_qs
            day = parse_qs(urlparse(self.path).query).get('day',[None])[0]
            try:
                with self.server.store.lock: return self.respond(self.server.store.report(day))
            except ValueError as e: return self.respond({'error':str(e)},400)
        return super().do_GET()

    def do_POST(self):
        origin = self.headers.get('Origin')
        if not self.valid_host() or (origin and origin not in (f'http://127.0.0.1:{PORT}',f'http://localhost:{PORT}')):
            return self.respond({'error':'Origem inválida'},403)
        if self.headers.get('X-Compasso-Token') != self.server.store.token:
            return self.respond({'error':'Token inválido'},403)
        try:
            size = int(self.headers.get('Content-Length',0))
            if not 0 <= size <= 32768: raise ValueError('Pedido muito grande')
            data = json.loads(self.rfile.read(size) or b'{}')
            action = self.path.removeprefix('/api/')
            if action in ('pin','unpin','minimize','restore'):
                window_action(action); result = {'ok':True}
            elif action == 'shutdown':
                self.server.store.action('finish',{})
                self.respond({'ok':True})
                threading.Thread(target=self.server.shutdown,daemon=True).start()
                return
            elif action == 'extension_folder':
                if os.name=='nt':subprocess.Popen(['explorer.exe',str(EXTENSION_ROOT)])
                result={'ok':True}
            else: result = self.server.store.action(action,data)
            self.respond(result)
        except (ValueError,TypeError,KeyError) as e: self.respond({'error':str(e)},400)
        except Exception as e: self.respond({'error':'Falha local: '+str(e)},500)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--open',action='store_true')
    parser.add_argument('--no-tray',action='store_true')
    parser.add_argument('--startup',action='store_true')
    parser.add_argument('--no-open',action='store_true')
    args = parser.parse_args()
    DATA_ROOT.mkdir(parents=True,exist_ok=True)
    mimetypes.add_type('application/wasm','.wasm')
    try: server = ThreadingHTTPServer(('127.0.0.1',PORT),Handler)
    except OSError:
        if not args.no_open and (args.open or args.startup or FROZEN): open_window(args.startup)
        return
    server.store = Store(os.environ.get('COMPASSO_DB',str(DATA_ROOT/'compasso.sqlite3')))
    checkpoint=DATA_ROOT/'maintenance-resume.json'
    if checkpoint.is_file():
        try:server.store.resume_maintenance(json.loads(checkpoint.read_text(encoding='utf-8')))
        except (ValueError,KeyError,TypeError):pass
        checkpoint.unlink(missing_ok=True)
    def collect():
        while True:
            time.sleep(1)
            server.store.tick()
            server.store.context.tick()
    threading.Thread(target=collect,daemon=True).start()
    if os.name == 'nt' and not args.no_tray:
        subprocess.Popen(['powershell.exe','-NoProfile','-STA','-WindowStyle','Hidden','-ExecutionPolicy','Bypass','-File',str(ASSETS/'tray.ps1'),str(PORT)],creationflags=0x08000000)
    if not args.no_open and (args.open or args.startup or FROZEN): threading.Timer(.7,lambda:open_window(args.startup)).start()
    if sys.stdout is not None:print(f'Compasso em http://127.0.0.1:{PORT}',flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally:
        server.store.action('finish',{})
        server.server_close()


if __name__ == '__main__': main()
