"""从独立 HTML 生成离线保存包；解压后直接打开 index.html。"""
import argparse
import zipfile
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("html", type=Path)
parser.add_argument("output", type=Path)
args = parser.parse_args()
html = args.html.read_bytes()
assert b'<script src=' not in html and b'<link rel="stylesheet"' not in html
readme = """荒穗计划 · BUILD 7.0 离线版

1. 将本压缩包完整解压到自己的文件夹。
2. 双击 index.html，使用 Edge 或 Chrome 游玩。无需服务器、账号或网络。
3. 第一次点击或按键后播放声音。右上角音符可以分别调整音乐、音效、角色语音。
4. 键盘 WASD 移动，鼠标瞄准与射击，空格冲刺，Q 角色技能，E 种植/浇水/收获/互动。
5. 存档保存在浏览器本地，建议在主菜单点击“导出存档”保留 JSON 备份。
6. 换电脑、换浏览器、移动文件或切换网站后，可通过“导入存档”恢复局外进度。
7. 备份包含芽晶、实验室、图鉴、成就和历史统计；当前未结束的一局暂不支持中途续玩。

固定在线入口：https://cj-dzz.github.io/D02/wildroot/
离线版保存的是下载时的版本，后续更新请重新下载；即使托管停止，已下载的文件仍可使用。
"""
args.output.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(args.output, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    archive.writestr("Wildroot/index.html", html)
    archive.writestr("Wildroot/使用说明.txt", readme.encode("utf-8-sig"))
print(f"{args.output.resolve()} ({args.output.stat().st_size:,} bytes)")
