"""生成轻量 GitHub Pages 入口；素材分文件并行加载，版本参数避免更新后旧脚本混用。"""
import argparse
import re
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("output", type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text(encoding="utf-8")
version = re.search(r"BUILD ([0-9.]+)", html).group(1)
html = re.sub(r'((?:src|href)="[a-z][a-z0-9-]*\.(?:js|css))"', rf'\1?v={version}"', html)
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(html, encoding="utf-8")
print(f"{args.output.resolve()} ({args.output.stat().st_size:,} bytes; BUILD {version})")
