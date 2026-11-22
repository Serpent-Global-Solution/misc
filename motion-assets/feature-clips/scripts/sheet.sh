#!/usr/bin/env bash
# sheet.sh <clip-name> [cols] — 1 frame per second, tiled, into shots/sheet-<name>.png
F=$(dirname "$0")/..; n=$1; c=${2:-10}
w=$([[ $n == *-phone ]] && echo 120 || echo 260)
ffmpeg -v error -y -i $F/$n.mp4 -vf "fps=1,scale=$w:-1,tile=${c}x2" -frames:v 1 $(dirname "$0")/shots/sheet-$n.png && echo $(dirname "$0")/shots/sheet-$n.png
