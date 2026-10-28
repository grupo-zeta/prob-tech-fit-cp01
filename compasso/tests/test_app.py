import importlib.util
from pathlib import Path
import tempfile
import time
import unittest
import sqlite3
import threading
from contextlib import closing
from contextlib import redirect_stdout
import io
import json
import sys
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))

spec = importlib.util.spec_from_file_location('compasso',Path(__file__).resolve().parents[1]/'app.py')
app = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app)
import context_tools as context

class FakeMonitor:
    def __init__(self):
        self.keys=0;self.title='Documento A';self.window_id='1:aa';self.moves=0;self.distance=0
    def snapshot(self):
        self.keys+=1
        return dict(app='editor',idle=0,keys=self.keys,clicks=0,scroll=0,hooks=True,
                    window_title=self.title,window_id=self.window_id,moves=self.moves,mouse_distance=self.distance,mouse_x=10,mouse_y=20)

class StoreTests(unittest.TestCase):
    def setUp(self):
        self.original=app.WindowsMonitor
        app.WindowsMonitor=FakeMonitor
        self.tmp=tempfile.TemporaryDirectory()
        self.path=Path(self.tmp.name)/'test.db'
        self.store=app.Store(self.path)
    def tearDown(self):
        self.store.db.close();self.tmp.cleanup();app.WindowsMonitor=self.original
    def tick(self,seconds=1):
        self.store.last=time.monotonic()-seconds
        self.store.tick()
    def test_session_pause_resume_finish_and_categories(self):
        self.tick();self.assertEqual(self.store.report()['total'],0)
        self.store.action('start',{'project':'Trabalho <teste>','goal':25})
        self.tick();first=self.store.report()['total']
        self.store.action('pause',{});self.tick()
        self.assertEqual(self.store.report()['total'],first)
        self.store.action('pause',{});self.tick()
        self.store.action('classify',{'app':'editor','category':'focus'})
        report=self.store.report()
        self.assertAlmostEqual(report['categories']['focus'],2,places=1)
        self.assertEqual(len(report['timeline']),2)
        self.store.action('finish',{});self.tick()
        self.assertIsNone(self.store.active)
        self.assertEqual(self.store.report()['sessions'][0]['status'],'completed')
    def test_suspend_gap_excluded(self):
        self.store.action('start',{});self.tick(100)
        self.assertEqual(self.store.report()['total'],0)
    def test_camera_coverage_and_expiry(self):
        self.store.action('start',{})
        self.store.action('camera',{'face':True,'centered':True,'posture':True,'blinks':2})
        self.tick();self.assertGreater(self.store.report()['centered'],.9)
        self.store.camera['received']=time.monotonic()-5
        self.tick();report=self.store.report()
        self.assertAlmostEqual(report['face'],1,places=1)
        self.assertAlmostEqual(report['total'],2,places=1)
    def test_invalid_and_duplicate_actions(self):
        with self.assertRaises(ValueError):self.store.action('start',{'goal':-1})
        with self.assertRaises(ValueError):self.store.action('classify',{'category':'inventada'})
        self.store.action('start',{})
        with self.assertRaises(ValueError):self.store.action('start',{})
    def test_restart_preserves_and_marks_interrupted(self):
        self.store.action('start',{});self.tick()
        other=app.Store(self.path)
        try:
            self.assertEqual(other.report()['sessions'][0]['status'],'interrupted')
            self.assertGreater(other.report()['total'],.9)
        finally:other.db.close()
    def test_custom_day_length_and_continuous_session_across_midnight(self):
        self.store.action('start',{'goal':1440});self.assertEqual(self.store.state()['active']['goal'],1440)
        self.store.action('finish',{});self.store.action('start',{'goal':0})
        sid=self.store.active;today=app.D.date.today();yesterday=today-app.D.timedelta(days=1)
        self.store.db.execute('UPDATE sessions SET started=? WHERE id=?',(str(yesterday)+'T23:59:50-03:00',sid))
        for timestamp in (str(yesterday)+'T23:59:55-03:00',str(today)+'T00:00:05-03:00'):
            self.store.db.execute('INSERT INTO samples(session_id,ts,seconds,app,idle,keys,clicks,scroll,blinks) VALUES(?,?,10,?,0,0,0,0,0)',(sid,timestamp,'editor'))
        self.store.db.commit()
        report=self.store.report(str(today));self.assertEqual(report['total'],10)
        self.assertEqual(next(s for s in report['sessions'] if s['id']==sid)['seconds'],10)
        self.assertEqual(self.store.state()['elapsed'],20)
    def test_maintenance_keeps_the_same_session_paused_without_new_capture_consent(self):
        self.store.action('start',{'goal':90});self.tick();before=self.store.state()
        checkpoint={'created':time.time(),'session_id':self.store.active,'started':before['active']['started'],'paused':True}
        self.store.action('finish',{});self.store.resume_maintenance(checkpoint)
        after=self.store.state();self.assertEqual(after['active']['id'],before['active']['id']);self.assertTrue(after['paused'])
        self.assertEqual(after['elapsed'],before['elapsed']);self.assertFalse(after['context']['options']['capture_enabled'])
    def test_distinct_windows_and_per_window_classification(self):
        self.store.action('start',{});self.tick()
        self.store.monitor.title='Documento B';self.store.monitor.window_id='1:bb'
        self.store.monitor.moves=3;self.store.monitor.distance=25
        self.tick()
        self.store.action('classify',{'scope':'window','app':'editor','title':'Documento B','category':'focus'})
        r=self.store.report()
        self.assertEqual(len(r['windows']),2)
        self.assertEqual(r['window_switches'],1)
        self.assertEqual(r['switches'],0)
        self.assertEqual(r['moves'],3);self.assertEqual(r['mouse_distance'],25)
        self.assertEqual(r['apps'][0]['category'],'mixed')
        self.assertAlmostEqual(r['categories']['focus'],1,places=1)
    def test_gaze_and_head_are_independent_and_pose_persists(self):
        self.store.action('start',{})
        self.store.action('camera',{'face':True,'centered':True,'gaze_direction':'right','gaze_x':.9,'gaze_y':0,
            'head_yaw':2,'head_pitch':3,'head_roll':1,'posture':True,'pose_points':33,'trunk_lean':4,'elbow_left':100})
        self.tick();r=self.store.report()
        self.assertGreater(r['gaze_directions']['right'],.9)
        self.assertEqual(r['gaze_directions']['center'],0)
        self.assertGreater(r['centered'],.9);self.assertGreater(r['pose_coverage'],.9)
        row=self.store.db.execute('SELECT * FROM samples').fetchone()
        self.assertEqual(row['elbow_left'],100);self.assertEqual(row['head_yaw'],2)
        self.store.action('camera_off',{});self.tick()
        self.assertAlmostEqual(self.store.report()['gaze_coverage'],1,places=1)
    def test_camera_without_face_still_tracks_body_and_rejects_nonfinite(self):
        self.store.action('start',{})
        self.store.action('camera',{'face':False,'posture':True,'trunk_lean':0,'gaze_direction':'center','gaze_x':0,'gaze_y':0,'head_yaw':0})
        self.tick();r=self.store.report()
        self.assertEqual(r['gaze_coverage'],0);self.assertGreater(r['pose_coverage'],.9)
        with self.assertRaises(ValueError):self.store.action('camera',{'head_yaw':float('nan')})
        with self.assertRaises(ValueError):self.store.action('camera',{'gaze_direction':'inventada'})
    def test_legacy_migration_preserves_old_samples_without_fabricating_new_signals(self):
        old_path=Path(self.tmp.name)/'legacy.db'
        with closing(sqlite3.connect(old_path)) as db:
            db.execute('CREATE TABLE samples(id INTEGER PRIMARY KEY, session_id INTEGER, ts TEXT, seconds REAL, app TEXT, idle REAL, keys INTEGER, clicks INTEGER, scroll INTEGER, face INTEGER, centered INTEGER, posture INTEGER, blinks INTEGER)')
            db.execute('INSERT INTO samples VALUES(1,1,?,10,"old",0,3,1,0,1,1,1,0)',(app.Store.now(),))
            db.commit()
        migrated=app.Store(old_path)
        try:
            r=migrated.report();self.assertEqual(r['total'],10);self.assertEqual(r['keys'],3)
            self.assertEqual(r['gaze_coverage'],0);self.assertEqual(r['windows'],[])
            self.assertEqual(r['pose_coverage'],0)
            self.assertTrue(list(Path(self.tmp.name).glob('legacy.db.before-v3.1-*.bak')))
        finally:migrated.db.close()
    def test_restore_accepts_old_backups_and_preserves_new_camera_window_mouse_fields(self):
        self.store.action('start',{})
        self.store.monitor.moves=2;self.store.monitor.distance=15
        self.store.action('camera',{'face':True,'gaze_direction':'left','gaze_x':-1,'gaze_y':0,'head_yaw':2,'posture':True,'trunk_lean':3})
        self.tick()
        payload={'format':'compasso-backup-v1',**{table:[dict(r) for r in self.store.db.execute('SELECT * FROM '+table)] for table in ('sessions','samples','categories','window_categories','settings')}}
        spec=importlib.util.spec_from_file_location('restore',Path(__file__).resolve().parents[1]/'Restaurar-Backup.py')
        restore_module=importlib.util.module_from_spec(spec);spec.loader.exec_module(restore_module)
        for legacy in (False,True):
            if legacy:
                for row in payload['samples']:
                    for name in app.SAMPLE_EXTENSIONS:row.pop(name,None)
                payload.pop('window_categories',None)
            source=Path(self.tmp.name)/f'backup-{legacy}.json';source.write_text(json.dumps(payload),encoding='utf-8')
            target=Path(self.tmp.name)/f'restored-{legacy}.db'
            with patch.dict(sys.modules,{'app':app}),redirect_stdout(io.StringIO()):
                restore_module.restore(source,target)
                with self.assertRaises(ValueError):restore_module.restore(source,target)
            with closing(sqlite3.connect(target)) as db:
                row=db.execute('SELECT gaze_direction,moves,window_title FROM samples').fetchone()
                self.assertEqual(row,(None,None,None) if legacy else ('left',2,'Documento A'))

