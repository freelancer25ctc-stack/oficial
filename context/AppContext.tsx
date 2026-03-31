
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppTab, AppNotification } from '../types';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

interface AppContextType {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  themePreference: 'light' | 'dark' | 'system';
  setThemePreference: (pref: 'light' | 'dark' | 'system') => Promise<void>;
  isDark: boolean;
  gpsEnabled: boolean;
  userCoords: { lat: number, lng: number } | null;
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  createNotification: (title: string, message: string, type: 'system' | 'order' | 'promo' | 'wallet') => Promise<void>;
  createNotificationForUser: (userId: string, title: string, message: string, type: 'system' | 'order' | 'promo' | 'wallet') => Promise<void>;
  notifyAllUsers: (title: string, message: string, type: 'system' | 'order' | 'promo' | 'wallet') => Promise<void>;
  notifyAdmins: (title: string, message: string, type: 'system' | 'order' | 'promo' | 'wallet') => Promise<void>;
  playNotificationSound: () => void;
  stopNotificationSound: () => void;
  isOffline: boolean;
  isBalanceVisible: boolean;
  setIsBalanceVisible: (visible: boolean) => void;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  selectedDepotId: string | null;
  setSelectedDepotId: (id: string | null) => void;
  depositoView: 'dashboard' | 'products' | 'settings' | 'reservations' | 'reports';
  setDepositoView: (view: 'dashboard' | 'products' | 'settings' | 'reservations' | 'reports') => void;
  favorites: string[];
  toggleFavorite: (depotId: string) => Promise<void>;
  isFavorite: (depotId: string) => boolean;
  submitReview: (depotId: string, rating: number, comment: string, orderId?: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

import { sqliteService } from '../services/sqlite';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.HOME);
  const [isSystemDark, setIsSystemDark] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsSystemDark(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsSystemDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const [themePreference, setThemePreferenceState] = useState<'light' | 'dark' | 'system'>('system');
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [hasNotificationsTable, setHasNotificationsTable] = useState<boolean | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [selectedDepotId, setSelectedDepotId] = useState<string | null>(null);
  const [depositoView, setDepositoView] = useState<'dashboard' | 'products' | 'settings' | 'reservations' | 'reports'>('dashboard');
  const [notificationAudio] = useState(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (profile?.theme_preference) {
      setThemePreferenceState(profile.theme_preference);
    } else {
      setThemePreferenceState('system');
    }
  }, [profile?.theme_preference]);

