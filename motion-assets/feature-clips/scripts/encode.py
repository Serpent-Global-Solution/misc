"""python3 encode.py <clip-name> — raw/<name>.webm + marks → <name>.mp4 (start..end, phone white flashes cut) + stills/<name>.png"""
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENC = ["-c:v", "libx264", "-crf", "18", "-preset", "slow", "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart", "-an"]


def white_runs(src, start, end, thresh=230):
    """Blank page loads and spinners average ~234 luma on the phone; real screens stay <=224."""
    out = subprocess.run(["ffmpeg", "-hide_banner", "-ss", str(start), "-to", str(end), "-i", src, "-vf",
                          "scale=270:-1,signalstats,metadata=print:key=lavfi.signalstats.YAVG", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    vals = [(float(t), float(y)) for t, y in re.findall(r"pts_time:([0-9.]+).*?\n.*?YAVG=([0-9.]+)", out)]
    runs, cur = [], None
    for t, y in vals:
        if y >= thresh:
            cur = [t, t] if cur is None else [cur[0], t]
        elif cur:
            runs.append(cur); cur = None
    if cur: runs.append(cur)
    return [(a, b + 0.05) for a, b in runs if b - a < 1.2]   # flashes are brief; a white page that stays is real content


for name in sys.argv[1:]:
    src = os.path.join(ROOT, "raw", f"{name}.webm")
    m = json.load(open(os.path.join(ROOT, "raw", f"{name}.json")))
    start, end = m["start"] - 0.2, m["end"] + 0.4
    cuts = white_runs(src, start, end) if name.endswith("-phone") else []
    expr = "+".join(f"between(t,{a:.3f},{b:.3f})" for a, b in cuts) or "0"
    dst = os.path.join(ROOT, f"{name}.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{start:.3f}", "-to", f"{end:.3f}", "-i", src,
                    "-vf", f"select='not({expr})',setpts=N/FRAME_RATE/TB", *ENC, dst], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-ss", f"{m.get('still', start + 1) - 0.2:.2f}", "-frames:v", "1",
                    os.path.join(ROOT, "stills", f"{name}.png")], check=True)
    d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", dst],
                             capture_output=True, text=True).stdout)
    print(f"{name}.mp4  {d:.1f}s  cuts={len(cuts)}")
