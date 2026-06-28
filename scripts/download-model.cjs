/**
 * Downloads YOLOv8n ONNX model to public/models/.
 * Tries multiple methods: Node https → PowerShell → Python
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const { execSync, spawnSync } = require('child_process');

const dest = path.join(__dirname, '..', 'public', 'models');
if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

const outPath = path.join(dest, 'yolov8n.onnx');

// Already exists?
if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1e6) {
  console.log(`✓ yolov8n.onnx already exists (${(fs.statSync(outPath).size / 1e6).toFixed(1)} MB)`);
  process.exit(0);
}

const URLS = [
  'https://github.com/ultralytics/assets/releases/download/v8.3.0/yolov8n.onnx',
  'https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.onnx',
  'https://github.com/ultralytics/assets/releases/download/v8.1.0/yolov8n.onnx',
  'https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.onnx',
];

function nodeDownload(url, redirect = 0) {
  return new Promise((resolve, reject) => {
    if (redirect > 10) return reject(new Error('Too many redirects'));
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, rejectUnauthorized: false }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return nodeDownload(res.headers.location, redirect + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      const total = parseInt(res.headers['content-length'] || '0', 10);
      let received = 0;
      const file = fs.createWriteStream(outPath);
      res.on('data', c => {
        received += c.length;
        const p = total > 0 ? ((received / total) * 100).toFixed(1) : '?';
        process.stdout.write(`\r  ${p}% — ${(received / 1e6).toFixed(1)} MB  `);
      });
      res.pipe(file);
      file.on('finish', () => { process.stdout.write('\n'); file.close(resolve); });
      file.on('error', e => { fs.unlink(outPath, () => {}); reject(e); });
    }).on('error', reject);
  });
}

function tryPowerShell(url) {
  console.log('  Trying PowerShell Invoke-WebRequest...');
  const r = spawnSync('powershell', [
    '-NoProfile', '-Command',
    `[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}; Invoke-WebRequest -Uri '${url}' -OutFile '${outPath}' -UseBasicParsing`
  ], { timeout: 120000, encoding: 'utf8' });
  if (r.status === 0 && fs.existsSync(outPath) && fs.statSync(outPath).size > 1e6) return true;
  if (r.stderr) console.log(' ', r.stderr.slice(0, 200));
  return false;
}

function tryPython() {
  const py = ['python', 'python3', 'py'].find(cmd => {
    try { execSync(`${cmd} --version`, { stdio: 'pipe' }); return true; } catch { return false; }
  });
  if (!py) { console.log('  Python not found, skipping.'); return false; }
  console.log(`  Trying Python (${py}) + ultralytics...`);

  // Install ultralytics silently
  spawnSync(py, ['-m', 'pip', 'install', 'ultralytics', '--quiet', '--disable-pip-version-check'],
    { timeout: 120000, stdio: 'inherit' });

  const script = `
from ultralytics import YOLO
import shutil, os
m = YOLO('yolov8n.pt')
m.export(format='onnx', imgsz=640)
src = 'yolov8n.onnx'
dst = r'${outPath.replace(/\\/g, '\\\\')}'
shutil.move(src, dst)
print('OK:', dst)
`;
  const r = spawnSync(py, ['-c', script], { timeout: 180000, stdio: 'inherit' });
  return r.status === 0 && fs.existsSync(outPath) && fs.statSync(outPath).size > 1e6;
}

(async () => {
  // 1. Try Node https with multiple URLs
  for (const url of URLS) {
    console.log(`  ↓ Node: ${url}`);
    try {
      await nodeDownload(url);
      if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1e6) {
        console.log(`✓ Saved: public/models/yolov8n.onnx (${(fs.statSync(outPath).size / 1e6).toFixed(1)} MB)`);
        process.exit(0);
      }
    } catch (e) { console.log(`  ✗ ${e.message}`); }
  }

  // 2. Try PowerShell
  for (const url of URLS) {
    if (tryPowerShell(url)) {
      console.log(`✓ Saved via PowerShell (${(fs.statSync(outPath).size / 1e6).toFixed(1)} MB)`);
      process.exit(0);
    }
  }

  // 3. Try Python
  if (tryPython()) {
    console.log(`✓ Exported via Python (${(fs.statSync(outPath).size / 1e6).toFixed(1)} MB)`);
    process.exit(0);
  }

  console.error(`
─────────────────────────────────────────────────
 MANUAL DOWNLOAD REQUIRED
─────────────────────────────────────────────────
 1. Open this URL in your browser and save the file:
    https://github.com/ultralytics/assets/releases

    Look for "yolov8n.onnx" in the latest release assets.

 2. Or use Python:
    pip install ultralytics
    python -c "from ultralytics import YOLO; YOLO('yolov8n.pt').export(format='onnx')"

 3. Place the file here:
    ${outPath}

 4. Refresh the browser — the app will load the local file.
─────────────────────────────────────────────────
`);
  process.exit(1);
})();
