
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { UserProfile, UserType } from '../types';
import { sqliteService } from '../services/sqlite';

interface AuthContextType {
  session: any;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isDeposito: boolean;
  isResettingPassword: boolean;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updated: any) => void;
  setIsResettingPassword: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const fetchProfile = useCallback(async (userId: string, retryCount = 0) => {
    let isRetrying = false;
    try {
      // Load from SQLite cache first
      try {
        const cached = await sqliteService.getData('user_profile', userId);
        if (cached) {
          setProfile(cached);
        }
      } catch (e) {
        console.warn("Erro ao ler perfil do SQLite:", e);
      }

      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      
      if (error) {
        console.error("Erro ao buscar perfil:", error);
        
        const isNetworkError = error.message === 'TypeError: Failed to fetch' || 
                               error.name === 'AbortError' ||
                               error.message?.includes('NetworkError') ||
                               error.message?.includes('Failed to fetch') ||
                               (error as any).status === 0 ||
                               error.code === 'PGRST301';

        if (retryCount < 2 && isNetworkError) {
          isRetrying = true;
          const delay = Math.pow(2, retryCount) * 1000;
          setTimeout(() => fetchProfile(userId, retryCount + 1), delay);
        }
      }

      if (data) {
        // Mapeamento rigoroso baseado na estrutura real da tabela
        const mappedProfile: UserProfile = {
          ...data,
          userType: data.userType, // Coluna real é "userType"
          depotId: data.depot_id,
          companyId: data.companyId, // Coluna real é "companyId"
          balance: Number(data.balance || 0), // Garantir que seja número
          is_active: data.is_active !== false,
          is_verified: !!data.is_verified
        };
        setProfile(mappedProfile);
        try {
          await sqliteService.saveData('user_profile', userId, mappedProfile);
        } catch (e: any) {
          console.warn("Erro ao salvar perfil no SQLite:", e);
        }
      }
    } finally {
      if (!isRetrying) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Obter sessão de forma assíncrona
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Erro ao obter sessão:", error.message);
          if (error.message.includes("Refresh Token Not Found") || error.message.includes("invalid_refresh_token")) {
            await supabase.auth.signOut();
            setIsLoading(false);
          } else {
            setIsLoading(false);
          }
        } else if (session) {
          setSession(session);
          // Iniciar busca do perfil imediatamente
          await fetchProfile(session.user.id);
        } else {
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error("Erro fatal na inicialização do Auth:", err);
        
        // Se for erro de quota, tentamos limpar caches secundários para permitir que o Auth funcione
        if (err.name === 'QuotaExceededError' || err.message?.includes('quota')) {
          console.warn("Limpando caches para libertar espaço...");
          try {
            localStorage.removeItem('depots_cache');
            localStorage.removeItem('banners_cache');
            localStorage.removeItem('orders_cache');
            // Tentar recuperar a sessão novamente
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              setSession(session);
              await fetchProfile(session.user.id);
            } else {
              setIsLoading(false);
            }
          } catch (retryErr) {
            console.error("Falha na recuperação após limpeza:", retryErr);
            setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log("Evento Auth:", event);
      setSession(newSession);
      
      if (event === 'PASSWORD_RECOVERY') {
        setIsResettingPassword(true);
      }
      
      if (newSession) {
        fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
        // Se o evento for de erro ou expiração, garantimos que o storage está limpo
        if (event === 'SIGNED_OUT') {
          // Opcional: limpar caches locais se necessário
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = (email: string, pass: string) => supabase.auth.signInWithPassword({ email, password: pass });
  const logout = () => supabase.auth.signOut();
  const refreshProfile = () => profile ? fetchProfile(profile.id) : Promise.resolve();
  const updateProfile = (updated: any) => setProfile(updated);

  const isAdmin = profile?.userType?.toString().toUpperCase() === 'ADMIN';
  const isDeposito = profile?.userType?.toString().toUpperCase() === 'DEPOSITO';

  return (
    <AuthContext.Provider value={{ 
      session, profile, isLoading, isAuthenticated: !!session, 
      isAdmin, isDeposito, isResettingPassword, login, logout, refreshProfile, updateProfile,
      setIsResettingPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
