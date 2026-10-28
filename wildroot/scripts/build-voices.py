"""将项目内中文技能语音打包成离线可用的数据模块。原音频由本机 SAPI 合成。"""
import base64
import json
import wave
from pathlib import Path

root = Path(__file__).resolve().parent.parent
lines = {
    "sprout-1": "丰收编译！让希望一起发芽！",
    "sprout-2": "种子准备好啦，明天也要一起种田！",
    "beat-1": "雷暴节拍！跟上我的节奏！",
    "beat-2": "准备好了吗？让末日热闹起来！",
    "mochi-1": "泡泡温室。别怕，我会护住你。",
    "mochi-2": "慢慢来，我们一起等春天。",
}
clips = {}
for key, text in lines.items():
    path = root / "assets" / "audio" / f"{key}.wav"
    with wave.open(str(path), "rb") as audio:
        duration = audio.getnframes() / audio.getframerate()
    clips[key] = {"text": text, "duration": round(duration, 3), "audio": "data:audio/wav;base64," + base64.b64encode(path.read_bytes()).decode("ascii")}
(root / "character-voices.js").write_text("/* 中文技能语音，来自项目 assets/audio/；可通过 scripts/build-voices.py 重建。 */\nwindow.WILDROOT_VOICES = " + json.dumps(clips, ensure_ascii=False) + ";\n", encoding="utf-8")
print(json.dumps({key: {"text": value["text"], "duration": value["duration"]} for key, value in clips.items()}, ensure_ascii=False, indent=2))
