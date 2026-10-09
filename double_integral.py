from manim import *
import numpy as np
from time import perf_counter
import manim as _manim
from manim.camera.three_d_camera import ThreeDCamera

# 出力画質：640×360、15fps
config.pixel_width = 640
config.pixel_height = 360
config.frame_width = 16
config.frame_height = 9
config.frame_rate = 15



class CachedShadingCamera(ThreeDCamera):
    """Manim 0.19.0用。回転中の陰影を入力が一致するときだけ再利用する。"""
    def begin_shading_cache(self):
        self._shading_cache = {}
        self._shading_hits = self._shading_misses = 0
        self._shading_cache_enabled = _manim.__version__ == "0.19.0"

    def end_shading_cache(self):
        print(f"[Cairo cache] hits={self._shading_hits}, misses={self._shading_misses}, enabled={self._shading_cache_enabled}", flush=True)
        self._shading_cache_enabled = False
        self._shading_cache.clear()

    def modified_rgbas(self, vmobject, rgbas):
        if not getattr(self, "_shading_cache_enabled", False):
            return super().modified_rgbas(vmobject, rgbas)
        if not self.should_apply_shading or not vmobject.shade_in_3d or vmobject.get_num_points() == 0:
            return super().modified_rgbas(vmobject, rgbas)
        # 陰影計算が参照する入力すべてを比較する。変形・色・透明度・光源が
        # 変わった場合は再計算。カメラの角度は陰影計算の入力ではない。
        signature = (
            vmobject.points.shape, vmobject.points.dtype.str, vmobject.points.tobytes(),
            rgbas.shape, rgbas.dtype.str, rgbas.tobytes(),
            self.light_source.points[0].tobytes(),
        )
        key = (id(vmobject), rgbas.shape, rgbas.dtype.str, rgbas.tobytes())
        previous = self._shading_cache.get(key)
        if previous is not None and previous[0] is vmobject and previous[1] == signature:
            self._shading_hits += 1
            return previous[2].copy()
        result = super().modified_rgbas(vmobject, rgbas)
        self._shading_misses += 1
        self._shading_cache[key] = (vmobject, signature, result.copy())
        return result


