import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** Renders a QR image locally (no network). Medium error correction keeps it scannable from a cracked or dim phone screen. */
export default function QrCode({ value, size = 240, label }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(value, { errorCorrectionLevel: 'M', margin: 2, width: size * 2, color: { dark: '#14303a', light: '#ffffff' } }).then((u) => live && setSrc(u));
    return () => { live = false; };
  }, [value, size]);
  return src ? <img src={src} width={size} height={size} alt={label || 'QR code'} style={{ display: 'block', imageRendering: 'pixelated', background: '#fff' }} /> : <div style={{ width: size, height: size }} />;
}
