import {useEffect, useState} from 'react';

/** F-028: register the offline service worker (production builds over HTTPS only). */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !window.isSecureContext) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {scope: import.meta.env.BASE_URL}).catch(() => { /* offline support is optional */ });
  });
}

type InstallEvent = Event & {prompt: () => Promise<void>; userChoice: Promise<{outcome: string}>};
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & {standalone?: boolean}).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Install prompt where the browser offers one (Chromium); an instruction on iOS Safari. */
export function useInstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(standalone);
  useEffect(() => {
    const capture = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent); };
    const done = () => { setInstalled(true); setEvent(null); };
    window.addEventListener('beforeinstallprompt', capture);
    window.addEventListener('appinstalled', done);
    return () => { window.removeEventListener('beforeinstallprompt', capture); window.removeEventListener('appinstalled', done); };
  }, []);
  return {
    installed,
    canPrompt: !installed && event !== null,
    iosHint: !installed && event === null && isIos(),
    install: async () => { if (!event) return; await event.prompt(); await event.userChoice.catch(() => null); setEvent(null); },
  };
}
