import {describe, expect, it} from 'vitest';
import {deviceLanguage, parseLanguagePreference, resolveLanguage} from '../src/languagePreference';

describe('interface language preference', () => {
  it('follows the first device language in auto mode', () => {
    expect(deviceLanguage(['sv-SE', 'en-US'])).toBe('sv');
    expect(deviceLanguage(['en-GB', 'sv'])).toBe('en');
    expect(deviceLanguage([])).toBe('en');
    expect(resolveLanguage(null, 'auto', ['sv'])).toBe('sv');
  });
  it('honours explicit choices and shared-link languages', () => {
    expect(resolveLanguage(null, 'en', ['sv-SE'])).toBe('en');
    expect(resolveLanguage('sv', 'en', ['en'])).toBe('sv');
    expect(resolveLanguage('xx', 'auto', ['en'])).toBe('en');
  });
  it('treats unknown stored values as auto', () => {
    expect(parseLanguagePreference(null)).toBe('auto');
    expect(parseLanguagePreference('de')).toBe('auto');
    expect(parseLanguagePreference('sv')).toBe('sv');
  });
});
