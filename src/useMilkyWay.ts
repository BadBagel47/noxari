import {useEffect, useState} from 'react';
import textureUrl from './generated/milkyWay.png';
import type {MilkyWayTexture} from './milkyWay';

let pending: Promise<MilkyWayTexture> | undefined;
function loadTexture() {
  pending ??= new Promise<MilkyWayTexture>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.width; canvas.height = image.height;
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        resolve({width: image.width, height: image.height, pixels: context.getImageData(0, 0, image.width, image.height).data});
      } catch (error) { reject(error); }
    };
    image.onerror = () => reject(new Error('Milky Way texture could not be loaded'));
    image.src = textureUrl;
  }).catch(error => { pending = undefined; throw error; });
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
  return {texture: enabled ? texture : null, failed: enabled && failed};
}
