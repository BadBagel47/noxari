import {useEffect, useState} from 'react';

/** F-033: objects the user has marked as seen, with an optional note. Stored only on this device. */
export type LogEntry = {id: string; at: string; note: string};
const KEY = 'noxari-log';

export function parseLog(value: string | null): LogEntry[] {
  try {
    const parsed = JSON.parse(value ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(item => item && typeof item.id === 'string' && typeof item.at === 'string' && !Number.isNaN(Date.parse(item.at))).map(item => ({id: item.id, at: item.at, note: typeof item.note === 'string' ? item.note.slice(0, 500) : ''})) : [];
  } catch { return []; }
}

export function useObservationLog() {
  const [log, setLog] = useState<LogEntry[]>(() => parseLog(localStorage.getItem(KEY)));
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(log)); }, [log]);
  return {
    log,
    entry: (id: string) => log.find(item => item.id === id) ?? null,
    mark: (id: string, note = '', at = new Date()) => setLog(current => [{id, at: at.toISOString(), note: note.trim().slice(0, 500)}, ...current.filter(item => item.id !== id)]),
    setNote: (id: string, note: string) => setLog(current => current.map(item => item.id === id ? {...item, note: note.slice(0, 500)} : item)),
    remove: (id: string) => setLog(current => current.filter(item => item.id !== id)),
  };
}