class DoubleIntegralsDecoded(ThreeDScene):
    def __init__(self, **kwargs):
        kwargs.setdefault("camera_class", CachedShadingCamera)
        super().__init__(**kwargs)

    def play(self, *animations, **kwargs):
        start = perf_counter()
        try:
            return super().play(*animations, **kwargs)
        finally:
            names = ", ".join(type(a).__name__ for a in animations)
            print(f"[timing] play {names}: {perf_counter() - start:.2f}s", flush=True)


    # =========================
    # 【パラメータ】Streamlitから上書き可能
    # =========================

    # --- 曲面関数 ---
    formula_str = "2.0 - 0.4*x**2 - 0.35*y**2"

    # --- 積分領域 ---
    x_min, x_max = -2.0, 2.0
    y_min, y_max = -1.5, 1.5

    # --- 分割数 ---
    nx = 8
    ny = 6
    fine_multiplier = 2
    finer_multiplier = 3

    # --- 注目する1マス ---
    target_i = 6
    target_j = 2

    # --- カメラ ---
    phi_deg = 65
    theta_deg = -20
    # 回転中もz軸・曲面・固定表示の数式が見切れない画角にする
    zoom = 0.95

    # --- 配置 ---
    graph_scale = 1.2
    # XYZ軸の交点が画面中央に来る配置
    graph_shift_down = 0.0
    graph_shift_right = 0.0

    # --- 軸 ---
    x_axis_start = -2.8
    x_axis_end = 2.9
    y_axis_start = -2.5
    y_axis_end = 2.6
    z_axis_end = 2.8

    # --- 色 ---
    bg_color = BLACK
    column_color = "#15DCE8"
    block_stroke_color = "#087D85"
    surface_fill_color = "#0B3D45"
    surface_stroke_color = "#66F7FF"
    formula_final_color = "#66F7FF"

    # 柱と最終立体で共通して使うグラデーション
    gradient_center_color = RED
    gradient_edge_color = BLUE

    # --- 最後の連続体（分割数 → 無限大のイメージ） ---
    final_solid_show_time = 1.4
    final_solid_u_res = 48
    final_solid_v_res = 36
    final_solid_fill_opacity = 1.0
    final_solid_stroke_opacity = 0.0

    # --- ラベル位置 ---
    x_label_offset = np.array([0.3, 0, 0])
    y_label_offset = np.array([0, 0.3, 0])
    z_label_offset = np.array([0.6, 0, 0])

    # --- フォントサイズ ---
    title_font_size = 30
    formula_font_size = 30
    label_font_size = 34

    # --- アニメーション時間 ---
    axis_fadein_time = 1.0
    axes_show_wait = 1.0
    surface_show_time = 1.5
    # 最初の曲面は x_min 側の端から x_max 側へ徐々に描く
    surface_wave_lag_ratio = 0.12
    color_change_time = 0.5
    base_square_show_time = 0.5
    column_rise_time = 1.0
    formula_recolor_time = 0.7

    # 粗い柱の出現
    blocks_wave_time = 2.2
    blocks_wave_lag = 0.035

    # 柱を細かくする変形時間
    blocks_swap_time = 1.4

    # 最後に、完成した立体の周囲をカメラが1周する時間
    camera_rotation_time = 4.0

    # =========================
    # 曲面関数
    # =========================
    surface_function = None

    @classmethod
    def configure(
        cls,
        *,
        function=None,
        phi_degrees=None,
        theta_degrees=None,
        zoom=None,
        nx=None,
        ny=None,
        fine_multiplier=None,
        finer_multiplier=None,
        target_i=None,
        target_j=None,
    ):
        """設定済みの新しいSceneクラスを返す。元クラスの設定は変更しない。

        functionには、xとyから高さを返すPython関数を渡す。
        Web入力の文字列をそのままformula_strへ渡さないこと。
        """
        settings = {}
        if function is not None:
            if not callable(function):
                raise ValueError("function must be callable")
            settings["surface_function"] = staticmethod(function)
        for name, value in (
            ("phi_deg", phi_degrees),
            ("theta_deg", theta_degrees),
            ("zoom", zoom),
        ):
            if value is not None:
                value = float(value)
                if not np.isfinite(value) or (name == "zoom" and value <= 0):
                    raise ValueError(f"Invalid {name}")
                settings[name] = value
        for name, value in (
            ("nx", nx),
            ("ny", ny),
            ("fine_multiplier", fine_multiplier),
            ("finer_multiplier", finer_multiplier),
        ):
            if value is not None:
                if isinstance(value, bool) or int(value) != value or value < 1:
                    raise ValueError(f"{name} must be a positive integer")
                settings[name] = int(value)
        for name, value, count_name in (
            ("target_i", target_i, "nx"),
            ("target_j", target_j, "ny"),
        ):
            count = settings.get(count_name, getattr(cls, count_name))
            if value is None:
                value = min(getattr(cls, name), count - 1)
            if isinstance(value, bool) or int(value) != value or not 0 <= value < count:
                raise ValueError(f"{name} must be an index inside the grid")
            settings[name] = int(value)
        return type(f"{cls.__name__}Configured", (cls,), settings)

    @classmethod
    def z_func(cls, x, y):
        if cls.surface_function is not None:
            return cls.surface_function(x, y)
        # 従来のローカル設定との互換用。Web入力には使用しない。
        safe_namespace = {
            "x": x,
            "y": y,
            "np": np,
            "sin": np.sin,
            "cos": np.cos,
            "tan": np.tan,
            "exp": np.exp,
            "log": np.log,
            "sqrt": np.sqrt,
            "pi": np.pi,
            "e": np.e,
            "abs": np.abs,
        }

        cached = cls.__dict__.get("_compiled_formula")
        if cached is None or cached[0] != cls.formula_str:
            cached = (cls.formula_str, compile(cls.formula_str, "<local-formula>", "eval"))
            cls._compiled_formula = cached
        return eval(cached[1], {"__builtins__": {}}, safe_namespace)

    # =========================
    # メイン処理
    # =========================
    def _height_at(self, x, y):
        """同じ座標の高さを、1回の描画内だけ再利用する。"""
        cache = self.__dict__.setdefault("_height_cache", {})
        key = (float(x), float(y))
        if key not in cache:
            cache[key] = self.z_func(x, y)
        return cache[key]

    def construct(self):
        self.camera.background_color = self.bg_color

        self.set_camera_orientation(
            phi=self.phi_deg * DEGREES, theta=self.theta_deg * DEGREES, zoom=self.zoom
        )

        # 派生パラメータ
        self.dx = (self.x_max - self.x_min) / self.nx
        self.dy = (self.y_max - self.y_min) / self.ny

        self.graph_shift = DOWN * self.graph_shift_down + RIGHT * self.graph_shift_right

        # X・Y・Z軸が交わる点は、全体移動後の graph_shift にある。
        # カメラの注視点をここへ合わせることで、この点を支点に周回する。
        self.camera._frame_center.move_to(self.graph_shift)

        # タイトル・数式
        title_group, formula_parts = self._build_title_and_formula()

        int_part, f_part, dxdy_part = formula_parts

        self._show_title_and_formula(title_group, VGroup(*formula_parts))

        # オブジェクト作成
        surface = self._build_surface()
        integral_solid = self._build_integral_solid()

        x_axis, y_axis, z_axis, axes_group = self._build_axes()

        column = self._build_column()

        blocks = self._make_blocks(self.nx, self.ny)

        # 各粗い柱の領域内だけで細分化する。
        # これにより、細分化中に柱が別の場所へスライドしない。
        fine_blocks = self._make_refined_blocks(self.fine_multiplier)

        finer_blocks = self._make_refined_blocks(self.finer_multiplier)

        # 全体配置
        # fine_blocks / finer_blocks は画面には直接追加せず、
        # 後のクロスフェードで表示する
        graph_group = Group(
            surface,
            integral_solid,
            axes_group,
            column,
            blocks,
            fine_blocks,
            finer_blocks,
        )

        graph_group.scale(self.graph_scale)
        graph_group.shift(self.graph_shift)

        # 粗い柱を、下から伸びる前の状態にする
        self._prepare_blocks_grow(blocks)

        # ラベル
        x_label, y_label, z_label = self._build_labels(x_axis, y_axis, z_axis)
        self.axis_labels = VGroup(x_label, y_label, z_label)
        self.axis_labels_visible = True

        # 1本の柱を伸ばす準備
        self._prepare_column_grow(column)

        # 最初の曲面を透明にして先にシーンへ置く
        surface.set_fill(color=self.surface_fill_color, opacity=0)

        surface.set_stroke(color=self.surface_stroke_color, width=1.0, opacity=0)

        column.set_opacity(0)
        blocks.set_opacity(0)

        # 最終立体は構築しても表示直前までシーンに追加せず、透明な数千面を冒頭から描画対象にしない。
        self.add(surface, column, blocks)

        # アニメーション
        self._animate_axes(x_axis, y_axis, z_axis, x_label, y_label, z_label)

        self._animate_surface(surface)

        self._animate_one_column(dxdy_part, f_part, column, int_part)

        self._animate_switch_to_blocks(surface, column, blocks)

        blocks = self._animate_refine_blocks(blocks, fine_blocks, finer_blocks)

        self._animate_to_continuous_solid(blocks, integral_solid)

    # =========================
    # グラデーション関連
    # =========================
    def _gradient_color_at_xy(self, x, y):
        """
        積分領域の中央を赤、外側を青にする。

        柱と最終立体で同じ計算を使うため、
        細分化後もグラデーションが自然に引き継がれる。
        """
        center_x = (self.x_min + self.x_max) / 2
        center_y = (self.y_min + self.y_max) / 2

        half_width = (self.x_max - self.x_min) / 2
        half_height = (self.y_max - self.y_min) / 2

        max_dist = np.hypot(half_width, half_height)

        dist = np.hypot(x - center_x, y - center_y)

        if max_dist == 0:
            t = 0
        else:
            t = np.clip(dist / max_dist, 0, 1)

        return interpolate_color(
            self.gradient_center_color, self.gradient_edge_color, t
        )

    def _apply_gradient_to_surface(self, surface):
        """
        Surfaceを構成する細かな面ごとに色を設定する。

        解像度を高くし、境界線を消すことで、
        滑らかな赤と青のグラデーションに見せる。
        """
        for face in surface:
            center = face.get_center()

            color = self._gradient_color_at_xy(center[0], center[1])

            face.set_fill(color=color, opacity=self.final_solid_fill_opacity)

            face.set_stroke(
                color=color, width=0, opacity=self.final_solid_stroke_opacity
            )

    # =========================
    # 構築系
    # =========================
    def _build_title_and_formula(self):
        title_group = Text(
            "Double Integrals DECODED", font_size=self.title_font_size, color=WHITE
        )

        title_group.to_corner(UL, buff=0.55)

        int_part = MathTex(r"\iint", font_size=self.formula_font_size, color=WHITE)

        f_part = MathTex(r"f(x,y)", font_size=self.formula_font_size, color=WHITE)

        dxdy_part = MathTex(r"dx\,dy", font_size=self.formula_font_size, color=WHITE)

        formula = VGroup(int_part, f_part, dxdy_part).arrange(RIGHT, buff=0.25)

        formula.next_to(title_group, DOWN, buff=0.28)

        formula.align_to(title_group, LEFT)

        title_group.set_opacity(0)
        formula.set_opacity(0)

        return title_group, (int_part, f_part, dxdy_part)

    def _show_title_and_formula(self, title_group, formula):
        self.add_fixed_in_frame_mobjects(title_group)

        self.play(title_group.animate.set_opacity(1), run_time=0.7)

        self.wait(0.15)

        self.add_fixed_in_frame_mobjects(formula)

        self.play(formula.animate.set_opacity(1), run_time=0.7)

    def _build_surface(self):
        def surface_func(u, v):
            return np.array([u, v, self._height_at(u, v)])

        surface = Surface(
            surface_func,
            u_range=[self.x_min, self.x_max],
            v_range=[self.y_min, self.y_max],
            resolution=(self.nx, self.ny),
        )

        surface.set_fill(color=self.surface_fill_color, opacity=0.32)

        surface.set_stroke(color=self.surface_stroke_color, width=1.0, opacity=0.70)

        return surface

    def _build_integral_solid(self):
        """
        z=0とz=f(x,y)に挟まれた体積を、
        上面・下面・4つの側面で閉じた連続立体として作る。

        色は柱と同じ、
        中央が赤・外側が青のグラデーションにする。
        """
        u_res = max(self.final_solid_u_res, self.nx * self.finer_multiplier * 2)

        v_res = max(self.final_solid_v_res, self.ny * self.finer_multiplier * 2)

        def positive_height(x, y):
            return max(0.0, float(self._height_at(x, y)))

        # 上面
        def top_func(u, v):
            return np.array([u, v, positive_height(u, v)])

        # 下面
        def bottom_func(u, v):
            return np.array([u, v, 0])

        # x最小側
        def side_x_min_func(y, s):
            z_top = positive_height(self.x_min, y)

            return np.array([self.x_min, y, s * z_top])

        # x最大側
        def side_x_max_func(y, s):
            z_top = positive_height(self.x_max, y)

            return np.array([self.x_max, y, s * z_top])

        # y最小側
        def side_y_min_func(x, s):
            z_top = positive_height(x, self.y_min)

            return np.array([x, self.y_min, s * z_top])

        # y最大側
        def side_y_max_func(x, s):
            z_top = positive_height(x, self.y_max)

            return np.array([x, self.y_max, s * z_top])

        top_surface = Surface(
            top_func,
            u_range=[self.x_min, self.x_max],
            v_range=[self.y_min, self.y_max],
            resolution=(u_res, v_res),
        )

        bottom_surface = Surface(
            bottom_func,
            u_range=[self.x_min, self.x_max],
            v_range=[self.y_min, self.y_max],
            resolution=(u_res, v_res),
        )

        side_x_min = Surface(
            side_x_min_func,
            u_range=[self.y_min, self.y_max],
            v_range=[0, 1],
            resolution=(v_res, 4),
        )

        side_x_max = Surface(
            side_x_max_func,
            u_range=[self.y_min, self.y_max],
            v_range=[0, 1],
            resolution=(v_res, 4),
        )

        side_y_min = Surface(
            side_y_min_func,
            u_range=[self.x_min, self.x_max],
            v_range=[0, 1],
            resolution=(u_res, 4),
        )

        side_y_max = Surface(
            side_y_max_func,
            u_range=[self.x_min, self.x_max],
            v_range=[0, 1],
            resolution=(u_res, 4),
        )

        surfaces = (
            bottom_surface,
            side_x_min,
            side_x_max,
            side_y_min,
            side_y_max,
            top_surface,
        )

        for surface in surfaces:
            self._apply_gradient_to_surface(surface)

        return VGroup(*surfaces)

    def _build_axes(self):
        """同じデザインでx・y・z軸を作る。"""
        endpoints = (
            ((self.x_axis_start, 0, 0), (self.x_axis_end, 0, 0)),
            ((0, self.y_axis_start, 0), (0, self.y_axis_end, 0)),
            ((0, 0, 0), (0, 0, self.z_axis_end)),
        )
        axes = [
            Arrow3D(
                start=np.array(start),
                end=np.array(end),
                color=WHITE,
                thickness=0.012,
                height=0.13,
                base_radius=0.04,
            )
            for start, end in endpoints
        ]
        return (*axes, Group(*axes))

    def _set_target_cell(self):
        x0 = self.x_min + self.target_i * self.dx
        y0 = self.y_min + self.target_j * self.dy

        self._x0 = x0
        self._y0 = y0

    def _build_column(self):
        self._set_target_cell()

        center_x = self._x0 + self.dx / 2
        center_y = self._y0 + self.dy / 2

        height = max(0.05, float(self._height_at(center_x, center_y)))

        self._column_center = (center_x, center_y, height)

        column = Prism(
            dimensions=[self.dx, self.dy, height],
            fill_color=self.column_color,
            fill_opacity=1.0,
            stroke_width=0,
        )

        column.set_fill(color=self.column_color, opacity=1.0)

        column.set_stroke(opacity=0)

        column.move_to(np.array([center_x, center_y, height / 2]))

        column.set_z_index(10)

        return column

    def _make_block(self, x, y, dx, dy):
        """粗い柱と細分化した柱に共通の形状・色を設定する。"""
        height = max(0.05, float(self._height_at(x, y)))
        block = Prism(
            dimensions=[dx * 0.92, dy * 0.92, height],
            fill_color=self._gradient_color_at_xy(x, y),
            fill_opacity=1.0,
            stroke_color=self.block_stroke_color,
            stroke_width=0.8,
        )
        block.move_to(np.array([x, y, height / 2]))
        return block

    def _make_blocks(self, block_nx, block_ny):
        dx = (self.x_max - self.x_min) / block_nx
        dy = (self.y_max - self.y_min) / block_ny
        return VGroup(
            *[
                self._make_block(
                    self.x_min + i * dx + dx / 2,
                    self.y_min + j * dy + dy / 2,
                    dx,
                    dy,
                )
                for i in range(block_nx)
                for j in range(block_ny)
            ]
        )

    def _make_refined_blocks(self, multiplier):
        """各粗いマスの内部を細分化し、元のグループ順を保つ。"""
        coarse_dx = (self.x_max - self.x_min) / self.nx
        coarse_dy = (self.y_max - self.y_min) / self.ny
        dx, dy = coarse_dx / multiplier, coarse_dy / multiplier
        groups = VGroup()
        for i in range(self.nx):
            for j in range(self.ny):
                x0 = self.x_min + i * coarse_dx
                y0 = self.y_min + j * coarse_dy
                groups.add(
                    VGroup(
                        *[
                            self._make_block(
                                x0 + (sub_i + 0.5) * dx,
                                y0 + (sub_j + 0.5) * dy,
                                dx,
                                dy,
                            )
                            for sub_i in range(multiplier)
                            for sub_j in range(multiplier)
                        ]
                    )
                )
        return groups

    def _build_labels(self, x_axis, y_axis, z_axis):
        x_label = MathTex("x", color=WHITE, font_size=self.label_font_size)

        y_label = MathTex("y", color=WHITE, font_size=self.label_font_size)

        z_label = MathTex("z", color=WHITE, font_size=self.label_font_size)

        x_label.move_to(x_axis.get_end() + self.x_label_offset)

        y_label.move_to(y_axis.get_end() + self.y_label_offset)

        z_label.move_to(z_axis.get_end() + self.z_label_offset)

        self.add_fixed_orientation_mobjects(x_label, y_label, z_label)

        x_label.set_opacity(0)
        y_label.set_opacity(0)
        z_label.set_opacity(0)

        return (x_label, y_label, z_label)

    def _prepare_column_grow(self, column):
        # 計算前の座標から底面を再計算せず、拡大・移動後の
        # 柱そのものから底面の中心を取得する。
        # これにより、黄色の四角と復元後の柱の底面が完全に一致する。
        column_center = column.get_center()
        column_points = column.get_all_points()
        base_z = np.min(column_points[:, 2])

        base_point = np.array([column_center[0], column_center[1], base_z])

        column.save_state()

        column.stretch(0.001, dim=2, about_point=base_point)

        # 最初は「黄色い四角」に見える、ごく薄い柱として置く。
        # 同じ物体をそのまま伸ばすので、板と柱が別々に見えない。
        column.set_fill(YELLOW, opacity=0.55)
        column.set_stroke(YELLOW, width=2.5, opacity=1)

    def _prepare_blocks_grow(self, blocks):
        """
        各ブロックを地面から伸びる前の状態にする。
        """
        for block in blocks:
            center = block.get_center()

            base_point = np.array([center[0], center[1], 0])

            block.save_state()

            block.stretch(0.001, dim=2, about_point=base_point)

            block.set_opacity(0)

    # =========================
    # アニメーション系
    # =========================
    def _animate_axes(self, x_axis, y_axis, z_axis, x_label, y_label, z_label):
        for axis, label in zip((x_axis, y_axis, z_axis), (x_label, y_label, z_label)):
            self.play(
                FadeIn(axis),
                label.animate.set_opacity(1),
                run_time=self.axis_fadein_time,
            )
        self.wait(self.axes_show_wait)

    def _animate_surface(self, surface):
        # 曲面を構成する小面を x 座標順に並べることで、
        # x_min 側の端から反対側へ網が伸びるように出現させる。
        surface_faces = sorted(list(surface), key=lambda face: face.get_center()[0])

        self.play(
            LaggedStart(
                *[
                    face.animate.set_fill(
                        color=self.surface_fill_color, opacity=0.32
                    ).set_stroke(
                        color=self.surface_stroke_color, width=1.0, opacity=0.70
                    )
                    for face in surface_faces
                ],
                lag_ratio=self.surface_wave_lag_ratio,
            ),
            run_time=self.surface_show_time,
        )

        self.wait(0.25)

        # 曲面を描いた後の周回も、正確に1回だけ行う。
        self._orbit_camera_once()

    def _orbit_camera_once(self):
        """
        X・Y・Z軸が交わる点を中心に、カメラだけを水平方向に1周させる。

        ambient rotation は停止するフレームによって終了角度がわずかに
        ずれることがあるため、theta の終了角度を明示して動かす。
        Manim の theta はラジアン指定なので、TAU（2π）で正確に1周させる。
        phi は変更しないので、カメラの高さも一定に保たれる。
        """
        # 最初の回転が始まる直前に、X・Y・Zの文字だけを消す。
        # 軸の線は残し、以降の回転でもラベルは再表示しない。
        if self.axis_labels_visible:
            self.play(FadeOut(self.axis_labels), run_time=0.4)
            self.axis_labels_visible = False

        start_theta = self.camera.theta_tracker.get_value()
        # TAU = 2π rad = 360°（正確に1回転）
        end_theta = start_theta + TAU

        cache_available = isinstance(self.camera, CachedShadingCamera)
        if cache_available:
            self.camera.begin_shading_cache()
        try:
            self.play(
                self.camera.theta_tracker.animate.set_value(end_theta),
                run_time=self.camera_rotation_time,
                rate_func=smooth,
            )
        finally:
            if cache_available:
                self.camera.end_shading_cache()

        # 浮動小数点の補間誤差を残さず、必ず1回転後の角度に固定する。
        self.camera.theta_tracker.set_value(end_theta)

    def _animate_one_column(self, dxdy_part, f_part, column, int_part):
        # dxdyを黄色にする
        self.play(dxdy_part.animate.set_color(YELLOW), run_time=self.color_change_time)

        # 薄くつぶした柱を表示するため、黄色い四角に見える
        self.play(column.animate.set_opacity(1), run_time=self.base_square_show_time)

        self.wait(0.2)

        # f(x,y)をピンクにする
        self.play(f_part.animate.set_color(PINK), run_time=self.color_change_time)

        # 黄色い四角そのものを、同じ底面の青い柱へ立体化する
        self.play(Restore(column), run_time=self.column_rise_time)

        self.wait(0.3)

        # 式全体を水色にする
        self.play(
            int_part.animate.set_color(self.formula_final_color),
            f_part.animate.set_color(self.formula_final_color),
            dxdy_part.animate.set_color(self.formula_final_color),
            run_time=self.formula_recolor_time,
        )

    def _animate_blocks_wave(self, blocks, column):
        """
        粗い柱を中央から外側へ、
        波のように立ち上げる。
        """
        center_point = blocks.get_center()

        target_index = self.target_i * self.ny + self.target_j
        target_block = blocks[target_index]

        ordered_blocks = sorted(
            [block for index, block in enumerate(blocks) if index != target_index],
            key=lambda block: np.linalg.norm((block.get_center() - center_point)[:2]),
        )

        # 注目した1本は消さずに、柱集合の同じ位置の柱へ接続する。
        # 周囲の柱だけを中央から外側へ順に立ち上げる。
        target_block.restore()
        target_block.set_opacity(1)

        self.play(
            ReplacementTransform(column, target_block),
            LaggedStart(
                *[Restore(block) for block in ordered_blocks],
                lag_ratio=self.blocks_wave_lag,
            ),
            run_time=self.blocks_wave_time,
            rate_func=smooth,
        )

    def _animate_switch_to_blocks(self, surface, column, blocks):
        # 曲面だけを消し、注目した柱は残す
        self.play(FadeOut(surface), run_time=0.3)

        self.remove(surface)

        # 1本の柱を起点に、周囲の柱を立ち上げる
        self._animate_blocks_wave(blocks, column)

        self.wait(0.3)

    def _animate_refine_blocks(self, blocks, fine_blocks, finer_blocks):
        """
        参考動画と同じように、粗い柱と細かい柱を短時間重ねて
        クロスフェードする。

        Transformを使わないため柱は横滑りせず、同じ積分領域の中で
        分割数だけが自然に増えたように見える。
        """
        self.play(
            FadeOut(blocks),
            FadeIn(fine_blocks),
            run_time=self.blocks_swap_time,
            rate_func=smooth,
        )

        self.remove(blocks)

        self.wait(0.3)

        self.play(
            FadeOut(fine_blocks),
            FadeIn(finer_blocks),
            run_time=self.blocks_swap_time,
            rate_func=smooth,
        )

        self.remove(fine_blocks)

        self.wait(0.5)

        # 最終立体への変化では、現在表示中の最も細かい柱を使う。
        return finer_blocks

    def _animate_to_continuous_solid(self, blocks, integral_solid):
        """
        さらに細かい柱から、
        分割数を無限大にした極限として、
        隙間のない不透明な連続立体へ移る。

        最終立体にも柱と同じ、
        赤→青のグラデーションを使用する。
        """
        # Restoreをアニメーションとして実行すると、透明状態からの補間時に
        # Surfaceの面ごとの色が失われ、単色に見えることがある。
        # 先に完成状態（面ごとの赤青グラデーション）へ戻し、
        # その完成状態そのものをFadeInする。
        # 元の色・形状のままFadeInする。非表示用の複製・復元は不要。

        self.play(
            FadeOut(blocks),
            FadeIn(integral_solid),
            run_time=self.final_solid_show_time,
            rate_func=smooth,
        )

        self.remove(blocks)

        self.wait(0.2)

        # 図は固定したまま、カメラが図の中心を向いて周囲を1周する。
        self._orbit_camera_once()

        self.wait(1.2)


# Streamlit連携時の呼び出し例（描画はリクエストごとに別プロセスで実行）:
# Scene = DoubleIntegralsDecoded.configure(
#     function=lambda x, y: 2.0 - 0.4*x**2 - 0.35*y**2,
#     nx=8, ny=6, phi_degrees=65, theta_degrees=-20,
# )
# with tempconfig({"output_file": "double_integrals.mp4", "media_dir": "output"}):
#     Scene().render()
#
# 通常の実行（ファイルをdouble_integrals.pyとして保存した場合）:
# python -m manim --renderer=cairo double_integrals.py DoubleIntegralsDecoded
