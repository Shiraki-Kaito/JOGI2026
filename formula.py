"""許可した数式のみをASTで評価。evalは使用しない。"""
import ast
import operator
import numpy as np

FUNCTIONS = {name: getattr(np, name) for name in ('sin', 'cos', 'tan', 'exp', 'log', 'sqrt', 'abs')}
OPS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv, ast.Pow: operator.pow}

def parse_formula(text):
    if not text.strip() or len(text) > 200:
        raise ValueError('関数は1〜200文字で入力してください。')
    try:
        tree = ast.parse(text.replace('^', '**'), mode='eval')
    except SyntaxError as exc:
        raise ValueError('数式の書き方を確認してください。') from exc
    if len(list(ast.walk(tree))) > 100:
        raise ValueError('数式が複雑すぎます。')
    def check(node):
        if isinstance(node, ast.Constant) and type(node.value) in (int, float) and abs(node.value) <= 100:
            return
        if isinstance(node, ast.Name) and node.id in ('x', 'y', 'pi', 'e'):
            return
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
            check(node.operand); return
        if isinstance(node, ast.BinOp) and type(node.op) in OPS:
            if isinstance(node.op, ast.Pow) and not (isinstance(node.right, ast.Constant) and type(node.right.value) in (int, float) and 0 <= node.right.value <= 6):
                raise ValueError('指数は0〜6の定数にしてください。')
            check(node.left); check(node.right); return
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in FUNCTIONS and len(node.args) == 1 and not node.keywords:
            check(node.args[0]); return
        raise ValueError('使用できるのはx・y、四則演算、累乗、sin/cos/tan/exp/log/sqrt/abs、pi/eです。')
    check(tree.body)
    def function(x, y):
        def visit(node):
            if isinstance(node, ast.Constant): return float(node.value)
            if isinstance(node, ast.Name): return {'x': x, 'y': y, 'pi': np.pi, 'e': np.e}[node.id]
            if isinstance(node, ast.UnaryOp): return (-1 if isinstance(node.op, ast.USub) else 1) * visit(node.operand)
            if isinstance(node, ast.BinOp): return OPS[type(node.op)](visit(node.left), visit(node.right))
            return FUNCTIONS[node.func.id](visit(node.args[0]))
        with np.errstate(all='ignore'):
            try:
                result = visit(tree.body)
            except (ArithmeticError, ValueError) as exc:
                raise ValueError('領域内で計算できない数式です。') from exc
        if not np.all(np.isfinite(result)) or np.any(np.asarray(result) < -1) or np.any(np.asarray(result) > 2.5):
            raise ValueError('領域内の高さが−1〜2.5になる関数を指定してください（軸の表示範囲）。')
        return result
    x, y = np.meshgrid(np.linspace(-2, 2, 101), np.linspace(-1.5, 1.5, 101))
    function(x, y)
    return function
