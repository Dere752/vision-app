"""
Vision AI — Real-Time Object Detection
Çalıştır: python detect.py
Çık:      Q tuşu
"""

import cv2
import time
import argparse
import numpy as np
from ultralytics import YOLO
from collections import deque

# ── Ayarlar ──────────────────────────────────────────────────
MODEL_PATH      = "yolov8n.pt"   # pt daha hızlı; onnx de yazılabilir
CAMERA_INDEX    = 0
CONFIDENCE      = 0.40
IOU_THRESHOLD   = 0.45
WINDOW_NAME     = "Vision AI  |  Q: quit  |  S: screenshot  |  +/-: confidence"
TARGET_FPS      = 60
BOX_ALPHA       = 0.18            # kutu saydam dolgu

# ── Renk paleti (80 sınıf, golden-angle HSV) ─────────────────
def make_palette(n=80):
    palette = []
    for i in range(n):
        hue = int((i * 137.508) % 360)
        c = np.uint8([[[hue // 2, 220, 220]]])
        bgr = cv2.cvtColor(c, cv2.COLOR_HSV2BGR)[0][0]
        palette.append((int(bgr[0]), int(bgr[1]), int(bgr[2])))
    return palette

PALETTE = make_palette()

# ── Yardımcı çizim fonksiyonları ─────────────────────────────
def draw_rounded_rect(img, x1, y1, x2, y2, color, radius=12, thickness=2, alpha=BOX_ALPHA):
    overlay = img.copy()
    # Dolu fill
    cv2.rectangle(overlay, (x1 + radius, y1), (x2 - radius, y2), color, -1)
    cv2.rectangle(overlay, (x1, y1 + radius), (x2, y2 - radius), color, -1)
    for cx, cy in [(x1+radius, y1+radius), (x2-radius, y1+radius),
                   (x1+radius, y2-radius), (x2-radius, y2-radius)]:
        cv2.circle(overlay, (cx, cy), radius, color, -1)
    cv2.addWeighted(overlay, alpha, img, 1 - alpha, 0, img)

    # Çerçeve
    cv2.rectangle(img, (x1 + radius, y1), (x2 - radius, y1), color, thickness)
    cv2.rectangle(img, (x1 + radius, y2), (x2 - radius, y2), color, thickness)
    cv2.rectangle(img, (x1, y1 + radius), (x1, y2 - radius), color, thickness)
    cv2.rectangle(img, (x2, y1 + radius), (x2, y2 - radius), color, thickness)
    for (cx, cy), (a1, a2) in zip(
        [(x1+radius, y1+radius), (x2-radius, y1+radius),
         (x1+radius, y2-radius), (x2-radius, y2-radius)],
        [(180, 270), (270, 360), (90, 180), (0, 90)]
    ):
        cv2.ellipse(img, (cx, cy), (radius, radius), 0, a1, a2, color, thickness)

def draw_label(img, text, x1, y1, color):
    font = cv2.FONT_HERSHEY_SIMPLEX
    scale, thick = 0.55, 1
    (tw, th), bl = cv2.getTextSize(text, font, scale, thick)
    pad = 6
    bx1, by1 = x1, max(y1 - th - pad * 2, 0)
    bx2, by2 = x1 + tw + pad * 2, max(y1, th + pad * 2)
    cv2.rectangle(img, (bx1, by1), (bx2, by2), color, -1)
    cv2.putText(img, text, (bx1 + pad, by2 - pad), font, scale, (255, 255, 255), thick, cv2.LINE_AA)

def draw_corner_accents(img, x1, y1, x2, y2, color, size=18, thick=3):
    pts = [(x1, y1, 1, 1), (x2, y1, -1, 1), (x1, y2, 1, -1), (x2, y2, -1, -1)]
    for (cx, cy, dx, dy) in pts:
        cv2.line(img, (cx, cy), (cx + dx * size, cy), color, thick, cv2.LINE_AA)
        cv2.line(img, (cx, cy), (cx, cy + dy * size), color, thick, cv2.LINE_AA)

def draw_hud(img, fps, conf_thresh, n_objects, backend):
    h, w = img.shape[:2]
    overlay = img.copy()
    cv2.rectangle(overlay, (8, 8), (260, 110), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.55, img, 0.45, 0, img)

    fps_color = (80, 220, 80) if fps >= 25 else (60, 160, 240) if fps >= 15 else (60, 60, 220)
    lines = [
        (f"FPS: {fps:.0f}", fps_color),
        (f"Objects: {n_objects}", (200, 200, 200)),
        (f"Confidence: {conf_thresh:.0%}", (200, 200, 200)),
        (f"Backend: {backend}", (150, 150, 150)),
    ]
    for i, (text, color) in enumerate(lines):
        cv2.putText(img, text, (16, 32 + i * 22), cv2.FONT_HERSHEY_SIMPLEX,
                    0.58, color, 1, cv2.LINE_AA)

# ── Ana döngü ────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--camera", type=int, default=CAMERA_INDEX)
    parser.add_argument("--conf",   type=float, default=CONFIDENCE)
    parser.add_argument("--model",  type=str,   default=MODEL_PATH)
    args = parser.parse_args()

    print(f"  Model yükleniyor: {args.model}")
    model = YOLO(args.model)
    print(f"  Kamera açılıyor: {args.camera}")

    # Try backends in order: DSHOW → MSMF → auto
    cap = None
    for backend in [cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY]:
        c = cv2.VideoCapture(args.camera, backend)
        if c.isOpened():
            ret, frame = c.read()
            if ret and frame is not None and frame.sum() > 0:
                cap = c
                print(f"  Camera opened (backend={backend})")
                break
            c.release()
    if cap is None:
        # Last resort: try indices 0-3 without specifying backend
        for idx in range(4):
            c = cv2.VideoCapture(idx)
            if c.isOpened():
                ret, frame = c.read()
                if ret and frame is not None:
                    cap = c
                    print(f"  Camera opened at index {idx}")
                    break
            c.release()
    if cap is None:
        print("  ERROR: No camera found!")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    cap.set(cv2.CAP_PROP_FPS, TARGET_FPS)

    cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(WINDOW_NAME, 1280, 720)

    conf_thresh = args.conf
    fps_buf = deque(maxlen=30)
    t_prev = time.perf_counter()
    screenshot_n = 0

    print("  Started. Q=quit | S=screenshot | +/-=confidence")

    while True:
        ret, frame = cap.read()
        if not ret or frame is None:
            print("  Camera read failed, retrying...")
            time.sleep(0.5)
            continue

        # Inference
        results = model.predict(
            frame,
            conf=conf_thresh,
            iou=IOU_THRESHOLD,
            verbose=False,
            stream=False,
        )

        n_objects = 0
        for r in results:
            boxes = r.boxes
            if boxes is None:
                continue
            for box in boxes:
                cls_id = int(box.cls[0])
                conf   = float(box.conf[0])
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                color  = PALETTE[cls_id % len(PALETTE)]
                name   = model.names[cls_id]

                draw_rounded_rect(frame, x1, y1, x2, y2, color)
                draw_corner_accents(frame, x1, y1, x2, y2, color)
                draw_label(frame, f"{name}  {conf:.0%}", x1, y1, color)
                n_objects += 1

        # FPS hesapla
        t_now = time.perf_counter()
        fps_buf.append(1.0 / max(t_now - t_prev, 1e-6))
        t_prev = t_now
        fps = sum(fps_buf) / len(fps_buf)

        draw_hud(frame, fps, conf_thresh, n_objects, "CPU")
        cv2.imshow(WINDOW_NAME, frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q') or key == 27:
            break
        elif key == ord('s'):
            screenshot_n += 1
            fname = f"screenshot_{screenshot_n:03d}.jpg"
            cv2.imwrite(fname, frame)
            print(f"  Saved: {fname}")
        elif key == ord('+') or key == ord('='):
            conf_thresh = min(conf_thresh + 0.05, 0.95)
            print(f"  Confidence: {conf_thresh:.0%}")
        elif key == ord('-'):
            conf_thresh = max(conf_thresh - 0.05, 0.05)
            print(f"  Confidence: {conf_thresh:.0%}")

    cap.release()
    cv2.destroyAllWindows()
    print("  Closed.")

if __name__ == "__main__":
    main()
