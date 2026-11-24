import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchSiteSettings } from '../lib/carsApi';
import { isSupabaseConfigured } from '../lib/supabase';
import type { SiteSettings } from '../types/database';

interface SiteSettingsContextValue {
  settings: SiteSettings | null;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue>({
  settings: null,
  loading: true,
  error: null,
  refreshSettings: async () => {},
});

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchSiteSettings();
      setSettings(data);
    } catch {
      setError('Something went wrong, please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, error, refreshSettings: load }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
