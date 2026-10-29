import {useEffect, useRef, type ReactNode} from 'react';
import {X} from 'lucide-react';

export function SkyPanel({title, onClose, children, name, closeLabel}: {title: string; onClose: () => void; children: ReactNode; name: string; closeLabel: string}) {
  const root = useRef<HTMLElement>(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    root.current?.querySelector<HTMLButtonElement>('.panel-close')?.focus();
    return () => {
      if (previous?.isConnected && !previous.closest('[inert]')) previous.focus({preventScroll: true});
      else document.querySelector<HTMLElement>('[data-default-focus]')?.focus({preventScroll: true});
    };
  }, []);
  return <div className="panel-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) close.current(); }}>
    <section className={`sky-sheet panel-${name}`} ref={root} role="dialog" aria-modal="true" aria-label={title} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close.current(); }
      if (event.key === 'Tab') {
        const items = [...root.current!.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],summary,[tabindex="0"]')].filter(element => element.getClientRects().length > 0);
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
      <header className="sheet-head"><h1>{title}</h1><button className="panel-close" onClick={onClose} aria-label={closeLabel}><X size={22}/></button></header>
      <div className="sheet-body">{children}</div>
    </section>
  </div>;
}
