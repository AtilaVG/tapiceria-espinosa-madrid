# Prompts de vídeo (Gemini · Veo) — Tapicería Espinosa

Destino: `assets/intro.mp4` (16:9, ~8 s, 1080p si se puede). Para que el scroll-scrubbing vaya suave, conviene recomprimir con un keyframe por fotograma:

```
ffmpeg -i descarga.mp4 -an -c:v libx264 -pix_fmt yuv420p -g 1 -crf 23 -movflags +faststart assets/intro.mp4
```

## Prompt principal

> Cinematic continuous single shot, 8 seconds, 16:9, no cuts. A slow dolly-in through the doorway of a traditional upholstery workshop in Madrid: rolls of rich fabrics in deep teal, mustard and terracotta stacked on shelves, spools of thread, a large cutting table with scissors and chalk. Soft warm daylight from a side window. The camera glides forward between the fabric rolls and settles on a beautifully reupholstered vintage three-seat sofa in deep teal velvet with neat piping and visible fine stitching, standing on a wooden platform, the light gently grazing the velvet texture. Shallow depth of field, elegant cinematic grading, smooth constant camera speed. No text, no logos, no watermarks, no people.

## Prompt alternativo

> Continuous 8-second shot, 16:9, no cuts. Starts in extreme close-up on a needle and golden thread passing through mustard-coloured upholstery fabric, macro detail of the weave. The camera slowly and smoothly pulls back and rises to reveal a classic armchair freshly reupholstered in that fabric, in a calm, sunlit workshop with fabric samples on the wall. Warm natural light, soft shadows, cinematic look, steady constant motion suitable for scroll-controlled playback. No text, no logos, no hands or faces visible after the first second, no people.

Notas: movimiento constante y sin cortes (el scroll avanza y retrocede el vídeo). Evitar personas reconocibles, marcas y texto.
