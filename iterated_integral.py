from dataclasses import dataclass

import numpy as np
from time import perf_counter
from manim import *


# 実行例:
# python -m manim --renderer=cairo --disable_caching iterated_integral.py
config.pixel_width = 640
config.pixel_height = 360
config.frame_width = 16
config.frame_height = 9
config.frame_rate = 15
config.background_color = BLACK
config.disable_caching = True


@dataclass(frozen=True)
class PassSettings:
    """設定"""

    inner_color: str
    outer_color: str
    inner_arrow: Mobject
    outer_arrow: Mobject
    inner_lag: float
    outer_lag: float


class SolidAxes(VGroup):
    """固定表示の座標軸"""

    # 以前の動画と同じく、x・y・zを同じ倍率で表示する。
    # これにより積分領域の底面は、座標範囲どおり横4：縦3になる。
    UNITS = np.array([1.2, 1.2, 1.2])
    OFFSET = np.array([0.0, 0.0, 0.0])

    @classmethod
    def c2p(cls, x, y, z=0):
        return np.array([x, y, z]) * cls.UNITS + cls.OFFSET

    def __init__(self):
        endpoints = [
            ((-2.8, 0, 0), (2.9, 0, 0)),
            ((0, -2.5, 0), (0, 2.6, 0)),
            ((0, 0, 0), (0, 0, 2.8)),
        ]
        super().__init__(
            *[
                Arrow3D(
                    start=self.c2p(*start),
                    end=self.c2p(*end),
                    color=WHITE,
                    thickness=0.012,
                    height=0.13,
                    base_radius=0.04,
                    resolution=8,
                )
                for start, end in endpoints
            ]
        )


class SolidColumnCamera(ThreeDCamera):
    """柱単位の奥行き順を保ち、不透明な細い柱を正しく重ねる"""

    def get_mobjects_to_display(self, *args, **kwargs):
        objects = super().get_mobjects_to_display(*args, **kwargs)
        rotation = self.get_rotation_matrix()

        # カメラ角度ごとに、同じ柱の6面で共通する底面深度を1回だけ計算。
        column_depths = {}

        def draw_key(mob):
            anchor = getattr(mob, "column_floor_anchor", None)
            if anchor is None:
                return (0, 0.0, 0.0)
            key = tuple(anchor)
            if key not in column_depths:
                column_depths[key] = float(np.dot(anchor, rotation.T)[2])
            column_depth = column_depths[key]
            face_depth = float(np.dot(mob.get_center(), rotation.T)[2])
            return (1, column_depth, face_depth)

        return sorted(objects, key=draw_key)


