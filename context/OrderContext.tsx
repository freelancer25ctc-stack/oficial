
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { Order, OrderStatus, OrderType } from '../types';
import { useAuth } from './AuthContext';
import { useApp } from './AppContext';
import { useLanguage } from './LanguageContext';
import { calculateReservationFee } from '../constants';
import { sqliteService } from '../services/sqlite';

interface OrderContextType {
  orders: Order[];
  trackingOrder: Order | null;
  setTrackingOrder: (order: Order | null) => void;
  isLoading: boolean;
  refreshOrders: () => Promise<void>;
  cancelOrder: (id: string) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  clearOldOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, isAuthenticated, refreshProfile } = useAuth();
  const { createNotification, playNotificationSound, stopNotificationSound } = useApp();
  const { t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const calculateReservationFee = (quantity: number) => {
    return quantity * 50; // 50 Kz per bottle
  };

  const processRefund = useCallback(async (orderId: string, reason: string) => {
    if (!profile) return;

    try {
      // 1. Fetch order details to get quantity
      const { data: orderData, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      const quantity = orderData.quantity || 1;
      const refundAmount = calculateReservationFee(quantity);

      // 2. Update order status to CANCELLED
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: OrderStatus.CANCELLED })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // 3. Refund the fee to user balance
      const newBalance = (profile.balance || 0) + refundAmount;
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      // 4. Create transaction record
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: profile.id,
          amount: refundAmount,
          type: 'refund',
          description: `${t('refund_for_order')} #${orderId.slice(0, 8)}: ${reason}`,
          status: 'completed'
        });

      if (txError) throw txError;

      console.log(`Refunded ${refundAmount} Kz for order ${orderId}`);
    } catch (err) {
      console.error("Erro ao processar reembolso:", err);
    }
  }, [profile, t]);

  const checkAndRefundStaleOrders = useCallback(async (currentOrders: Order[]) => {
    if (!profile) return;
    
    const now = new Date();
    const staleOrders = currentOrders.filter(o => {
      const orderDate = new Date((o as any).created_at);
      const diffHours = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
      return o.status === OrderStatus.PENDING && diffHours >= 24;
    });

    if (staleOrders.length > 0) {
      console.log(`Found ${staleOrders.length} stale orders to refund.`);
      for (const order of staleOrders) {
        await processRefund(order.id, t('auto_refund_reason'));
      }
      // Não chamamos fetchOrders() aqui para evitar loop infinito.
      // O real-time listener ou a próxima atualização manual cuidará disso.
    }
  }, [profile, t, processRefund]);

  const fetchOrders = useCallback(async (retryCount = 0) => {
    if (!profile) return;
    let isRetrying = false;
    
    try {
      if (retryCount === 0) {
        setIsLoading(true);

        // Load from SQLite cache first
        try {
          const cached = await sqliteService.getAllFromTable('orders');
          if (cached && cached.length > 0) {
            setOrders(cached);
          }
        } catch (e) {
          console.warn("Erro ao ler pedidos do SQLite:", e);
        }
      }

      const depotId = profile.depotId || profile.depot_id;
      
      let query = supabase.from('orders').select('*');
      
      if (depotId) {
        query = query.or(`user_id.eq.${profile.id},depot_id.eq.${depotId}`);
      } else {
        query = query.eq('user_id', profile.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error("Erro ao buscar pedidos:", error);
        
        const isNetworkError = error.message === 'TypeError: Failed to fetch' || 
                               error.name === 'AbortError' ||
                               error.message?.includes('NetworkError') ||
                               error.message?.includes('Failed to fetch') ||
                               (error as any).status === 0 ||
                               error.code === 'PGRST301';

        if (retryCount < 2 && isNetworkError) {
          isRetrying = true;
          const delay = Math.pow(2, retryCount) * 1000;
          setTimeout(() => fetchOrders(retryCount + 1), delay);
        }
      }

      if (data) {
        const mapped = data.map((o: any) => ({
          ...o,
          depotName: o.depot_name,
          depotId: o.depot_id,
          orderType: o.order_type,
          trackingProgress: o.tracking_progress,
          bottleType: o.bottle_type,
          createdAt: o.created_at,
          date: new Date(o.created_at).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        }));
        setOrders(mapped as any);
        try {
          // Save each order to SQLite
          for (const order of mapped) {
            await sqliteService.saveData('orders', order.id, order);
          }
        } catch (e: any) {
          console.warn("Erro ao salvar pedidos no SQLite:", e);
        }
        
        // Check for stale orders and refund them
        checkAndRefundStaleOrders(mapped as any);
      }
    } finally {
      if (!isRetrying) {
        setIsLoading(false);
      }
    }
  }, [profile, checkAndRefundStaleOrders]);

  useEffect(() => {
    if (isAuthenticated) fetchOrders();
    else setOrders([]);

    // Real-time listener para actualizações de pedidos
    if (isAuthenticated && profile?.id) {
      const depotId = profile.depotId || profile.depot_id;
      
      const channel = supabase
        .channel(`orders_user_${profile.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'orders',
          filter: `user_id=eq.${profile.id}`
        }, (payload) => {
          handleOrderChange(payload, 'client');
        });

      if (depotId) {
        channel.on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `depot_id=eq.${depotId}`
        }, (payload) => {
          handleOrderChange(payload, 'deposito');
        });
      }

      if (profile.userType === 'ADMIN') {
        channel.on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'orders'
        }, (payload) => {
          handleOrderChange(payload, 'admin');
        });
      }

      channel.subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated, profile?.id, profile?.depot_id, profile?.depotId, profile?.userType, trackingOrder?.id]);

  const handleOrderChange = (payload: any, role: 'client' | 'deposito' | 'admin') => {
    if (payload.eventType === 'UPDATE') {
      const updated = payload.new as any;
      
      setOrders(prev => prev.map(o => o.id === updated.id ? {
        ...o,
        status: updated.status,
        trackingProgress: updated.tracking_progress
      } : o));
      
      if (trackingOrder?.id === updated.id) {
        setTrackingOrder(prev => prev ? { ...prev, status: updated.status, trackingProgress: updated.tracking_progress } : null);
      }

      // Check if sound should stop
      checkPendingReservationsSound();
    } else if (payload.eventType === 'INSERT') {
      const newOrder = payload.new as any;
      
      if (role === 'deposito') {
        // Play sound for the depot owner when a new order arrives
        playNotificationSound();
      }
      
      fetchOrders();
    }
  };

  const checkPendingReservationsSound = useCallback(() => {
    if (profile?.userType === 'DEPOSITO') {
      const hasPending = orders.some(o => 
        o.status === OrderStatus.PENDING && 
        (o.orderType === OrderType.PICKUP || (o as any).order_type === OrderType.PICKUP)
      );
      if (!hasPending) {
        stopNotificationSound();
      }
    }
  }, [orders, profile, stopNotificationSound]);

  useEffect(() => {
    checkPendingReservationsSound();
  }, [orders, checkPendingReservationsSound]);

  const cancelOrder = async (id: string) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;

    if (order.status === OrderStatus.PENDING) {
      // Manual cancellation with refund
      await processRefund(id, t('cancel_reservation'));
    } else {
      // Normal cancellation (no refund if already confirmed/in route)
      const { error } = await supabase.from('orders').update({ status: OrderStatus.CANCELLED }).eq('id', id);
      if (!error) {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: OrderStatus.CANCELLED } : o));
        if (trackingOrder?.id === id) setTrackingOrder(null);
      }
    }
  };

  const deleteOrder = async (id: string) => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (!error) {
      setOrders(prev => prev.filter(o => o.id !== id));
      if (trackingOrder?.id === id) setTrackingOrder(null);
    } else {
      console.error("Error deleting order:", error);
    }
  };

  const clearOldOrders = async () => {
    if (!profile) return;
    
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('user_id', profile.id)
      .in('status', [OrderStatus.DELIVERED, OrderStatus.CANCELLED]);

    if (!error) {
      await fetchOrders();
    } else {
      console.error("Error clearing old orders:", error);
    }
  };

  return (
    <OrderContext.Provider value={{ 
      orders, 
      trackingOrder, 
      setTrackingOrder, 
      isLoading, 
      refreshOrders: fetchOrders, 
      cancelOrder,
      deleteOrder,
      clearOldOrders
    }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) throw new Error('useOrders must be used within an OrderProvider');
  return context;
};
