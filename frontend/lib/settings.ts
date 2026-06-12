'use client';

/**
 * App settings persisted in localStorage.
 * useSettings() re-renders all subscribers when any component updates a value.
 */

import { useEffect, useState, useCallback } from 'react';

export interface PrismSettings {
  /** Show low-risk / standard clauses in the results clause list */
  showSafeClauses: boolean;
}

const DEFAULTS: PrismSettings = {
  showSafeClauses: true,
};

const STORAGE_KEY = 'prism-settings';
const EVENT_NAME  = 'prism-settings-changed';

export function loadSettings(): PrismSettings {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function useSettings(): [PrismSettings, (patch: Partial<PrismSettings>) => void] {
  const [settings, setSettings] = useState<PrismSettings>(DEFAULTS);

  useEffect(() => {
    setSettings(loadSettings());
    const onChange = () => setSettings(loadSettings());
    window.addEventListener(EVENT_NAME, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(EVENT_NAME, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const update = useCallback((patch: Partial<PrismSettings>) => {
    const next = { ...loadSettings(), ...patch };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT_NAME));
  }, []);

  return [settings, update];
}
