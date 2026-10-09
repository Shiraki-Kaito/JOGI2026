"""各リクエストを独立プロセスで描画する。"""
import json
import sys
from pathlib import Path
from formula import parse_formula

def main():
    settings = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    function = parse_formula(settings['formula'])
    from manim import tempconfig
    if settings['kind'] == 'double':
        from double_integral import DoubleIntegralsDecoded
        print('[renderer] Cairo / shading-cache trial', flush=True)
        scene = DoubleIntegralsDecoded.configure(function=function, nx=settings['nx'], ny=settings['ny'], phi_degrees=settings['phi'], theta_degrees=settings['theta'], zoom=settings['zoom'])
    elif settings['kind'] == 'iterated':
        from iterated_integral import IteratedIntegrals
        base = IteratedIntegrals
        scene = type('ConfiguredIterated', (base,), {})
        scene.configure(function=function, nx=settings['nx'], ny=settings['ny'], phi_degrees=settings['phi'], theta_degrees=settings['theta'], zoom=settings['zoom'], output_file_name='animation.mp4')
    else:
        raise ValueError('Unknown animation')
    width, height, fps = settings['quality']
    # 元ファイルのconfig設定を読み込んだ後に画質を設定する。
    with tempconfig({'renderer': 'cairo', 'media_dir': str(Path(sys.argv[1]).parent / 'media'), 'output_file': 'animation.mp4', 'pixel_width': width, 'pixel_height': height, 'frame_rate': fps, 'disable_caching': True, 'write_to_movie': True, 'save_last_frame': False}):
        instance = scene()
        instance.render()
        output = Path(instance.renderer.file_writer.movie_file_path)
    if not output.is_file():
        raise RuntimeError('動画ファイルが生成されませんでした。')
    (Path(sys.argv[1]).parent / 'result.txt').write_text(str(output), encoding='utf-8')

if __name__ == '__main__':
    main()
