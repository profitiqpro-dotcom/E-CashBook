import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Settings } from './types';

let cachedSettings: Settings | null = null;
const listeners = new Set<(s: Settings | null) => void>();

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(cachedSettings);

  useEffect(() => {
    let mounted = true;
    const listener = (s: Settings | null) => mounted && setSettings(s);
    listeners.add(listener);
    if (!cachedSettings) {
      supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            cachedSettings = data as Settings;
            listeners.forEach((l) => l(cachedSettings));
          }
        });
    }
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return settings;
}

export async function updateSettings(patch: Partial<Settings>) {
  const { data, error } = await supabase
    .from('settings')
    .update(patch)
    .eq('id', 1)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (data) {
    cachedSettings = data as Settings;
    listeners.forEach((l) => l(cachedSettings));
  }
  return data as Settings;
}

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return { dark, setDark, toggle: () => setDark((d) => !d) };
}
