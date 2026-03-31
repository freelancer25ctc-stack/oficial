
import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Search, 
  Filter, 
  Clock, 
  ShoppingBag, 
  User as UserIcon, 
  Store, 
  CheckCircle2, 
  XCircle, 
  Truck, 
  Package,
  ArrowUpRight,
  RefreshCcw,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Order, OrderStatus, OrderType } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface OrderTrackingScreenProps {
  onBack: () => void;
  isDark: boolean;
}

const OrderTrackingScreen: React.FC<OrderTrackingScreenProps> = ({ onBack, isDark }) => {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();

    const ordersChannel = supabase
      .channel('admin_order_tracking')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders' 
      }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

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
      }
    } catch (err: any) {
      console.error("Erro ao buscar pedidos:", err.message);
      setErrorMsg(t('unexpected_error'));
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case OrderStatus.CONFIRMED: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case OrderStatus.OUT_FOR_DELIVERY: return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
      case OrderStatus.DELIVERED: return 'bg-green-500/10 text-green-500 border-green-500/20';
      case OrderStatus.CANCELLED: return 'bg-[#ED1C24]/10 text-[#ED1C24] border-[#ED1C24]/20';
      case OrderStatus.READY_FOR_PICKUP: return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return <Clock size={14} />;
      case OrderStatus.CONFIRMED: return <CheckCircle2 size={14} />;
      case OrderStatus.OUT_FOR_DELIVERY: return <Truck size={14} />;
      case OrderStatus.DELIVERED: return <CheckCircle2 size={14} />;
      case OrderStatus.CANCELLED: return <XCircle size={14} />;
      case OrderStatus.READY_FOR_PICKUP: return <Package size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order as any).user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.depotName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === OrderStatus.PENDING).length,
    active: orders.filter(o => [OrderStatus.CONFIRMED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.READY_FOR_PICKUP].includes(o.status)).length,
    delivered: orders.filter(o => o.status === OrderStatus.DELIVERED).length
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${isDark ? 'bg-[#0F172A]' : 'bg-[#F8FAFC]'} overflow-y-auto`}>
      {/* Header */}
      <header className={`px-6 py-8 flex items-center justify-between border-b shrink-0 ${isDark ? 'bg-[#1E293B] border-white/5' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className={`p-2.5 rounded-2xl transition-all ${isDark ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-gray-100 text-[#1A3A5A] hover:bg-gray-200'}`}
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className={`text-xl font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-[#1A3A5A]'}`}>
              {t('order_tracking' as any) || 'Acompanhamento de Pedidos'}
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {orders.length} {t('total_orders' as any) || 'Pedidos Totais'}
            </p>
          </div>
        </div>
        <button 
          onClick={fetchOrders}
          className="p-2.5 bg-[#ED1C24] text-white rounded-2xl shadow-lg active:scale-95 transition-all"
        >
          <RefreshCcw size={20} className={isLoading ? "animate-spin" : ""} />
        </button>
      </header>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Pendentes', value: stats.pending, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { label: 'Em Curso', value: stats.active, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
          { label: 'Entregues', value: stats.delivered, color: 'text-green-500', bg: 'bg-green-500/10' }
        ].map((stat, idx) => (
          <div key={idx} className={`p-4 rounded-3xl border ${isDark ? 'bg-[#1E293B] border-white/5' : 'bg-white border-gray-100'} shadow-sm`}>
            <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">{stat.label}</p>
            <h3 className={`text-xl font-black ${stat.color}`}>{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="px-6 pb-6 flex flex-col md:flex-row gap-4">
        <div className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${isDark ? 'bg-[#1E293B] border-white/5 focus-within:border-[#ED1C24]/50' : 'bg-white border-gray-100 focus-within:border-[#ED1C24]/50'}`}>
          <Search size={18} className="text-gray-400" />
          <input 
            type="text" 
            placeholder={t('search_orders' as any) || "Procurar por ID, cliente ou depósito..."}
            className="flex-1 bg-transparent border-none outline-none text-xs font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <button 
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${statusFilter === 'all' ? 'bg-[#ED1C24] text-white shadow-lg' : (isDark ? 'bg-white/5 text-white/60' : 'bg-gray-100 text-gray-500')}`}
          >
            Todos
          </button>
          {Object.values(OrderStatus).filter(status => status !== OrderStatus.OUT_FOR_DELIVERY).map((status) => (
            <button 
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${statusFilter === status ? 'bg-[#ED1C24] text-white shadow-lg' : (isDark ? 'bg-white/5 text-white/60' : 'bg-gray-100 text-gray-500')}`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List / Table */}
      <div className="px-6 pb-12">
        {errorMsg && (
          <div className="mb-6 p-4 bg-[#ED1C24]/10 border border-[#ED1C24]/20 rounded-2xl flex items-center gap-4 text-[#ED1C24]">
            <AlertCircle size={20} />
            <p className="text-xs font-bold">{errorMsg}</p>
          </div>
        )}

        {isLoading && orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <RefreshCcw size={40} className="animate-spin text-[#ED1C24] mb-4" />
            <p className="text-xs font-black uppercase tracking-widest">{t('loading' as any) || 'Carregando...'}</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-30">
            <ShoppingBag size={64} className="mb-4" />
            <p className="text-xs font-black uppercase tracking-widest">{t('no_orders_found' as any) || 'Nenhum pedido encontrado'}</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-[10px] font-black uppercase text-gray-400 tracking-widest text-left">
                    <th className="px-6 py-4">ID / Data</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Depósito / Tipo</th>
                    <th className="px-6 py-4">Itens</th>
                    <th className="px-6 py-4 text-right">Total</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr 
                      key={order.id} 
                      className={`group transition-all hover:scale-[1.005] ${isDark ? 'bg-[#1E293B]' : 'bg-white shadow-sm'} rounded-[24px] overflow-hidden`}
                    >
                      <td className="px-6 py-5 first:rounded-l-[24px]">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase text-[#ED1C24]">#{order.id.slice(0, 8)}</span>
                          <span className="text-[10px] font-bold text-gray-400">{order.date}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                            <UserIcon size={14} className="text-blue-500" />
                          </div>
                          <div>
                            <p className="text-xs font-bold">{(order as any).user_name || '---'}</p>
                            <p className="text-[10px] font-medium text-gray-500">{(order as any).user_phone || '---'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                            <Store size={14} className="text-orange-500" />
                          </div>
                          <div>
                            <p className="text-xs font-bold">{order.depotName || '---'}</p>
                            <p className="text-[10px] font-medium text-gray-500">{order.orderType}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs font-bold">{order.items}</p>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <p className="text-sm font-black text-[#ED1C24]">{order.total.toLocaleString()} Kz</p>
                      </td>
                      <td className="px-6 py-5 last:rounded-r-[24px] text-center">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          {order.status}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {filteredOrders.map((order) => (
                <div 
                  key={order.id} 
                  className={`p-5 rounded-[32px] border shadow-sm transition-all hover:scale-[1.01] ${isDark ? 'bg-[#1E293B] border-white/5' : 'bg-white border-gray-100'}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                        <ShoppingBag size={16} className="text-[#ED1C24]" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-gray-400 leading-none block mb-1">ID: #{order.id.slice(0, 8)}</span>
                        <span className="text-[10px] font-bold">{order.date}</span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {order.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <UserIcon size={14} className="text-blue-500" />
                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{t('client')}</p>
                      </div>
                      <p className="text-xs font-bold">{(order as any).user_name || '---'}</p>
                      <p className="text-[10px] font-medium text-gray-500">{(order as any).user_phone || '---'}</p>
                    </div>

                    <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Store size={14} className="text-orange-500" />
                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{t('vendor')}</p>
                      </div>
                      <p className="text-xs font-bold">{order.depotName || '---'}</p>
                      <p className="text-[10px] font-medium text-gray-500">{order.orderType}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-500/5">
                    <div>
                      <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">{t('items')}</p>
                      <p className="text-xs font-bold">{order.items}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">{t('order_total')}</p>
                      <p className="text-lg font-black text-[#ED1C24]">{order.total.toLocaleString()} Kz</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderTrackingScreen;
