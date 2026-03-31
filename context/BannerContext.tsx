
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { Banner } from '../types';
import { sqliteService } from '../services/sqlite';

interface BannerContextType {
  banners: Banner[];
  isLoading: boolean;
  refreshBanners: () => Promise<void>;
}

const BannerContext = createContext<BannerContextType | undefined>(undefined);

export const BannerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBanners = useCallback(async (retryCount = 0) => {
    let isRetrying = false;
    try {
      if (retryCount === 0) {
        setIsLoading(true);
        // Load from SQLite cache first
        try {
          const cached = await sqliteService.getAllFromTable('banners');
          if (cached && cached.length > 0) {
            setBanners(cached);
          }
        } catch (e) {
          console.warn("Erro ao ler banners do SQLite:", e);
        }
      }

      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      
      if (error) throw error;

      if (data) {
        setBanners(data);
        try {
          // Save each banner to SQLite
          for (const banner of data) {
            await sqliteService.saveData('banners', banner.id, banner);
          }
        } catch (e: any) {
          console.warn("Erro ao salvar banners no SQLite:", e);
        }
      }
    } catch (err: any) {
      console.error("Erro ao carregar banners:", err);
      
      const isNetworkError = err.message === 'TypeError: Failed to fetch' || 
                             err.name === 'AbortError' ||
                             err.message?.includes('NetworkError') ||
                             err.message?.includes('Failed to fetch') ||
                             err.status === 0 ||
                             err.code === 'PGRST301';

      if (retryCount < 2 && isNetworkError) {
        isRetrying = true;
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => fetchBanners(retryCount + 1), delay);
      }
    } finally {
      if (!isRetrying) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchBanners();
    
    // Real-time updates for banners
    const channel = supabase
      .channel('public:banners')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, () => {
        fetchBanners();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <BannerContext.Provider value={{ banners, isLoading, refreshBanners: fetchBanners }}>
      {children}
    </BannerContext.Provider>
  );
};

export const useBanners = () => {
  const context = useContext(BannerContext);
  if (!context) throw new Error('useBanners must be used within a BannerProvider');
  return context;
};
