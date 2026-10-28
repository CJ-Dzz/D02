"""生成可供 HTMLPreview 使用的独立游戏页面，保留图集的原始 alpha。"""
import argparse
import base64
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("output", type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text(encoding="utf-8")
assets = {}
for name in ("companions", "enemies", "crops", "props"):
    data = (root / "assets" / f"{name}-v66.png").read_bytes()
    assets[name] = "data:image/png;base64," + base64.b64encode(data).decode("ascii")
for name in ("styles.css", "art-direction.css"):
    css = (root / name).read_text(encoding="utf-8")
    css = css.replace('url("assets/companions-v66.png")', "none")
    html = html.replace(f'<link rel="stylesheet" href="{name}" />', f"<style>\n{css}\n</style>")
settings = "\n".join(
    f"window.{key} = {json.dumps(assets[name])};"
    for name, key in (
        ("companions", "WILDROOT_COMPANION_ATLAS"),
        ("enemies", "WILDROOT_ENEMY_ATLAS"),
        ("crops", "WILDROOT_CROP_ATLAS"),
        ("props", "WILDROOT_PROP_ATLAS"),
    )
)
settings += '\ndocument.documentElement.style.setProperty("--companion-atlas", "url(" + window.WILDROOT_COMPANION_ATLAS + ")");'
for name in ("game-config.js", "game.js"):
    code = (root / name).read_text(encoding="utf-8")
    if name == "game.js":
        code = settings + "\n" + code
    html = html.replace(f'<script src="{name}"></script>', f"<script>\n{code}\n</script>")
assert '<script src=' not in html
assert '<link rel="stylesheet"' not in html
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(html, encoding="utf-8")
print(f"{args.output.resolve()} ({args.output.stat().st_size:,} bytes)")
