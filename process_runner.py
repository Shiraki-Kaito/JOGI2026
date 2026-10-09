"""描画プロセスを監視し、例外・時間切れ時に子プロセスも停止する。"""
import os
import signal
import subprocess
import time
from pathlib import Path

class RenderFailure(RuntimeError):
    def __init__(self, message, log):
        super().__init__(message)
        self.log = log


def stop_tree(process):
    if os.name == 'nt':
        subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                       timeout=10, check=False)
    else:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()


def run_render(command, cwd, log_path, timeout=1800):
    log_path = Path(log_path)
    cursor = 0
    tail = ''
    process = None
    started = time.monotonic()
    try:
        with log_path.open('wb') as output:
            process = subprocess.Popen(command, cwd=cwd, stdout=output,
                stderr=subprocess.STDOUT, start_new_session=os.name != 'nt',
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0)
            with log_path.open('rb') as reader:
                while True:
                    reader.seek(cursor)
                    chunk = reader.read()
                    cursor += len(chunk)
                    tail = (tail + chunk.decode('utf-8', errors='replace'))[-16000:]
                    if 'Traceback (most recent call last)' in tail or '[RENDER_ERROR]' in tail:
                        stop_tree(process)
                        raise RenderFailure('動画生成でエラーが発生したため、処理を終了しました。詳細ログを確認してください。', log_path.read_text(encoding='utf-8', errors='replace'))
                    code = process.poll()
                    if code is not None:
                        log = log_path.read_text(encoding='utf-8', errors='replace')
                        if code:
                            raise RenderFailure(f'動画生成に失敗しました（終了コード {code}）。詳細ログを確認してください。', log)
                        return log
                    if time.monotonic() - started >= timeout:
                        stop_tree(process)
                        raise RenderFailure('動画生成が制限時間の30分を超えたため、処理を終了しました。', log_path.read_text(encoding='utf-8', errors='replace'))
                    time.sleep(0.1)
    finally:
        if process is not None and process.poll() is None:
            stop_tree(process)
