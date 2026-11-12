import {useEffect, useRef, useState, type ReactNode} from 'react';

export type QuickLayer = {id: string; label: string; icon: ReactNode; on: boolean; toggle: () => void};

/**
 * F-051: Stellarium-like quick toggles for visual layers. Collapsed by default behind one small
 * button in the dock; the row opens above the dock (beside it on the side rail). Icons show on/off;
 * the name appears on hover and briefly after each tap. Same state as Layers.
 */
export function QuickLayers({language, open, onOpenChange, layers}: {
  language: 'en' | 'sv'; open: boolean; onOpenChange: (open: boolean) => void; layers: QuickLayer[];
}) {
  const sv = language === 'sv';
  const [flash, setFlash] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { if (!open) setFlash(null); }, [open]);
  return <>
    {open && <div className="quick-layers" role="group" aria-label={sv ? 'Snabbval för lager' : 'Quick layer toggles'}>
      {flash && <p className="quick-layers-flash" role="status">{flash}</p>}
      {layers.map(layer => <button key={layer.id} aria-pressed={layer.on} aria-label={layer.label} title={layer.label} onClick={() => {
        layer.toggle();
        setFlash(`${layer.label}: ${layer.on ? (sv ? 'av' : 'off') : (sv ? 'på' : 'on')}`);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setFlash(null), 1600);
      }}>{layer.icon}</button>)}
    </div>}
    <button className={`quick-layers-toggle ${open ? 'is-open' : ''}`} aria-expanded={open} aria-label={sv ? 'Snabbval för lager' : 'Quick layer toggles'} title={sv ? 'Snabbval för lager' : 'Quick layer toggles'} onClick={() => onOpenChange(!open)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>
    </button>
  </>;
}
