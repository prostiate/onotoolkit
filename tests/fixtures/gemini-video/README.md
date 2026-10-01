# Gemini video regression clips

These are the first 0.5 seconds of the upstream samples `20260615.mp4` (Gemini
star, 1280x720, AAC audio) and `veo-20260615.mp4` (Veo text, 720x1280).
They are trimmed with `ffmpeg -t 0.5 -c copy`, without changing decoded pixels.

Source: [GargantuaX/gemini-watermark-remover](https://github.com/GargantuaX/gemini-watermark-remover),
the pinned revision recorded in `packages/gemini-video/README.md`.
Upstream MIT license: `packages/gemini-video/LICENSE`.

The browser E2E tests process both real clips and download playable MP4s without
file uploads. These fixtures keep that test independent of external sample URLs.
