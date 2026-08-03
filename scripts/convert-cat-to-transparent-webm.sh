#!/bin/bash
# Convert the green-screen cat video to a truly transparent WebM (VP9 + alpha channel).
#
# Key fix: force yuva420p pixel format AND use -pix_fmt doesn't work for vp9 alpha,
# we need to use libvpx-vp9 with -auto-alt-ref 0 and explicitly preserve alpha.
# The previous attempt dropped alpha because yuv420p was selected instead of yuva420p.

set -e

INPUT="/home/z/my-project/upload/asol_biral_na_graphics_wala_bi.mp4"
WEBM_OUT="/home/z/my-project/public/cat-floating.webm"

FFMPEG="/usr/bin/ffmpeg"

echo "=== Converting to transparent WebM (yuva420p) ==="
# CRITICAL:
#  -vf chromakey=green:0.35:0.15  → key out the green
#  -pix_fmt yuva420p               → preserve alpha channel
#  -auto-alt-ref 0                 → required for alpha to work in libvpx-vp9
#  -deadline good -speed 4         → faster encoding
$FFMPEG -y -i "$INPUT" \
  -vf "chromakey=green:0.4:0.2,format=yuva420p" \
  -c:v libvpx-vp9 \
  -pix_fmt yuva420p \
  -b:v 0 -crf 30 \
  -deadline good \
  -cpu-used 4 \
  -auto-alt-ref 0 \
  -g 240 \
  -row-mt 1 \
  -an \
  -metadata title="Leads Dekho Floating Cat Widget" \
  "$WEBM_OUT" 2>&1 | tail -8

echo ""
echo "=== Output ==="
ls -la "$WEBM_OUT"

echo ""
echo "=== WebM probe (look for yuva420p) ==="
$FFMPEG -i "$WEBM_OUT" 2>&1 | grep -E "Stream|Duration|pix"