class IteratedIntegrals(ThreeDScene):
    def play(self, *animations, **kwargs):
        start = perf_counter()
        try:
            return super().play(*animations, **kwargs)
        finally:
            names = ", ".join(type(a).__name__ for a in animations)
            print(f"[timing] play {names}: {perf_counter() - start:.2f}s", flush=True)


    """通常版：2通りの累次積分を直方体の列で表現する"""

    # ------------------------------------------------------------------
    # Streamlitから変更する主要設定
    # ------------------------------------------------------------------
    OUTPUT_FILE_NAME = "iterated_integrals_video1.mp4"
    SURFACE_FUNCTION = staticmethod(
        lambda x, y: 2.0 - 0.4 * x**2 - 0.35 * y**2
    )
    X_MIN, X_MAX = -2.0, 2.0
    Y_MIN, Y_MAX = -1.5, 1.5
    NX, NY = 16, 12
    FINAL_SMOOTH = False

    CAMERA_PHI_DEGREES = 65.0
    CAMERA_THETA_DEGREES = -20.0
    CAMERA_ZOOM = 0.95
    CAMERA_VERTICAL_OFFSET = 0.45

    # ------------------------------------------------------------------
    # 表示設定
    # ------------------------------------------------------------------
    X_COLOR = "#EF3340"
    Y_COLOR = "#22C55E"
    FILLED_COLOR = "#3B82F6"
    REGION_COLOR = "#68D7E8"
    CELL_STROKE_WIDTH = 0.06

    DIRECTION_ARROW_GAP = 0.40
    DIRECTION_ARROW_HEIGHT = 0.08
    DIRECTION_ARROW_THICKNESS = 0.016
    DIRECTION_ARROW_HEAD_LENGTH = 0.12
    DIRECTION_ARROW_HEAD_RADIUS = 0.04

    # ------------------------------------------------------------------
    # アニメーション時間（秒）
    # ------------------------------------------------------------------
    AXIS_FADE_TIME = 1.0
    AXES_HOLD_TIME = 1.0
    REGION_BORDER_FADE_TIME = 0.5
    WIREFRAME_DRAW_TIME = 1.5
    WIREFRAME_HOLD_TIME = 0.25
    LABEL_FADE_TIME = 0.4
    WIREFRAME_FADE_TIME = 0.5

    INNER_ARROW_FADE_TIME = 0.8
    OUTER_ARROW_FADE_TIME = 0.5
    COLUMN_GROW_TIME = 2.2
    COLUMN_LAG_RATIO = 0.035
    COLUMN_HOLD_TIME = 0.4
    RECOLOR_TIME = 0.8
    BETWEEN_STAGES_HOLD_TIME = 0.2
    COMPLETED_VOLUME_HOLD_TIME = 1.5

    FIRST_VOLUME_FADE_TIME = 1.0
    BETWEEN_PASSES_HOLD_TIME = 0.8
    SMOOTH_TRANSITION_TIME = 1.4
    SMOOTH_HOLD_TIME = 1.5
    FINAL_ROTATION_TIME = 4.0
    FINAL_HOLD_TIME = 0.5

    def __init__(self, **kwargs):
        config.output_file = self.OUTPUT_FILE_NAME
        kwargs["camera_class"] = SolidColumnCamera
        super().__init__(**kwargs)

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
        output_file_name=None,
    ):
        """Streamlitなどの外部UIから主要設定を更新する。"""
        if function is not None:
            cls.SURFACE_FUNCTION = staticmethod(function)
        if phi_degrees is not None:
            cls.CAMERA_PHI_DEGREES = float(phi_degrees)
        if theta_degrees is not None:
            cls.CAMERA_THETA_DEGREES = float(theta_degrees)
        if zoom is not None:
            zoom = float(zoom)
            if zoom <= 0:
                raise ValueError("zoom must be greater than 0")
            cls.CAMERA_ZOOM = zoom
        if nx is not None:
            nx = int(nx)
            if nx < 1:
                raise ValueError("nx must be at least 1")
            cls.NX = nx
        if ny is not None:
            ny = int(ny)
            if ny < 1:
                raise ValueError("ny must be at least 1")
            cls.NY = ny
        if output_file_name is not None:
            cls.OUTPUT_FILE_NAME = str(output_file_name)

    def get_moving_mobjects(self, *animations):
        return list(self.mobjects)

    @classmethod
    def f(cls, x, y):
        return cls.SURFACE_FUNCTION(x, y)

    def region_corners(self, axes):
        """積分領域の四隅を、反時計回りに返す"""
        return [
            axes.c2p(x, y, 0)
            for x, y in [
                (self.X_MIN, self.Y_MIN),
                (self.X_MAX, self.Y_MIN),
                (self.X_MAX, self.Y_MAX),
                (self.X_MIN, self.Y_MAX),
            ]
        ]

    def _height_at(self, x, y):
        """2通りの積分順序・曲面で同じ高さ計算を再利用する。"""
        cache = self.__dict__.setdefault("_height_cache", {})
        key = (float(x), float(y))
        if key not in cache:
            cache[key] = self.f(x, y)
        return cache[key]

    def make_wireframe_surface(self, axes):
        """曲面の網の設定"""
        return Surface(
            lambda u, v: axes.c2p(u, v, self._height_at(u, v)),
            u_range=[self.X_MIN, self.X_MAX],
            v_range=[self.Y_MIN, self.Y_MAX],
            resolution=(28, 22),
            checkerboard_colors=False,
            fill_color="#123D45",
            fill_opacity=0.0,
            stroke_color=self.REGION_COLOR,
            stroke_opacity=0.65,
            stroke_width=0.55,
        )

    def make_region_border(self, axes):
        """xy平面上の積分領域の枠を作る"""
        return Polygon(
            *self.region_corners(axes),
            color=self.REGION_COLOR,
            fill_opacity=0,
            stroke_width=2.2,
        )

    def make_sample_grid(self):
        """直方体の幅と、各直方体の中心座標を返す"""
        dx = (self.X_MAX - self.X_MIN) / self.NX
        dy = (self.Y_MAX - self.Y_MIN) / self.NY
        xs = np.linspace(
            self.X_MIN + dx / 2,
            self.X_MAX - dx / 2,
            self.NX,
        )
        ys = np.linspace(
            self.Y_MIN + dy / 2,
            self.Y_MAX - dy / 2,
            self.NY,
        )
        return dx, dy, xs, ys

    def make_cell(self, axes, x, y, dx, dy, color):
        height = max(self._height_at(x, y), 0.001)
        cell = Prism(
            dimensions=[
                dx * axes.UNITS[0],
                dy * axes.UNITS[1],
                height * axes.UNITS[2],
            ],
            fill_color=color,
            fill_opacity=1.0,
            stroke_color=color,
            stroke_width=self.CELL_STROKE_WIDTH,
        )
        cell.move_to(axes.c2p(x, y, height / 2))
        floor_anchor = axes.c2p(x, y, 0).copy()
        cell.column_floor_anchor = floor_anchor
        for face in cell:
            face.column_floor_anchor = floor_anchor.copy()
            face.set_fill(color, opacity=1.0)
            face.set_stroke(
                color, width=self.CELL_STROKE_WIDTH, opacity=1.0
            )
        return cell

    def make_y_sheet(self, axes, x, y_values, dx, dy, color):
        return VGroup(
            *[
                self.make_cell(axes, x, y, dx, dy, color)
                for y in y_values
            ]
        )

    def make_x_sheet(self, axes, y, x_values, dx, dy, color):
        return VGroup(
            *[
                self.make_cell(axes, x, y, dx, dy, color)
                for x in x_values
            ]
        )

    def make_volume_sheets(self, axes, order, xs, ys, dx, dy):
        if order == "y_then_x":
            # xsは昇順なので、外側はx_min→x_maxへ進む
            return VGroup(
                *[
                    self.make_y_sheet(
                        axes, x, ys, dx, dy, self.FILLED_COLOR
                    )
                    for x in xs
                ]
            )

        # ysは昇順なので、外側はy_min→y_maxへ進む
        return VGroup(
            *[
                self.make_x_sheet(
                    axes, y, xs, dx, dy, self.FILLED_COLOR
                )
                for y in ys
            ]
        )

    def make_smooth_solid(self, axes):
        """格子線のない曲面と側面で、滑らかな青い立体を作る"""

        def height(x, y):
            return max(self._height_at(x, y), 0.0)

        surface_style = dict(
            checkerboard_colors=False,
            fill_color=self.FILLED_COLOR,
            fill_opacity=1.0,
            stroke_color=self.FILLED_COLOR,
            stroke_opacity=0.0,
            stroke_width=0.0,
        )

        def surface(function, u_range, v_range, resolution):
            return Surface(
                function,
                u_range=u_range,
                v_range=v_range,
                resolution=resolution,
                **surface_style,
            )

        top = surface(
            lambda u, v: axes.c2p(u, v, height(u, v)),
            [self.X_MIN, self.X_MAX],
            [self.Y_MIN, self.Y_MAX],
            (64, 48),
        )

        def side_at_y(y):
            return surface(
                lambda u, v: axes.c2p(u, y, v * height(u, y)),
                [self.X_MIN, self.X_MAX],
                [0, 1],
                (64, 2),
            )

        def side_at_x(x):
            return surface(
                lambda u, v: axes.c2p(x, u, v * height(x, u)),
                [self.Y_MIN, self.Y_MAX],
                [0, 1],
                (48, 2),
            )

        front = side_at_y(self.Y_MIN)
        back = side_at_y(self.Y_MAX)
        left = side_at_x(self.X_MIN)
        right = side_at_x(self.X_MAX)
        base = Polygon(
            *self.region_corners(axes),
            fill_color=self.FILLED_COLOR,
            fill_opacity=1.0,
            stroke_opacity=0.0,
        )
        return VGroup(base, front, back, left, right, top)

    def recolor(self, mobject, color):
        return (
            mobject.animate.set_fill(color, opacity=1.0)
            .set_stroke(
                color, width=self.CELL_STROKE_WIDTH, opacity=1.0
            )
        )

    def make_arrow(self, axes, start, end, color):
        """共通デザインの3D矢印を作る。"""
        return Arrow3D(
            start=axes.c2p(*start),
            end=axes.c2p(*end),
            color=color,
            thickness=self.DIRECTION_ARROW_THICKNESS,
            height=self.DIRECTION_ARROW_HEAD_LENGTH,
            base_radius=self.DIRECTION_ARROW_HEAD_RADIUS,
            resolution=8,
        )

    def make_direction_arrow(self, axes, direction, side="negative"):
        """対応する底面の辺と同じ長さの方向矢印を作る。"""
        z = self.DIRECTION_ARROW_HEIGHT
        gap = self.DIRECTION_ARROW_GAP

        if direction == "x":
            y = self.Y_MIN - gap
            return self.make_arrow(
                axes,
                (self.X_MIN, y, z),
                (self.X_MAX, y, z),
                self.X_COLOR,
            )

        if direction == "y":
            x = self.X_MAX + gap if side == "positive" else self.X_MIN - gap
            return self.make_arrow(
                axes,
                (x, self.Y_MIN, z),
                (x, self.Y_MAX, z),
                self.Y_COLOR,
            )

        raise ValueError(f"Unknown direction: {direction}")

    def make_pass_settings(self, axes, order):
        """積分順序ごとの色・矢印・アニメーション設定をまとめる"""
        if order == "x_then_y":
            return PassSettings(
                inner_color=self.X_COLOR,
                outer_color=self.Y_COLOR,
                inner_arrow=self.make_direction_arrow(axes, "x"),
                outer_arrow=self.make_direction_arrow(
                    axes, "y", side="positive"
                ),
                inner_lag=self.COLUMN_LAG_RATIO,
                outer_lag=self.COLUMN_LAG_RATIO,
            )

        if order == "y_then_x":
            return PassSettings(
                inner_color=self.Y_COLOR,
                outer_color=self.X_COLOR,
                inner_arrow=self.make_direction_arrow(
                    axes, "y", side="negative"
                ),
                outer_arrow=self.make_direction_arrow(axes, "x"),
                inner_lag=self.COLUMN_LAG_RATIO,
                outer_lag=self.COLUMN_LAG_RATIO,
            )

        raise ValueError(f"Unknown integration order: {order}")

    @staticmethod
    def prepare_columns_for_growth(columns):
        """以前の動画と同じく、柱を底面まで潰してRestoreに備える"""
        for column in columns:
            column.save_state()
            column.stretch(
                0.001,
                dim=2,
                about_point=column.column_floor_anchor,
            )
            column.set_opacity(0)

    def prepare_volume(self, axes, order, xs, ys, dx, dy, settings):
        """指定された積分順序の直方体群を作り、初期色を設定する"""
        sheets = self.make_volume_sheets(axes, order, xs, ys, dx, dy)
        first = sheets[0]
        remaining = VGroup(*sheets[1:])

        first.set_fill(settings.inner_color, opacity=1.0)
        first.set_stroke(
            settings.inner_color,
            width=self.CELL_STROKE_WIDTH,
            opacity=1.0,
        )
        remaining.set_fill(settings.outer_color, opacity=1.0)
        remaining.set_stroke(
            settings.outer_color,
            width=self.CELL_STROKE_WIDTH,
            opacity=1.0,
        )
        return first, remaining, VGroup(first, remaining)

    def animate_integration_pass(self, axes, order, xs, ys, dx, dy):
        """1つの積分順序について、矢印と直方体群を順に表示する"""
        settings = self.make_pass_settings(axes, order)
        first, remaining, volume = self.prepare_volume(
            axes,
            order,
            xs,
            ys,
            dx,
            dy,
            settings,
        )
        inner_arrow = settings.inner_arrow
        outer_arrow = settings.outer_arrow

        # 以前の動画と同じ、底面から立ち上がる柱アニメーションにする。
        self.prepare_columns_for_growth(first)

        self.play(
            FadeIn(inner_arrow),
            run_time=self.INNER_ARROW_FADE_TIME,
        )
        self.play(
            LaggedStart(
                *[Restore(cell) for cell in first],
                lag_ratio=settings.inner_lag,
            ),
            run_time=self.COLUMN_GROW_TIME,
            rate_func=smooth,
        )
        self.wait(self.COLUMN_HOLD_TIME)
        self.play(
            FadeOut(inner_arrow),
            self.recolor(first, settings.outer_color),
            run_time=self.RECOLOR_TIME,
        )
        self.wait(self.BETWEEN_STAGES_HOLD_TIME)

        self.play(
            FadeIn(outer_arrow),
            run_time=self.OUTER_ARROW_FADE_TIME,
        )
        remaining_columns = [
            cell
            for sheet in remaining
            for cell in sheet
        ]
        self.prepare_columns_for_growth(remaining_columns)
        self.play(
            LaggedStart(
                *[Restore(cell) for cell in remaining_columns],
                lag_ratio=settings.outer_lag,
            ),
            run_time=self.COLUMN_GROW_TIME,
            rate_func=smooth,
        )

        self.wait(self.COLUMN_HOLD_TIME)
        self.play(
            FadeOut(outer_arrow),
            self.recolor(volume, self.FILLED_COLOR),
            run_time=self.RECOLOR_TIME,
        )
        self.wait(self.COMPLETED_VOLUME_HOLD_TIME)
        return first, remaining, volume

    @staticmethod
    def make_axis_labels(axes):
        """以前の動画と同じ位置に、x・y・zの文字を作る"""
        x_label = MathTex("x", color=WHITE, font_size=34)
        y_label = MathTex("y", color=WHITE, font_size=34)
        z_label = MathTex("z", color=WHITE, font_size=34)

        x_label.move_to(axes.c2p(2.9, 0, 0) + np.array([0.3, 0, 0]))
        y_label.move_to(axes.c2p(0, 2.6, 0) + np.array([0, 0.3, 0]))
        z_label.move_to(axes.c2p(0, 0, 2.8) + np.array([0.6, 0, 0]))
        return VGroup(x_label, y_label, z_label)

    def show_intro(self, axes):
        """座標軸と曲面の網を表示する冒頭部分"""
        wireframe = self.make_wireframe_surface(axes)
        region_border = self.make_region_border(axes)
        axis_labels = self.make_axis_labels(axes)

        # 文字がカメラ方向を向いたままになるように固定する。
        self.add_fixed_orientation_mobjects(*axis_labels)
        axis_labels.set_opacity(0)

        # 以前の動画と同じタイミングで、x→y→zの順に表示する。
        self.play(
            FadeIn(axes[0]),
            axis_labels[0].animate.set_opacity(1),
            run_time=self.AXIS_FADE_TIME,
        )
        self.play(
            FadeIn(axes[1]),
            axis_labels[1].animate.set_opacity(1),
            run_time=self.AXIS_FADE_TIME,
        )
        self.play(
            FadeIn(axes[2]),
            axis_labels[2].animate.set_opacity(1),
            run_time=self.AXIS_FADE_TIME,
        )
        self.wait(self.AXES_HOLD_TIME)

        # x・y・z軸を描き終えた後に、底面の四角を通常表示する。
        self.play(
            FadeIn(region_border),
            run_time=self.REGION_BORDER_FADE_TIME,
        )

        self.play(Create(wireframe), run_time=self.WIREFRAME_DRAW_TIME)
        self.wait(self.WIREFRAME_HOLD_TIME)

        # 以前の動画と同じく、網の表示後に文字だけ先に消す。
        self.play(
            axis_labels.animate.set_opacity(0),
            run_time=self.LABEL_FADE_TIME,
        )
        self.remove_fixed_orientation_mobjects(*axis_labels)
        self.remove(*axis_labels)

        self.play(
            FadeOut(wireframe),
            run_time=self.WIREFRAME_FADE_TIME,
        )
        wireframe.set_opacity(0)
        self.remove(*wireframe.get_family())

    def clear_first_volume(self, first, remaining, volume):
        """1つ目の積分順序で作った直方体群を消す"""
        self.play(
            FadeOut(volume),
            run_time=self.FIRST_VOLUME_FADE_TIME,
        )
        self.remove(volume, first, remaining, *first, *remaining)
        self.wait(self.BETWEEN_PASSES_HOLD_TIME)

    def show_smooth_finish(self, axes, volume):
        """直方体群を、継ぎ目のない滑らかな立体へ切り替える"""
        smooth_solid = self.make_smooth_solid(axes)
        self.play(
            FadeOut(volume),
            FadeIn(smooth_solid),
            run_time=self.SMOOTH_TRANSITION_TIME,
        )
        self.wait(self.SMOOTH_HOLD_TIME)

    def rotate_finished_solid(self):
        """完成した立体を、滑らかに360度見渡す"""
        start_theta = self.camera.theta_tracker.get_value()
        end_theta = start_theta + TAU
        self.play(
            self.camera.theta_tracker.animate.set_value(end_theta),
            run_time=self.FINAL_ROTATION_TIME,
            rate_func=smooth,
        )
        self.camera.theta_tracker.set_value(end_theta)
        self.wait(self.FINAL_HOLD_TIME)

    def construct(self):
        self.set_camera_orientation(
            phi=self.CAMERA_PHI_DEGREES * DEGREES,
            theta=self.CAMERA_THETA_DEGREES * DEGREES,
            zoom=self.CAMERA_ZOOM,
        )

        # 回転軸のx・y位置をz軸の根元に固定する。
        # 注視点だけz方向へ上げ、図全体を画面内で少し下に配置する。
        self.camera._frame_center.move_to(
            SolidAxes.c2p(0, 0, 0) + OUT * self.CAMERA_VERTICAL_OFFSET
        )

        axes = SolidAxes()
        self.show_intro(axes)
        dx, dy, xs, ys = self.make_sample_grid()

        for cycle_index, order in enumerate(("x_then_y", "y_then_x")):
            first, remaining, volume = self.animate_integration_pass(
                axes,
                order,
                xs,
                ys,
                dx,
                dy,
            )

            if cycle_index == 0:
                self.clear_first_volume(first, remaining, volume)
            elif self.FINAL_SMOOTH:
                self.show_smooth_finish(axes, volume)

        self.rotate_finished_solid()


class IteratedIntegralsSmall(IteratedIntegrals):
    """細かい版：分割を増やし、最後に滑らかな立体を表示する"""

    OUTPUT_FILE_NAME = "iterated_integrals_video2.mp4"
    NX, NY = 41, 31
    FINAL_SMOOTH = True