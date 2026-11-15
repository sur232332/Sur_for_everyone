#!/usr/bin/env bash
# Turns a 360° orbit video of a car into evenly spaced JPG frames for the viewer.
#
# Usage:   ./scripts/make-spin-frames.sh <video-file> <car-slug> [frame-count=72] [max-width=1600]
# Example: ./scripts/make-spin-frames.sh ~/Downloads/ferrari.mp4 ferrari-f8-tributo 72
#
# Output:  public/cars/frames/<car-slug>/001.jpg, 002.jpg, ...
# Needs:   ffmpeg + ffprobe installed (https://ffmpeg.org)
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 <video-file> <car-slug> [frame-count=72] [max-width=1600]"
  exit 1
fi

in="$1"
slug="$2"
count="${3:-72}"
width="${4:-1600}"
out="public/cars/frames/$slug"

mkdir -p "$out"
rm -f "$out"/*.jpg

duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in")
fps=$(awk -v n="$count" -v d="$duration" 'BEGIN { printf "%.5f", n / d }')

ffmpeg -v error -y -i "$in" \
  -vf "fps=$fps,scale='min($width,iw)':-2" \
  -frames:v "$count" -q:v 3 \
  "$out/%03d.jpg"

actual=$(ls "$out"/*.jpg | wc -l | tr -d ' ')
echo "Created $actual frames in $out"
echo "In luxuryCarsData.ts use:  spinFrames: spinFrameUrls('$slug', $actual),"
echo "and remove spinVideoUrl for that car (video takes priority over frames)."