  const setThemePreference = async (pref: 'light' | 'dark' | 'system') => {
    setThemePreferenceState(pref);
    
    if (isAuthenticated && profile?.id) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ theme_preference: pref })
          .eq('id', profile.id);
        
        if (error) throw error;
      } catch (err: any) {
        console.error("Erro ao salvar preferência de tema:", err.message);
      }
    }
  };

  const isDark = isAuthenticated 
    ? (themePreference === 'system' ? isSystemDark : themePreference === 'dark')
    : isSystemDark;

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const isInternalChange = React.useRef(false);

  // Sync state to history
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    const state = { 
      tab: activeTab, 
      isNotificationsOpen, 
      depositoView, 
      selectedDepotId 
    };

    // If it's the very first load and no state exists, replace it
    if (!window.history.state) {
      window.history.replaceState(state, '', '');
    } else {
      // Only push if something actually changed compared to current history state
      const currentState = window.history.state;
      if (
        currentState.tab !== activeTab || 
        currentState.isNotificationsOpen !== isNotificationsOpen || 
        currentState.depositoView !== depositoView || 
        currentState.selectedDepotId !== selectedDepotId
      ) {
        window.history.pushState(state, '', '');
      }
    }
  }, [activeTab, isNotificationsOpen, depositoView, selectedDepotId]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        isInternalChange.current = true;
        const { tab, isNotificationsOpen: notisOpen, depositoView: dView, selectedDepotId: sId } = event.state;
        if (tab) setActiveTab(tab);
        if (notisOpen !== undefined) setIsNotificationsOpen(notisOpen);
        if (dView) setDepositoView(dView);
        if (sId !== undefined) setSelectedDepotId(sId);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (profile?.favorites) {
      setFavorites(profile.favorites);
    } else {
      setFavorites([]);
    }
  }, [profile?.favorites]);

  const isFavorite = (depotId: string) => favorites.includes(depotId);

  const toggleFavorite = async (depotId: string) => {
    if (!profile?.id) return;

    const newFavorites = isFavorite(depotId)
      ? favorites.filter(id => id !== depotId)
      : [...favorites, depotId];

    // Optimistic update
    setFavorites(newFavorites);

    if (isOffline) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ favorites: newFavorites })
        .eq('id', profile.id);

      if (error) throw error;
    } catch (err: any) {
      console.error("Erro ao atualizar favoritos:", err.message);
      // Rollback on error
      setFavorites(favorites);
    }
  };

  const submitReview = async (depotId: string, rating: number, comment: string, orderId?: string) => {
    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          user_id: profile.id,
          depot_id: depotId,
          order_id: orderId,
          rating,
          comment
        });

      if (error) throw error;

      // If it's an order review, update the order status to rated
      if (orderId) {
        await supabase
          .from('orders')
          .update({ isRated: true, userRating: rating })
          .eq('id', orderId);
      }

      // Create a notification for the depot if needed
      // (Optional: You could notify the depot that they received a new review)
      
    } catch (err: any) {
      console.error("Erro ao enviar avaliação:", err.message);
      throw err;
    }
  };

  useEffect(() => {
    notificationAudio.loop = true;
    return () => {
      notificationAudio.pause();
    };
  }, [notificationAudio]);

  const playNotificationSound = () => {
    notificationAudio.play().catch(e => console.warn("Audio play blocked by browser.", e));
  };

  const stopNotificationSound = () => {
    notificationAudio.pause();
    notificationAudio.currentTime = 0;
  };

  const fetchNotifications = async (retryCount = 0) => {
    if (!profile?.id) return;

    let isRetrying = false;
    // Load from SQLite cache first (only on first attempt)
    if (retryCount === 0) {
      try {
        const cached = await sqliteService.getAllFromTable('notifications');
        if (cached && cached.length > 0) {
          setNotifications(cached);
        }
      } catch (e) {
        console.warn("Erro ao ler notificações do SQLite:", e);
      }
    }

    if (isOffline || hasNotificationsTable === false) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        const isTableMissing = error.code === 'PGRST116' || 
                              error.message.includes('not found') || 
                              error.message.includes('schema cache');
        
        if (isTableMissing) {
          setHasNotificationsTable(false);
          return;
        }
        throw error;
      }

      setHasNotificationsTable(true);
      if (data) {
        const mapped = data.map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          date: n.created_at,
          read: n.read,
          type: n.type
        }));
        setNotifications(mapped);
        try {
          // Save each notification to SQLite
          for (const notif of mapped) {
            await sqliteService.saveData('notifications', notif.id, notif);
          }
        } catch (e: any) {
          console.warn("Erro ao salvar notificações no SQLite:", e);
        }
      }
    } catch (err: any) {
      console.error("Erro ao carregar notificações:", err.message);
      
      const isNetworkError = err.message?.includes('NetworkError') || 
                             err.message?.includes('Failed to fetch') ||
                             err.name === 'AbortError' ||
                             err.status === 0;

      if (retryCount < 3 && isNetworkError) {
        isRetrying = true;
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`Retrying fetchNotifications in ${delay}ms (${retryCount + 1}/3)...`);
        setTimeout(() => fetchNotifications(retryCount + 1), delay);
      }
    }
  };

  const createNotification = async (title: string, message: string, type: 'system' | 'order' | 'promo' | 'wallet') => {
    if (!profile?.id) return;
    await createNotificationForUser(profile.id, title, message, type);
  };

  const createNotificationForUser = async (userId: string, title: string, message: string, type: 'system' | 'order' | 'promo' | 'wallet') => {
    const now = new Date().toISOString();

    // Se estiver online, inserimos no Supabase
    if (!isOffline && hasNotificationsTable !== false) {
      try {
        const { error } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            title,
            message,
            type,
            read: false,
            created_at: now
          });

        if (error) {
          const isTableMissing = error.message.includes('not found') || 
                                error.message.includes('schema cache');
          if (isTableMissing) {
            setHasNotificationsTable(false);
          } else if (error.message.includes('row-level security')) {
            // Silently ignore RLS errors as they are expected when notifying other users
            // without a service role or backend.
            console.warn("RLS policy prevents sending notification to another user.");
          } else {
            console.error("Erro ao persistir notificação no Supabase:", error.message);
          }
        } else {
          // Sucesso! O Real-time listener cuidará de adicionar à lista se for o usuário atual
          return;
        }
      } catch (err) {
        // Falha, tenta local se for o usuário atual
      }
    }

    // Modo Local (Offline ou Tabela ausente) - Apenas se for o usuário atual
    if (profile?.id === userId) {
      const newLocalNotif: AppNotification = {
        id: Math.random().toString(36).substr(2, 9),
        title,
        message,
        type,
        read: false,
        date: now
      };

      const updatedNotifs = [newLocalNotif, ...notifications];
      setNotifications(updatedNotifs);
      try {
        await sqliteService.saveData('notifications', newLocalNotif.id, newLocalNotif);
      } catch (e: any) {
        console.warn("Erro ao salvar notificação local no SQLite:", e);
      }
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && profile?.id) {
      fetchNotifications();

      if (isOffline) return;

      // Real-time listener for new notifications
      const channel = supabase
        .channel(`notifications_user_${profile.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotif = payload.new as any;
            setNotifications(prev => {
              // Evitar duplicados verificando o ID
              if (prev.some(n => n.id === newNotif.id)) return prev;
              
              const updated = [{
                id: newNotif.id,
                title: newNotif.title,
                message: newNotif.message,
                date: newNotif.created_at,
                read: newNotif.read,
                type: newNotif.type
              }, ...prev];
              try {
                sqliteService.saveData('notifications', newNotif.id, updated[0]);
              } catch (e: any) {
                console.warn("Erro ao salvar notificação (Real-time) no SQLite:", e);
              }
              return updated;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            setNotifications(prev => {
              const mapped = prev.map(n => n.id === updated.id ? { ...n, read: updated.read } : n);
              try {
                const updatedNotif = mapped.find(n => n.id === updated.id);
                if (updatedNotif) {
                  sqliteService.saveData('notifications', updated.id, updatedNotif);
                }
              } catch (e: any) {
                console.warn("Erro ao atualizar notificação (Real-time) no SQLite:", e);
              }
              return mapped;
            });
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => {
              const filtered = prev.filter(n => n.id !== payload.old.id);
              try {
                sqliteService.deleteData('notifications', payload.old.id);
              } catch (e) {
                console.warn("Erro ao eliminar notificação (Real-time) no SQLite:", e);
              }
              return filtered;
            });
          }
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            // Silencioso, apenas marca que a tabela provavelmente não existe
            setHasNotificationsTable(false);
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setNotifications([]);
    }
  }, [isAuthenticated, profile?.id, isOffline]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsSystemDark(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsSystemDark(e.matches);
    mediaQuery.addEventListener('change', handler);

    if (Capacitor.isNativePlatform()) {
      const requestPermissions = async () => {
        try {
          const status = await Geolocation.requestPermissions();
          if (status.location === 'granted') {
            const watchId = await Geolocation.watchPosition(
              { enableHighAccuracy: true },
              (pos) => {
                if (pos) {
                  setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                  setGpsEnabled(true);
                }
              }
            );
            return () => {
              Geolocation.clearWatch({ id: watchId });
            };
          }
        } catch (e) {
          console.error("Erro ao solicitar permissões de GPS:", e);
        }
      };
      
      const cleanupPromise = requestPermissions();
      return () => {
        mediaQuery.removeEventListener('change', handler);
        cleanupPromise.then(cleanup => cleanup && cleanup());
      };
    } else if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsEnabled(true);
        },
        () => setGpsEnabled(false),
        { enableHighAccuracy: true }
      );
      return () => {
        mediaQuery.removeEventListener('change', handler);
        navigator.geolocation.clearWatch(watchId);
      };
    }
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const notifyAllUsers = async (title: string, message: string, type: 'system' | 'order' | 'promo' | 'wallet') => {
    if (isOffline) return;
    
    try {
      // Fetch all user IDs
      const { data: users, error: fetchError } = await supabase
        .from('profiles')
        .select('id');

      if (fetchError) throw fetchError;

      if (users && users.length > 0) {
        const notificationsToInsert = users.map(user => ({
          user_id: user.id,
          title,
          message,
          type,
          read: false,
          created_at: new Date().toISOString()
        }));

        // Insert in batches of 100 to avoid request size limits
        const batchSize = 100;
        for (let i = 0; i < notificationsToInsert.length; i += batchSize) {
          const batch = notificationsToInsert.slice(i, i + batchSize);
          const { error: insertError } = await supabase
            .from('notifications')
            .insert(batch);

          if (insertError) {
            console.warn(`Erro ao inserir lote de notificações (${i}-${i + batchSize}):`, insertError.message);
          }
        }
      }
    } catch (err: any) {
      console.error("Erro ao notificar todos os usuários:", err.message);
    }
  };

  const notifyAdmins = async (title: string, message: string, type: 'system' | 'order' | 'promo' | 'wallet') => {
    if (isOffline) return;
    
    try {
      // Find all admins
      const { data: admins, error: fetchError } = await supabase
        .from('profiles')
        .select('id, userType')
        .filter('userType', 'ilike', 'ADMIN');

      if (fetchError) throw fetchError;

      if (admins && admins.length > 0) {
        const notificationsToInsert = admins.map(admin => ({
          user_id: admin.id,
          title,
          message,
          type,
          read: false,
          created_at: new Date().toISOString()
        }));

        // Try bulk insert first
        const { error: insertError } = await supabase
          .from('notifications')
          .insert(notificationsToInsert);

        if (insertError) {
          // If bulk insert fails (likely due to RLS), try individual inserts
          // This allows the current user to at least notify themselves if they are an admin
          if (insertError.message.includes('row-level security')) {
            console.warn("RLS policy prevents bulk admin notification. Attempting individual inserts...");
            for (const notif of notificationsToInsert) {
              try {
                await supabase.from('notifications').insert(notif);
              } catch (e) {
                // Ignore individual RLS failures
              }
            }
          } else {
            throw insertError;
          }
        }
      }
    } catch (err: any) {
      console.error("Erro ao notificar administradores:", err.message);
    }
  };

  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    
    if (!profile?.id || hasNotificationsTable === false) return;

    // DB update
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
        
      if (error) {
        const isTableMissing = error.message.includes('not found') || 
                              error.message.includes('schema cache');
        if (isTableMissing) {
          setHasNotificationsTable(false);
          return;
        }
        console.error("Erro ao atualizar notificação no Supabase:", error.message);
      }
    } catch (err) {
      // Falha silenciosa
    }
  };

  const markAllAsRead = async () => {
    if (!profile?.id) return;
    
    // Optimistic update
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      try {
        localStorage.setItem(`notifications_${profile.id}`, JSON.stringify(updated));
      } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.message?.includes('quota')) {
          console.warn("Quota de localStorage excedida ao marcar todas como lidas.");
        }
      }
      return updated;
    });

    if (isOffline || hasNotificationsTable === false) return;

    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', profile.id)
        .eq('read', false);
    } catch (err) {
      console.error("Erro ao marcar todas como lidas:", err);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!profile?.id) return;

    // Check if it's a pending reservation notification that shouldn't be deleted
    const notification = notifications.find(n => n.id === id);
    const isUserDeposito = profile.userType?.toString().toUpperCase() === 'DEPOSITO';
    
    if (notification && notification.type === 'order' && isUserDeposito) {
      const msg = notification.message.toLowerCase();
      if ((msg.includes('reserva') || msg.includes('pickup') || msg.includes('pedido')) && !notification.read) {
        // For Depósito users, we block deletion of unread reservation notifications
        // as per requirement: "Enquanto o vendedor não confirmar nem cancelar o pedido: A notificação não pode ser apagada"
        alert("Esta notificação não pode ser apagada enquanto o pedido estiver pendente.");
        return;
      }
    }

    // Optimistic update
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      try {
        sqliteService.deleteData('notifications', id);
      } catch (e: any) {
        console.warn("Erro ao eliminar notificação no SQLite:", e);
      }
      return updated;
    });

    // DB update - Always try if online
    if (isOffline) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', profile.id);
        
      if (error) {
        console.error("Erro ao eliminar notificação no Supabase:", error.message);
      }
    } catch (err) {
      console.error("Erro ao eliminar notificação:", err);
    }
  };

  const deleteAllNotifications = async () => {
    if (!profile?.id) return;

    // Filter out notifications that shouldn't be deleted (pending reservations for DEPOSITO)
    const isUserDeposito = profile.userType?.toString().toUpperCase() === 'DEPOSITO';
    
    const notificationsToDelete = notifications.filter(n => {
      if (n.type === 'order' && isUserDeposito) {
        const msg = n.message.toLowerCase();
        if ((msg.includes('reserva') || msg.includes('pickup') || msg.includes('pedido')) && !n.read) {
          return false;
        }
      }
      return true;
    });

    if (notificationsToDelete.length === 0) {
      if (isUserDeposito) {
        alert("Não há notificações que possam ser apagadas no momento.");
      }
      return;
    }

    const idsToDelete = notificationsToDelete.map(n => n.id);

    // Optimistic update
    setNotifications(prev => {
      const updated = prev.filter(n => !idsToDelete.includes(n.id));
      try {
        for (const id of idsToDelete) {
          sqliteService.deleteData('notifications', id);
        }
      } catch (e: any) {
        console.warn("Erro ao eliminar todas as notificações no SQLite:", e);
      }
      return updated;
    });

    // DB update
    if (isOffline) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', idsToDelete)
        .eq('user_id', profile.id);
        
      if (error) {
        console.error("Erro ao eliminar notificações no Supabase:", error.message);
      }
    } catch (err) {
      console.error("Erro ao eliminar notificações:", err);
    }
  };

  return (
    <AppContext.Provider value={{ 
      activeTab, setActiveTab, themePreference, setThemePreference, isDark,
      gpsEnabled, userCoords, notifications, setNotifications,
      markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications,
      createNotification, createNotificationForUser, notifyAllUsers, notifyAdmins, playNotificationSound, stopNotificationSound,
      isOffline, isBalanceVisible, setIsBalanceVisible,
      isNotificationsOpen, setIsNotificationsOpen,
      selectedDepotId, setSelectedDepotId,
      depositoView, setDepositoView,
      favorites, toggleFavorite, isFavorite, submitReview
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
