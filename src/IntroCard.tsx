import {Compass, Hand, Layers, Search, Star} from 'lucide-react';
import {useEffect, useRef} from 'react';

/** F-034: a short first-run introduction; can be reopened from More. */
export const INTRO_KEY = 'noxari-intro-seen';
export const shouldShowIntro = () => {
  try { return !localStorage.getItem(INTRO_KEY) && !navigator.webdriver; } catch { return false; }
};

export function IntroCard({language, onClose}: {language: 'en' | 'sv'; onClose: () => void}) {
  const sv = language === 'sv';
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => { button.current?.focus({preventScroll: true}); }, []);
  const tips: [JSX.Element, string, string][] = [
    [<Hand size={22}/>, sv ? 'Svep för att se dig omkring' : 'Swipe to look around', sv ? 'Nyp med två fingrar för att zooma.' : 'Pinch with two fingers to zoom.'],
    [<Compass size={22}/>, sv ? 'Följ med telefonen' : 'Follow with your phone', sv ? 'Tryck Följ uppe till höger och håll upp telefonen mot himlen.' : 'Tap Follow at the top right and hold your phone up to the sky.'],
    [<Search size={22}/>, sv ? 'Sök och tryck på objekt' : 'Search and tap objects', sv ? 'Välj ett objekt och tryck Visa på himlen eller Guida.' : 'Pick an object, then tap Show in sky or Guide.'],
    [<Star size={22}/>, sv ? 'Se vad som syns i natt' : 'See what is up tonight', sv ? 'Ikväll föreslår objekt för vald natt och utrustning.' : 'Tonight suggests targets for the selected night and equipment.'],
    [<Layers size={22}/>, sv ? 'Anpassa himlen' : 'Customize the sky', sv ? 'Lager slår på och av teckningar, linjer, rutnät och rödfilter.' : 'Layers toggles drawings, lines, grid and red mode.'],
  ];
  return <div className="intro-backdrop" role="dialog" aria-modal="true" aria-labelledby="intro-title" onKeyDown={event => { if (event.key === 'Escape') onClose(); }}>
    <section className="intro-card">
      <h1 id="intro-title">{sv ? 'Välkommen till Noxari' : 'Welcome to Noxari'}</h1>
      <p className="intro-lead">{sv ? 'En beräknad stjärnhimmel för din plats och tid.' : 'A calculated night sky for your place and time.'}</p>
      <ul>{tips.map(([icon, title, text]) => <li key={title}><span className="intro-icon">{icon}</span><span><strong>{title}</strong><small>{text}</small></span></li>)}</ul>
      <button ref={button} className="wide-action primary" onClick={onClose}>{sv ? 'Kom igång' : 'Get started'}</button>
    </section>
  </div>;
}
