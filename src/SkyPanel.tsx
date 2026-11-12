import {useEffect, useRef, useState, type ReactNode} from 'react';
import {X} from 'lucide-react';

export function SkyPanel({title, onClose, children, name, closeLabel}: {title: string; onClose: () => void; children: ReactNode; name: string; closeLabel: string}) {
  const root = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose); onCloseRef.current = onClose;
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);
  /** Slide the sheet out before the parent unmounts it; reduced motion closes at once. */
  const close = useRef(() => {
    if (closeTimer.current !== null) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { onCloseRef.current(); return; }
    setClosing(true);
    closeTimer.current = window.setTimeout(() => onCloseRef.current(), 170);
  });
  useEffect(() => () => { if (closeTimer.current !== null) clearTimeout(closeTimer.current); }, []);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    root.current?.querySelector<HTMLButtonElement>('.panel-close')?.focus({preventScroll: true});
    return () => {
      if (previous?.isConnected && !previous.closest('[inert]')) previous.focus({preventScroll: true});
      else document.querySelector<HTMLElement>('[data-default-focus]')?.focus({preventScroll: true});
    };
  }, []);
  return <div className={`panel-backdrop${closing ? ' is-closing' : ''}`} onPointerDown={event => { if (event.target === event.currentTarget) close.current(); }}>
    <section className={`sky-sheet panel-${name}`} ref={root} role="dialog" aria-modal="true" aria-label={title} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close.current(); }
      if (event.key === 'Tab') {
        const items = [...root.current!.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],summary,[tabindex="0"]')].filter(element => element.getClientRects().length > 0);
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
      <header className="sheet-head"><h1>{title}</h1><button className="panel-close" onClick={() => close.current()} aria-label={closeLabel}><X size={22}/></button></header>
      <div className="sheet-body">{children}</div>
    </section>
  </div>;
}
