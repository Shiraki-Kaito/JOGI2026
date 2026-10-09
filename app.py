import json
import subprocess
import sys
import tempfile
from pathlib import Path
import streamlit as st
from formula import parse_formula
from process_runner import run_render, RenderFailure

ROOT = Path(__file__).resolve().parent
st.set_page_config(page_title='積分アニメーション', page_icon='📐', layout='centered')
st.title('積分アニメーション')
st.write('関数や分割数、視点を変えて、Manimの動画を作成します。')
choices = {'二重積分': ('double', 8, 6), '累次積分': ('iterated', 16, 12)}
label = st.selectbox('アニメーション', list(choices))
kind, default_nx, default_ny = choices[label]
with st.form('settings'):
    formula = st.text_input('関数 f(x, y)', '2.0 - 0.4*x**2 - 0.35*y**2')
    st.caption('積分領域：−2 ≤ x ≤ 2、−1.5 ≤ y ≤ 1.5。高さは−1〜2.5。例：1 + 0.4*cos(x)*cos(y)')
    st.caption('元の動画では、負の高さを柱の描画時に0付近に切り上げます。符号付き積分には対応していません。')
    a, b = st.columns(2)
    nx = a.number_input('x方向の分割数', 2, 50, default_nx, key=f'nx_{kind}')
    ny = b.number_input('y方向の分割数', 2, 40, default_ny, key=f'ny_{kind}')
    count = nx * ny
    st.caption('二重積分は動画内で縦横2倍・3倍に細分化します。入力は「動画を作成」で反映されます。')
    phi = st.slider('上から見る角度 φ（度）', 15, 85, 65)
    theta = st.slider('水平方向の角度 θ（度）', -180, 180, -20)
    zoom = st.slider('拡大率', 0.5, 1.3, 0.95, 0.05)
    quality_label = st.selectbox('画質', ['360p / 15fps（確認用）', '720p / 30fps'])
    submit = st.form_submit_button('動画を作成', type='primary')
quality = [640, 360, 15] if quality_label.startswith('360') else [1280, 720, 30]
settings = dict(kind=kind, formula=formula, nx=int(nx), ny=int(ny), phi=phi, theta=theta, zoom=zoom, quality=quality)
if submit:
    st.session_state.pop('error_log', None)
    st.session_state.pop('render_log', None)
    try:
        parse_formula(formula)
        if count > (150 if kind == 'double' else 1600):
            raise ValueError('分割数が多すぎます。二重積分は合計150本、累次積分は1600本以下にしてください。')
        import importlib.util
        import shutil
        if importlib.util.find_spec('manim') is None:
            raise RuntimeError('ManimがこのPython環境にありません。python -m pip install -r requirements.txt を実行してください。')
        if shutil.which('latex') is None or shutil.which('dvisvgm') is None:
            raise RuntimeError('LaTeXまたはdvisvgmが見つかりません。READMEの環境設定を確認してください。')
        import time
        started = time.monotonic()
        with st.spinner('動画を生成しています。数分かかる場合があります。'):
            with tempfile.TemporaryDirectory(prefix='manim_job_') as folder:
                job = Path(folder)
                config_file = job / 'settings.json'
                config_file.write_text(json.dumps(settings), encoding='utf-8')
                try:
                    log_text = run_render(
                        [sys.executable, '-u', str(ROOT / 'render_worker.py'), str(config_file)],
                        cwd=job, log_path=job / 'render.log')
                except RenderFailure as exc:
                    st.session_state['render_log'] = exc.log
                    raise
                st.session_state['render_log'] = log_text
                output = Path((job / 'result.txt').read_text(encoding='utf-8'))
                st.session_state['video'] = output.read_bytes()
                st.session_state['video_settings'] = settings
                st.session_state.pop('error_log', None)
        st.session_state['elapsed'] = time.monotonic() - started
        st.success('動画が完成しました。')
    except (ValueError, RuntimeError, OSError) as exc:
        st.error(str(exc))
if 'render_log' in st.session_state:
    log_text = st.session_state['render_log']
    with st.expander('処理時間の詳細'):
        timing = [line for line in log_text.splitlines() if '[timing]' in line or '[Cairo cache]' in line]
        if timing:
            st.code('\n'.join(timing))
        else:
            st.caption('処理時間の記録はありません。詳細ログを確認してください。')
    with st.expander('詳細ログ'):
        st.code(log_text[-24000:])
        st.download_button('ログをダウンロード', log_text, 'render.log', 'text/plain', on_click='ignore')
if 'video' in st.session_state:
    st.subheader('生成した動画')
    old = st.session_state['video_settings']
    st.caption(f"生成時の設定：f(x,y) = {old['formula']} ／ 分割 {old['nx']} × {old['ny']} ／ φ {old['phi']}° ／ θ {old['theta']}°")
    st.caption(f"柱の数：{old['nx'] * old['ny']:,}本 ／ 生成時間：{st.session_state.get('elapsed', 0):.1f}秒")
    if old != settings:
        st.info('表示中の動画は前回生成した設定のものです。現在の設定で作成するには「動画を作成」を押してください。')
    st.video(st.session_state['video'])
    st.download_button('MP4をダウンロード', st.session_state['video'], file_name=f"{old['kind']}_integral.mp4", mime='video/mp4', on_click='ignore')
    st.download_button('設定をダウンロード', json.dumps(old, ensure_ascii=False, indent=2), file_name='settings.json', mime='application/json', on_click='ignore')
