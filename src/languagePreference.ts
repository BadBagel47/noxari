/** Interface language: Auto follows the device/browser language; users may override. */
export type Language = 'en' | 'sv';
export type LanguagePreference = 'auto' | Language;
export const LANGUAGE_PREFERENCE_KEY = 'noxari-lang-pref';

export function parseLanguagePreference(value: string | null): LanguagePreference {
  return value === 'en' || value === 'sv' ? value : 'auto';
}

export function deviceLanguage(languages: readonly string[]): Language {
  return languages[0]?.toLowerCase().startsWith('sv') ? 'sv' : 'en';
}

/** A shared link's ?lang= wins for that visit, then an explicit choice, then the device. */
export function resolveLanguage(queryLanguage: string | null, preference: LanguagePreference, languages: readonly string[]): Language {
  if (queryLanguage === 'en' || queryLanguage === 'sv') return queryLanguage;
  return preference === 'auto' ? deviceLanguage(languages) : preference;
}
