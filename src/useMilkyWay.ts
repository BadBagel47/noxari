import {useEffect, useState} from 'react';
import textureUrl from './generated/milkyWay.png';
import type {MilkyWayTexture} from './milkyWay';

let pending: Promise<MilkyWayTexture> | undefined;
function decode(url: string, color: boolean) {
  return new Promise<MilkyWayTexture>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.width; canvas.height = image.height;
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        resolve({width: image.width, height: image.height, pixels: context.getImageData(0, 0, image.width, image.height).data, color});
      } catch (error) { reject(error); }
    };
    image.onerror = () => reject(new Error('Milky Way texture could not be loaded'));
    image.src = url;
  });
}
/** F-056: the colour panorama (≈1.3 MB) first; the small grey grid stays as a fallback. */
function loadTexture() {
  pending ??= decode(`${import.meta.env.BASE_URL}sky/milky-way-color-v1.webp`, true)
    .catch(() => decode(textureUrl, false))
    .catch(error => { pending = undefined; throw error; });
  return pending;
}

export function useMilkyWay(enabled: boolean) {
  const [texture, setTexture] = useState<MilkyWayTexture | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setFailed(false);
    loadTexture().then(value => { if (!cancelled) setTexture(value); }, () => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [enabled]);
  // Keep a loaded texture when the layer is switched off so the sky can fade it out (F-037).
  return {texture, failed: enabled && failed};
}
