import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { Depot } from '../types';
import { sqliteService } from '../services/sqlite';

interface DepotContextType {
  depots: Depot[];
  isLoading: boolean;
  hasError: boolean;
  refreshDepots: () => Promise<void>;
}

const DepotContext = createContext<DepotContextType | undefined>(undefined);

export const DepotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [depots, setDepots] = useState<Depot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fetchDepots = useCallback(async (isBackground = false, retryCount = 0) => {
    let isRetrying = false;
    try {
      if (!isBackground && retryCount === 0) {
        setIsLoading(true);
        setHasError(false);
        // Load from SQLite cache first
        try {
          const cached = await sqliteService.getAllFromTable('depots');
          if (cached && cached.length > 0) {
            setDepots(cached);
          }
        } catch (e) {
          console.warn("Erro ao ler depósitos do SQLite:", e);
        }
      }

      console.log(`[DepotContext] Iniciando busca de depósitos (isBackground: ${isBackground}, retry: ${retryCount})`);

      const { data, error } = await supabase.from('depots').select('*');
      
      if (error) {
        console.error("[DepotContext] Erro Supabase ao carregar depósitos:", error);
        throw error;
      }

      if (data) {
        console.log(`[DepotContext] Recebidos ${data.length} depósitos do Supabase.`);
        
        if (data.length === 0) {
          console.warn("[DepotContext] A tabela 'depots' está vazia no Supabase.");
        }

        const mapped: Depot[] = data.map((d: any, index: number) => {
          try {
            // Lógica baseada no campo is_open ou isOpen do banco de dados
            const isOpenByTime = d.is_open !== undefined ? !!d.is_open : (d.isOpen !== undefined ? !!d.isOpen : true);
            
            // Fallback para dias de funcionamento
            const displayWorkingDays = d.working_days || 
              ((d.dias_de_abertura && d.dias_de_fecho) ? `${d.dias_de_abertura} a ${d.dias_de_fecho}` : 'Segunda a Sexta');

            // Fallback para horário de funcionamento
            let displayOpeningHours = d.opening_hours;
            if (!displayOpeningHours && d.horario_abertura && d.horario_fecho) {
              displayOpeningHours = `${d.horario_abertura} - ${d.horario_fecho}`;
            }
            if (!displayOpeningHours) {
              displayOpeningHours = '08:00 - 18:00';
            }

            return {
              id: d.id,
              name: d.name || 'Depósito sem nome',
              address: d.address || 'Endereço não informado',
              price: Number(d.price) || 0,
              stock: Number(d.stock) || 0,
              isOpen: isOpenByTime,
              latitude: Number(d.latitude) || 0,
              longitude: Number(d.longitude) || 0,
              imageUrl: d.image_url || d.imageUrl || 'https://images.unsplash.com/photo-1584263347416-85a18a45a449?auto=format&fit=crop&q=80&w=400',
              phone: d.phone || '',
              category: d.category || 'Económico',
              rating: Number(d.rating) || 4.5,
              reviewCount: Number(d.review_count || d.reviewCount) || 0,
              openingHours: displayOpeningHours,
              horarioAbertura: d.horario_abertura || displayOpeningHours.split(' - ')[0] || '08:00',
              horarioFecho: d.horario_fecho || displayOpeningHours.split(' - ')[1] || '18:00',
              diasDeAbertura: d.dias_de_abertura || 'Segunda',
              diasDeFecho: d.dias_de_fecho || 'Sexta',
              workingDays: displayWorkingDays,
              pickupTime: d.delivery_time || d.pickupTime || '20-40 min',
              distance: 'Calculando...',
              isVerified: !!(d.is_verified || d.isVerified)
            };
          } catch (mapErr) {
            console.error(`[DepotContext] Erro ao mapear depósito no índice ${index}:`, d, mapErr);
            return null;
          }
        }).filter(Boolean) as Depot[];

        setDepots(mapped);
        setHasError(false);
        try {
          // Save each depot to SQLite
          for (const depot of mapped) {
            await sqliteService.saveData('depots', depot.id, depot);
          }
        } catch (e: any) {
          console.warn("Erro ao salvar depósitos no SQLite:", e);
        }
      }
    } catch (err: any) {
      if (!isBackground) {
        console.error("[DepotContext] Erro ao carregar depósitos:", err);
      }
      
      const isNetworkError = err.message === 'TypeError: Failed to fetch' || 
                             err.name === 'AbortError' || 
                             err.message?.includes('NetworkError') ||
                             err.message?.includes('Failed to fetch') ||
                             err.code === 'PGRST301' ||
                             err.status === 0;

      // Retry logic for network errors
      if (retryCount < 3 && isNetworkError) {
        isRetrying = true;
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`[DepotContext] Tentando novamente carregar depósitos em ${delay}ms (${retryCount + 1}/3)...`);
        setTimeout(() => fetchDepots(isBackground, retryCount + 1), delay);
      } else {
        // Only set error state if we have no data at all
        setDepots(prev => {
          if (prev.length === 0) {
            setHasError(true);
          }
          return prev;
        });
      }
    } finally {
      if (!isBackground && !isRetrying) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchDepots();
    
    const timer = setInterval(() => fetchDepots(true), 60000);
    const channel = supabase.channel('depots_realtime')
      .on('postgres_changes', { event: '*', table: 'depots', schema: 'public' }, () => fetchDepots(true))
      .subscribe();
    
    return () => { 
      clearInterval(timer);
      supabase.removeChannel(channel); 
    };
  }, []);

  return (
    <DepotContext.Provider value={{ depots, isLoading, hasError, refreshDepots: fetchDepots }}>
      {children}
    </DepotContext.Provider>
  );
};

export const useDepots = () => {
  const context = useContext(DepotContext);
  if (!context) throw new Error('useDepots must be used within a DepotProvider');
  return context;
};
