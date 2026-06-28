# Vision App — Real-Time Object Detection in the Browser

> A real-time object-detection web app that runs a **YOLOv8** neural network entirely in the browser via **ONNX Runtime Web** — no server, no uploads, fully client-side. It detects and tracks objects from a live webcam feed, with non-maximum suppression, multi-frame tracking and smoothing.

<p align="left">
  <a href="https://github.com/Dere752/vision-app/actions/workflows/ci.yml">
    <img src="https://github.com/Dere752/vision-app/actions/workflows/ci.yml/badge.svg" alt="CI"/>
  </a>
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square"/>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/ONNX%20Runtime-Web-005CED?style=flat-square&logo=onnx&logoColor=white"/>
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white"/>
</p>

---

## Overview

Vision App turns any webcam into a real-time object detector. Frames from the camera are fed to a YOLOv8 model running **client-side** through ONNX Runtime Web; raw predictions are then post-processed (non-maximum suppression), associated across frames (tracking) and smoothed before being drawn as labelled bounding boxes over the video.

Because inference happens **entirely in the browser**, no image ever leaves the device — the app is private by design and needs no backend.

## Features

- **Real-time detection** from a live webcam feed
- **Client-side inference** — YOLOv8 runs in the browser via ONNX Runtime Web (no server, no uploads)
- **Object tracking** — detections are associated across frames so each object keeps a stable identity
- **Non-maximum suppression (NMS)** to remove duplicate, overlapping boxes
- **Temporal smoothing** for stable, jitter-free boxes
- **Multi-camera support** — pick any connected camera
- **Adjustable settings** — confidence threshold, IoU, and more
- **Live stats** — FPS and detection count
- **Graceful model loading** with a download-progress screen and local-file fallback

## Tech Stack

**Frontend:** React 18 · TypeScript · Vite · Tailwind CSS
**ML runtime:** ONNX Runtime Web
**Model:** YOLOv8n (exported to ONNX)

## How It Works

```
Webcam ──▶ frame ──▶ pre-process ──▶ YOLOv8 (ONNX Runtime Web)
                                          │
                                     raw boxes
                                          ▼
                          NMS ──▶ tracking ──▶ smoothing
                                          │
                                          ▼
                              draw boxes & labels on canvas
```

The pipeline is split into focused, testable modules:

| Concern | Location |
|---------|----------|
| Camera access | `src/hooks/useCamera.ts`, `src/services/camera.service.ts` |
| Model loading & inference | `src/hooks/useDetection.ts`, `src/services/detection.service.ts` |
| Post-processing (NMS) | `src/utils/nms.ts` |
| Tracking | `src/services/tracking.service.ts` |
| Smoothing & geometry | `src/utils/smoothing.ts`, `src/utils/geometry.ts` |
| Rendering | `src/components/DetectionCanvas/renderer.ts` |

## Getting Started

```bash
git clone https://github.com/Dere752/vision-app.git
cd vision-app

# 1. Install dependencies
npm install

# 2. Download the YOLOv8 ONNX model into public/models/
npm run download-model

# 3. Start the dev server
npm run dev
```

Then open the local URL Vite prints and allow camera access.

> The model (~12 MB) is not committed to the repository. `npm run download-model` fetches it from the official Ultralytics release (with PowerShell and Python fallbacks). If automatic download fails, the loading screen lets you pick a local `.onnx` file instead.

## Project Structure

```
src/
  components/    DetectionCanvas, ControlPanel, InfoPanel, SettingsPanel, LoadingScreen
  hooks/         useCamera, useDetection, useStats, useAnimationFrame
  services/      camera, detection, tracking
  utils/         nms, smoothing, geometry
  config/        app settings, labels (COCO classes), colors
  types/         shared TypeScript types
scripts/
  download-model.cjs   downloads the YOLOv8 ONNX model
```

## License

Released under the [MIT License](LICENSE).

## Author

**Ali Dere** — Self-taught full-stack developer
GitHub: [github.com/Dere752](https://github.com/Dere752)