class MouseTests(unittest.TestCase):
    def test_signed_multimonitor_positions_distance_and_duplicate_positions(self):
        monitor=app.WindowsMonitor.__new__(app.WindowsMonitor)
        monitor.lock=threading.Lock();monitor.mouse_position=None
        monitor.counts=dict(keys=0,clicks=0,scroll=0,moves=0,mouse_distance=0.0)
        monitor.record_mouse(0x200,-10,0);monitor.record_mouse(0x200,-7,4);monitor.record_mouse(0x200,-7,4)
        monitor.record_mouse(0x201,-7,4);monitor.record_mouse(0x20A,-7,4)
        self.assertEqual(monitor.counts['moves'],1);self.assertEqual(monitor.counts['mouse_distance'],5)
        self.assertEqual(monitor.counts['clicks'],1);self.assertEqual(monitor.counts['scroll'],1)

class ContextTests(unittest.TestCase):
    setUp=StoreTests.setUp
    tearDown=StoreTests.tearDown
    tick=StoreTests.tick
    def wait_analysis(self):
        for _ in range(200):
            if not self.store.context.analysis_busy:return
            time.sleep(.01)
        self.fail('Analysis worker did not finish')
    def create_capture(self):
        self.store.action('start',{'objective':'Estudar circuitos','capture_enabled':True})
        with patch.object(context,'capture_foreground',return_value=context.encode_png(2,2,[b'\0\xff\0'*2]*2)):
            self.store.context._capture(self.store.active)
        return self.store.context.status()['captures'][0]['id']
    def fake_key(self):
        self.store.context.root=Path(self.tmp.name)
        (self.store.context.root/'.env.local').write_text('OPENAI_API_KEY=sk-'+('test_'*10),encoding='utf-8')
    def test_capture_disabled_by_default_and_pause_is_respected(self):
        self.store.action('start',{})
        with patch.object(context,'capture_foreground') as capture:
            self.store.context.last_capture=0;self.store.context.tick();capture.assert_not_called()
            with self.assertRaises(ValueError):self.store.context.request_capture()
        self.store.context.options['capture_enabled']=True;self.store.action('pause',{})
        with patch.object(context,'capture_foreground') as capture:
            self.store.context._capture(self.store.active);capture.assert_not_called()
    def test_credentials_window_is_skipped_and_stopped_capture_is_discarded(self):
        self.store.action('start',{'capture_enabled':True})
        self.store.monitor.title='Entrar na conta'
        with patch.object(context,'capture_foreground') as capture:
            self.store.context._capture(self.store.active);capture.assert_not_called()
        self.store.monitor.title='Documento A'
        def pause_during_capture(_):self.store.paused=True;return b'not-saved'
        with patch.object(context,'capture_foreground',side_effect=pause_during_capture):self.store.context._capture(self.store.active)
        self.assertEqual(self.store.context.status()['captures'],[])
        self.assertEqual(list(self.store.context.images.glob('*.png')),[])
    def test_explicit_upload_consent_successful_review_and_image_erasure(self):
        cid=self.create_capture();self.fake_key()
        with self.assertRaises(ValueError):self.store.context.request_analysis([cid],False,provider='openai')
        review={'summary':'Atividade compatível','alignment':'aligned','evidence':['Editor de circuito visível'],'suggestions':['Concluir uma questão por vez']}
        with patch.object(context,'analyze_images',return_value=(review,{'input_tokens':1,'output_tokens':1})) as analyze:
            self.store.context.request_analysis([cid],True,provider='openai');self.wait_analysis();analyze.assert_called_once()
        status=self.store.context.status();self.assertEqual(status['captures'][0]['status'],'analyzed')
        self.assertFalse(status['captures'][0]['available']);self.assertEqual(status['analyses'][0]['review'],review)
        self.assertEqual(list(self.store.context.images.glob('*.png')),[])
    def test_failed_analysis_preserves_local_image_and_stops_automatic_retry(self):
        cid=self.create_capture();self.fake_key();self.store.context.options['allow_ai_upload']=True
        with patch.object(context,'analyze_images',side_effect=ValueError('Sem créditos')) as analyze:
            self.store.context.request_analysis([cid],True,automatic=True,provider='openai');self.wait_analysis();analyze.assert_called_once()
        status=self.store.context.status();self.assertTrue(status['captures'][0]['available'])
        self.assertFalse(status['options']['allow_ai_upload']);self.assertEqual(status['analyses'],[])
    def test_local_model_works_without_openai_key_and_never_falls_back_to_cloud(self):
        cid=self.create_capture();self.store.context.root=Path(self.tmp.name)
        review={'summary':'Modelo local','alignment':'unclear','evidence':[],'suggestions':['Rever o objetivo']}
        with patch.object(context,'analyze_ollama',return_value=(review,{})) as local,patch.object(context,'analyze_images') as cloud:
            self.store.context.request_analysis([cid],True,provider='ollama');self.wait_analysis();local.assert_called_once();cloud.assert_not_called()
        self.assertEqual(self.store.context.status()['analyses'][0]['model'],'ollama/gemma3:4b')
    def test_local_model_transport_uses_loopback_only(self):
        review={'summary':'Local','alignment':'unclear','evidence':[],'suggestions':[]}
        body={'message':{'content':json.dumps(review)},'prompt_eval_count':10,'eval_count':4}
        response=io.BytesIO(json.dumps(body).encode())
        with patch.object(context.request,'urlopen',return_value=response) as transport:
            result,usage=context.analyze_ollama('Estudar',[b'fake-image'],{},'gemma3:4b')
        req=transport.call_args.args[0];self.assertEqual(req.full_url,'http://127.0.0.1:11434/api/chat')
        self.assertFalse(req.has_header('Authorization'));self.assertEqual(result,review);self.assertEqual(usage['output_tokens'],4)
    def test_image_expiration_and_path_validation(self):
        cid=self.create_capture()
        self.store.db.execute("UPDATE captures SET created='2000-01-01T00:00:00-03:00' WHERE id=?",(cid,));self.store.db.commit()
        self.store.context.expire();self.assertEqual(self.store.context.status()['captures'][0]['status'],'expired')
        self.assertEqual(list(self.store.context.images.glob('*.png')),[])
        with self.assertRaises(ValueError):self.store.context._path('../../secret')
    def test_domain_validation_and_guard_lifecycle(self):
        self.assertEqual(context.normalize_domains('https://www.youtube.com/watch?q=test, ufrpe.br'),['youtube.com','ufrpe.br'])
        with self.assertRaises(ValueError):context.normalize_domains('file:///etc/passwd')
        with self.assertRaises(ValueError):context.normalize_domains('youtube.com/anything')
        with self.assertRaises(ValueError):self.store.action('start',{'guard_enabled':True,'domains':['youtube.com']})
        self.store.context.policy()
        self.store.action('start',{'guard_enabled':True,'domains':['youtube.com']})
        self.assertTrue(self.store.context.policy()['enabled'])
        self.store.action('pause',{});self.assertFalse(self.store.context.policy()['enabled'])
        self.store.action('pause',{});self.assertTrue(self.store.context.policy()['enabled'])
        self.store.action('finish',{});self.assertFalse(self.store.context.policy()['enabled'])

if __name__=='__main__':unittest.main()
