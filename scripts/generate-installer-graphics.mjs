import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

function encodeBMP(width, height, rawRGBBuffer) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  const buf = Buffer.alloc(fileSize);

  // BITMAPFILEHEADER (14 bytes)
  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt16LE(0, 6);
  buf.writeUInt16LE(0, 8);
  buf.writeUInt32LE(54, 10);

  // BITMAPINFOHEADER (40 bytes)
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22); // positive = bottom-up
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30); // BI_RGB
  buf.writeUInt32LE(pixelArraySize, 34);
  buf.writeInt32LE(2835, 38); // ~72 DPI
  buf.writeInt32LE(2835, 42);
  buf.writeUInt32LE(0, 46);
  buf.writeUInt32LE(0, 50);

  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y;
    const rowOffset = 54 + y * rowSize;
    for (let x = 0; x < width; x++) {
      const srcIdx = (srcY * width + x) * 3;
      buf[rowOffset + x * 3] = rawRGBBuffer[srcIdx + 2]; // B
      buf[rowOffset + x * 3 + 1] = rawRGBBuffer[srcIdx + 1]; // G
      buf[rowOffset + x * 3 + 2] = rawRGBBuffer[srcIdx]; // R
    }
  }
  return buf;
}

async function main() {
  const defaultSource = 'C:/Users/CARLOS/.gemini/antigravity-ide/brain/627bfb61-307a-4be4-98e0-fc061b6749e3/installer_sidebar_graphic_1791797682792.jpg';
  const localSource = path.resolve('src-tauri/icons/installerSidebar_source.png');
  const sourceImage = fs.existsSync(localSource) ? localSource : defaultSource;

  const tauriIconsDir = path.resolve('src-tauri/icons');
  const frontendPublicDir = path.resolve('frontend/public');

  if (!fs.existsSync(localSource) && fs.existsSync(defaultSource)) {
    fs.copyFileSync(defaultSource, localSource);
    console.log(`Saved local master artwork at ${localSource}`);
  }

  console.log('Generating installer sidebar (164x314)...');
  const sidebarSharp = sharp(sourceImage)
    .resize(164, 314, { fit: 'cover', position: 'center' });

  const sidebarPngBuf = await sidebarSharp.clone().png().toBuffer();
  fs.writeFileSync(path.join(tauriIconsDir, 'installerSidebar.png'), sidebarPngBuf);
  fs.writeFileSync(path.join(frontendPublicDir, 'installerSidebar.png'), sidebarPngBuf);

  // Get raw RGB buffer for BMP (uncompressed 24-bit)
  const { data: rawSidebar, info: sidebarInfo } = await sidebarSharp
    .clone()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const sidebarBmp = encodeBMP(sidebarInfo.width, sidebarInfo.height, rawSidebar);
  fs.writeFileSync(path.join(tauriIconsDir, 'installerSidebar.bmp'), sidebarBmp);
  fs.writeFileSync(path.join(frontendPublicDir, 'installerSidebar.bmp'), sidebarBmp);
  console.log(`Saved installerSidebar.bmp (${sidebarBmp.length} bytes) and installerSidebar.png`);

  console.log('Generating installer header (150x57)...');
  const iconSource = path.resolve('src-tauri/icons/icon.png');
  const logoSharp = sharp(iconSource)
    .resize(44, 44, { fit: 'contain' });
  const logoBuf = await logoSharp.png().toBuffer();

  const svgHeader = `
    <svg width="150" height="57" viewBox="0 0 150 57" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFFFFF" />
          <stop offset="60%" stop-color="#F6F9FD" />
          <stop offset="100%" stop-color="#E8F1FC" />
        </linearGradient>
      </defs>
      <rect width="150" height="57" fill="url(#headerGrad)" />
      <circle cx="126" cy="28" r="24" fill="#06B6D4" opacity="0.09" />
      <circle cx="126" cy="28" r="16" fill="#3B82F6" opacity="0.06" />
    </svg>
  `;

  const headerSharp = sharp(Buffer.from(svgHeader))
    .composite([
      {
        input: logoBuf,
        top: 6,
        left: 98,
      },
    ]);

  const headerPngBuf = await headerSharp.clone().png().toBuffer();
  fs.writeFileSync(path.join(tauriIconsDir, 'installerHeader.png'), headerPngBuf);
  fs.writeFileSync(path.join(frontendPublicDir, 'installerHeader.png'), headerPngBuf);

  const { data: rawHeader, info: headerInfo } = await headerSharp
    .clone()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const headerBmp = encodeBMP(headerInfo.width, headerInfo.height, rawHeader);
  fs.writeFileSync(path.join(tauriIconsDir, 'installerHeader.bmp'), headerBmp);
  fs.writeFileSync(path.join(frontendPublicDir, 'installerHeader.bmp'), headerBmp);
  console.log(`Saved installerHeader.bmp (${headerBmp.length} bytes) and installerHeader.png`);
}

main().catch(console.error);
