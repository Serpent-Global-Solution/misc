"""Turn raw/new/*.webm + marks.json into the deliverables.

  python3 post.py            # move current phone-*/tablet-*/portal-* to raw/old/, write new ones
  python3 post.py --dry-run  # write everything to raw/dryrun/ instead, touch nothing else
"""
import glob, json, os, re, shutil, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
LV = os.path.dirname(HERE)
NEW = os.path.join(LV, "raw", "new")
DRY = "--dry-run" in sys.argv
OUT = os.path.join(LV, "raw", "dryrun") if DRY else LV
STILLS = os.path.join(OUT, "stills")
m = json.load(open(os.path.join(NEW, "marks.json")))
VID = {k: m[f"{k}Video"] for k in ("tablet", "phone", "portal")}
ENC = ["-c:v", "libx264", "-crf", "18", "-preset", "slow", "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart", "-an"]


def ff(*a):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *a], check=True)


def white_runs(src, start, end, thresh=230):
    """Blank page loads and the "opening your ticket…" spinner average ~234 luma; real screens stay <=224."""
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
    return [(a, b + 0.05) for a, b in runs]


def keep_except(src, start, end, cuts, dst):
    expr = "+".join(f"between(t,{a:.3f},{b:.3f})" for a, b in cuts) or "0"
    ff("-ss", f"{start:.3f}", "-to", f"{end:.3f}", "-i", src, "-vf",
       f"select='not({expr})',setpts=N/FRAME_RATE/TB", *ENC, dst)


def concat(src, segs, dst):
    parts = ";".join(f"[0:v]trim={a:.3f}:{b:.3f},setpts=PTS-STARTPTS[s{i}]" for i, (a, b) in enumerate(segs))
    ff("-i", src, "-filter_complex", f"{parts};{''.join(f'[s{i}]' for i in range(len(segs)))}concat=n={len(segs)}:v=1[v]",
       "-map", "[v]", *ENC, dst)


def still(who, key, name, off=0.0):
    ff("-i", VID[who], "-ss", f"{m[f'{who}.{key}'] + off:.2f}", "-frames:v", "1", os.path.join(STILLS, name + ".png"))


def dur(f):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f],
                                capture_output=True, text=True).stdout)


if not DRY:  # keep the previous versions
    old = os.path.join(LV, "raw", "old", time.strftime("%Y%m%d-%H%M%S"))
    os.makedirs(os.path.join(old, "stills"), exist_ok=True)
    for f in glob.glob(os.path.join(LV, "*.mp4")) + glob.glob(os.path.join(LV, "raw", "*.webm")):
        shutil.move(f, old)
    for f in glob.glob(os.path.join(LV, "stills", "*.png")):
        shutil.move(f, os.path.join(old, "stills"))
os.makedirs(STILLS, exist_ok=True)

# phone: shop page → ticket, white flashes removed
ps, pe = m["phone.clip_start"] - 0.3, m["phone.clip_end"] + 0.4
phone = os.path.join(OUT, "phone-qr-booking-1080x1920.mp4")
keep_except(VID["phone"], ps, pe, white_runs(VID["phone"], ps, pe), phone)

# tablet: opening board, then from just before the ticket lands to Paid (the polling wait is cut)
tablet = os.path.join(OUT, "tablet-queue-to-cash-2388x1668.mp4")
concat(VID["tablet"], [(m["tablet.clip_start"], m["tablet.clip_start"] + 3.6),
                       (m["tablet.booking_appeared"] - 2.0, m["tablet.clip_end"] + 0.3)], tablet)

# portal: dashboard → transactions → the RM35 sale
portal = os.path.join(OUT, "portal-sales-2880x1800.mp4")
ff("-ss", f"{m['portal.clip_start']:.3f}", "-to", f"{m['portal.clip_end'] + 0.3:.3f}", "-i", VID["portal"], *ENC, portal)

for who, key, name in [("phone", "still_shop", "phone-01-shop-page"), ("phone", "still_service", "phone-02-pick-service"),
                       ("phone", "still_barber", "phone-03-pick-barber"), ("phone", "still_review", "phone-04-review"),
                       ("phone", "still_ticket", "phone-05-ticket"),
                       ("tablet", "still_before", "tablet-01-queue-before"), ("tablet", "still_booking", "tablet-02-ticket-in-queue"),
                       ("tablet", "still_drawer", "tablet-03-drawer"), ("tablet", "still_cash", "tablet-04-cash"),
                       ("tablet", "still_paid", "tablet-05-paid"),
                       ("portal", "still_dashboard", "portal-01-dashboard"), ("portal", "still_transactions", "portal-02-transactions"),
                       ("portal", "still_sale", "portal-03-sale-rm35")]:
    still(who, key, name, -0.3)

for f in (phone, tablet, portal):
    print(f"{os.path.relpath(f, LV)}  {dur(f):.1f}s  {os.path.getsize(f) / 1e6:.1f} MB")
if not DRY:
    for who in ("tablet", "phone", "portal"):
        shutil.copy(VID[who], os.path.join(LV, "raw", f"{who}-raw.webm"))
