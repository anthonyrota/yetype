import { BehaviorSubject } from 'rxjs';
import { themeStorageKey } from './storageKeys.js';

export const enum Theme {
  Light = 'light',
  Dark = 'dark',
}

export function storeTheme(theme: Theme | null): void {
  if (theme === null) {
    localStorage.removeItem(themeStorageKey);
    return;
  }
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch (error) {
    console.log('localStorage error', error);
  }
}

export function loadTheme(): Theme | null {
  const themeRaw = localStorage.getItem(themeStorageKey);
  if (themeRaw === Theme.Light || themeRaw === Theme.Dark) {
    return themeRaw;
  }
  return null;
}

export const theme$ = new BehaviorSubject<Theme>(loadTheme() ?? Theme.Dark);

export function setTheme(theme: Theme): void {
  storeTheme(theme);
  theme$.next(theme);
}
