import { preview } from 'vite';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const cfPath = path.join(rootDir, 'cloudflared.exe');
const pwaUrlFile = path.join(rootDir, 'pwa_tunnel_url.txt');

// 1. Start Vite Preview server directly via Node API
console.log('Starting Vite preview via Node API on port 5173...');
try {
  const server = await preview({
    root: rootDir,
    preview: {
      port: 5173,
      host: '0.0.0.0'
    }
  });
  console.log('✓ Vite preview server is running on http://localhost:5173');
  server.printUrls();
} catch (err) {
  console.error('Failed to start Vite preview:', err);
  process.exit(1);
}

// 2. Launch Cloudflare Tunnel
console.log('Starting Cloudflare tunnel for port 5173...');
const cfProcess = spawn(cfPath, ['tunnel', '--url', 'http://127.0.0.1:5173', '--no-autoupdate'], {
  stdio: ['ignore', 'pipe', 'pipe']
});

let tunnelFound = false;
function handleOutput(data) {
  const text = data.toString();
  const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
  if (match && !tunnelFound) {
    tunnelFound = true;
    const tunnelUrl = match[0];
    console.log('\n======================================================');
    console.log('🚀 PWA HTTPS TUNNEL PRÊT :', tunnelUrl);
    console.log('📱 Test Mobile / Android / iOS :', tunnelUrl);
    console.log('💻 Test PC Navigateur :', 'http://localhost:5173');
    console.log('======================================================\n');
    fs.writeFileSync(pwaUrlFile, tunnelUrl, 'utf8');

    const qrViewerHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tester la PWA MaquisSync</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0d0d12;
      color: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      text-align: center;
    }
    .card {
      background: #171722;
      border: 1px solid #10b981;
      border-radius: 24px;
      padding: 32px 24px;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 12px 40px rgba(16, 185, 129, 0.25);
    }
    .badge {
      display: inline-block;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 800;
      margin-bottom: 14px;
      letter-spacing: 0.5px;
    }
    h2 { margin: 0 0 8px; color: #fff; font-size: 24px; font-weight: 800; }
    p { color: #9ca3af; font-size: 14px; line-height: 1.5; margin: 0 0 20px; }
    .qr-box {
      background: #fff;
      padding: 16px;
      border-radius: 20px;
      display: inline-block;
      margin-bottom: 20px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }
    .qr-box img { display: block; width: 220px; height: 220px; border-radius: 8px; }
    .link-btn {
      display: block;
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      text-decoration: none;
      font-weight: 800;
      padding: 14px 20px;
      border-radius: 14px;
      margin-bottom: 14px;
      font-size: 15px;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
    }
    .instructions {
      text-align: left;
      background: rgba(255,255,255,0.04);
      border-radius: 14px;
      padding: 16px;
      font-size: 13px;
      color: #cbd5e1;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .instructions ol { margin: 0; padding-left: 20px; }
    .instructions li { margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">TEST PWA HORS-LIGNE</span>
    <h2>MaquisSync Caisse & Stock</h2>
    <p>Scannez ce QR Code avec votre smartphone ou ouvrez le lien ci-dessous :</p>
    
    <div class="qr-box">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(tunnelUrl)}" alt="QR Code PWA MaquisSync" />
    </div>

    <a href="${tunnelUrl}" target="_blank" class="link-btn">Ouvrir la PWA (${tunnelUrl})</a>

    <div class="instructions">
      <strong style="color: #10b981; display: block; margin-bottom: 8px;">Comment tester l'installation :</strong>
      <ol>
        <li>Ouvrez le lien sur votre smartphone dans <strong>Chrome</strong> (Android) ou <strong>Safari</strong> (iPhone).</li>
        <li>Cliquez sur le bouton vert <strong>« 📲 Installer l'App Mobile (PWA) »</strong>.</li>
        <li>Sur Android : confirmez l'installation. Sur iPhone : appuyez sur <em>Partager ➔ Sur l'écran d'accueil</em>.</li>
        <li>L'application s'installe sur votre écran d'accueil et fonctionne <strong>100% hors-ligne</strong> !</li>
      </ol>
    </div>
  </div>
</body>
</html>`;

    fs.writeFileSync(path.join(rootDir, 'public', 'pwa_qr_viewer.html'), qrViewerHtml, 'utf8');
  }
}

cfProcess.stdout.on('data', handleOutput);
cfProcess.stderr.on('data', handleOutput);

cfProcess.on('close', (code) => console.log('Cloudflare tunnel closed with code:', code));
