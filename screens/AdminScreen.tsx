
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  ChevronLeft, 
  X, 
  Wallet, 
  Loader2, 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  MoreVertical, 
  FileText, 
  Eye, 
  Check, 
  Store, 
  RefreshCcw,
  ShieldCheck,
  AlertCircle,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ShoppingBag,
  DollarSign,
  Edit2,
  Trash2,
  Search,
  Image as ImageIcon,
  Bell,
  Send
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useLanguage } from '../context/LanguageContext';
import { Order, Depot, DepositRequest, OrderStatus, AppTab } from '../types';
import { supabase } from '../services/supabaseClient';
import { useApp } from '../context/AppContext';

interface AdminScreenProps {
  onBack: () => void;
  onLogout?: () => void;
  onNavigateToBalanceRequests: () => void;
  onNavigateToBanners: () => void;
  onNavigateToOrderTracking: () => void;
  areBlocksDark: boolean;
  isBgDark: boolean;
}

const AdminScreen: React.FC<AdminScreenProps> = ({ onBack, onLogout, onNavigateToBalanceRequests, onNavigateToBanners, onNavigateToOrderTracking, areBlocksDark, isBgDark }) => {
  const { t } = useLanguage();
  const { 
    notifyAdmins, 
    createNotificationForUser,
    notifyAllUsers,
    notifications, 
    setIsNotificationsOpen, 
    isNotificationsOpen,
    setActiveTab: setGlobalTab
  } = useApp();
  // ... existing state ...
  
  // Helper components and functions for Dashboard
  const StatCard = ({ title, value, icon, trend, trendUp, blockClass, color, bgColor }: any) => (
    <div className={`${blockClass} p-5 lg:p-8 rounded-3xl lg:rounded-[40px] border shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-all duration-300`}>
      <div className={`absolute -right-4 -top-4 w-20 h-20 lg:w-24 lg:h-24 ${bgColor} rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity`}></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <div className={`p-3 lg:p-4 ${bgColor} ${color} rounded-xl lg:rounded-2xl`}>
            {React.cloneElement(icon as React.ReactElement, { size: 20, className: "lg:w-6 lg:h-6" })}
          </div>
          {trendUp !== null && (
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] lg:text-[10px] font-black ${trendUp ? 'bg-green-500/10 text-green-500' : 'bg-[#ED1C24]/10 text-[#ED1C24]'}`}>
              {trendUp ? <ArrowUpRight size={10} className="lg:w-3 lg:h-3" /> : <ArrowDownRight size={10} className="lg:w-3 lg:h-3" />}
              {trend}
            </div>
          )}
        </div>
        <p className="text-[9px] lg:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-xl lg:text-3xl font-black tracking-tight">{value}</h3>
      </div>
    </div>
  );

  const generateChartData = (orders: Order[]) => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const data = days.map(day => ({ name: day, revenue: 0 }));
    
    orders.forEach(order => {
      if (!order.date) return;
      const date = new Date(order.date);
      const dayIndex = date.getDay();
      if (!isNaN(dayIndex) && data[dayIndex]) {
        data[dayIndex].revenue += Number(order.total || 0);
      }
    });
    
    // Rotate to put current day at the end
    const today = new Date().getDay();
    const rotatedData = [...data.slice(today + 1), ...data.slice(0, today + 1)];
    return rotatedData;
  };

  const [activeTab, setActiveTab] = useState<'dash' | 'users' | 'depots' | 'system_notifs'>('dash');
  const [orders, setOrders] = useState<Order[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalUsers: 0,
    activeDepots: 0
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewingProof, setViewingProof] = useState<DepositRequest | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [notifyingUser, setNotifyingUser] = useState<any | null>(null);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [isSendingGlobal, setIsSendingGlobal] = useState(false);
  const [globalNotifType, setGlobalNotifType] = useState<'system' | 'promo'>('system');

  useEffect(() => {
    fetchAdminData();

    // Real-time listener para solicitações de depósito
    const depositsChannel = supabase
      .channel('admin_deposit_requests')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'deposit_requests' 
      }, () => {
        fetchAdminData();
      })
      .subscribe();

    // Real-time listener para perfis (saldo atualizado)
    const profilesChannel = supabase
      .channel('admin_profiles')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles' 
      }, () => {
        fetchAdminData();
      })
      .subscribe();

    // Real-time listener para depósitos (lojas)
    const depotsChannel = supabase
      .channel('admin_depots')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'depots' 
      }, () => {
        fetchAdminData();
      })
      .subscribe();

    // Real-time listener para pedidos
    const ordersChannel = supabase
      .channel('admin_orders')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders' 
      }, () => {
        fetchAdminData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(depositsChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(depotsChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, []);

  const fetchAdminData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    console.log("--- INICIANDO SYNC ADMIN ---");
    
    try {
      // 1. Perfis
      const { data: pData, error: pError } = await supabase.from('profiles').select('*');
      if (pError) console.error("Erro Perfis:", pError.message);
      else setProfiles(pData || []);

      // 2. Depósitos (Lojas)
      const { data: dData, error: dError } = await supabase.from('depots').select('*');
      if (dError) console.error("Erro Lojas:", dError.message);
      else {
        const mappedDepots: Depot[] = (dData || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          address: d.address,
          price: d.price,
          stock: d.stock,
          isOpen: d.is_open,
          latitude: d.latitude,
          longitude: d.longitude,
          imageUrl: d.image_url || '',
          phone: d.phone,
          category: d.category || 'Económico',
          rating: d.rating || 4.5,
          openingHours: d.opening_hours || '08:00 - 18:00',
          workingDays: d.working_days || 'Segunda a Sexta',
          pickupTime: d.delivery_time || '20-40 min',
          isVerified: !!d.is_verified,
          distance: '0km'
        }));
        setDepots(mappedDepots);
      }

      // 3. Pedidos
      const { data: oData, error: oError } = await supabase.from('orders').select('*');
      if (oError) console.error("Erro Pedidos:", oError.message);
      else setOrders(oData || []);

      // 4. FATURAÇÃO TOTAL (Lida da tabela billing para ser apenas incremental)
      console.log("Consultando faturação acumulada...");
      const { data: billingData } = await supabase
        .from('billing')
        .select('amount')
        .eq('id', 'total_revenue')
        .single();

      let revenue = 0;
      if (billingData) {
        revenue = Number(billingData.amount) || 0;
      } else {
        // Se não existir o registo, calculamos o inicial a partir dos aprovados existentes
        const { data: initialDeps } = await supabase
          .from('deposit_requests')
          .select('amount')
          .eq('status', 'approved');
        
        revenue = (initialDeps || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        
        // Criar o registo inicial
        await supabase.from('billing').upsert({ 
          id: 'total_revenue', 
          amount: revenue, 
          updated_at: new Date().toISOString() 
        });
      }

      // 5. SOLICITAÇÕES DE DEPÓSITO (Para listagem)
      const { data: depData, error: depError } = await supabase
        .from('deposit_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (depError) {
        console.error("ERRO SUPABASE (deposit_requests):", depError);
      } else {
        const validDeposits = (depData || []).filter(d => d && d.id && d.amount !== undefined);
        setDepositRequests(validDeposits);
      }

      // Atualizar Stats
      setStats({
        totalRevenue: revenue,
        totalOrders: oData?.length || 0,
        totalUsers: pData?.length || 0,
        activeDepots: dData?.length || 0
      });

    } catch (err: any) {
      console.error("Erro fatal no fetch:", err);
      setErrorMsg(t('unexpected_error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveDeposit = async (request: DepositRequest) => {
    if (isActionLoading) return;
    setIsActionLoading(true);
    
    try {
      const { data: userProfile, error: pError } = await supabase.from('profiles').select('*').eq('id', request.user_id).single();
      if (pError) throw pError;

      const currentBalance = userProfile.balance || 0;
      const newBalance = currentBalance + request.amount;

      const { error: uError } = await supabase.from('profiles').update({ 
        balance: newBalance 
      }).eq('id', request.user_id);
      if (uError) throw uError;

      await supabase.from('transactions').insert([{
        user_id: request.user_id,
        type: 'in',
        category: 'deposit',
        amount: request.amount,
        description: `Carregamento Aprovado (Ref: ${request.reference_code})`
      }]);

      const { error: rError } = await supabase.from('deposit_requests').update({ status: 'approved' }).eq('id', request.id);
      if (rError) throw rError;

      // Notificar outros administradores
      notifyAdmins(
        'Depósito Aprovado',
        `O administrador aprovou o depósito de ${request.amount.toLocaleString()} Kz para ${userProfile.name}.`,
        'wallet'
      );

      // 2.1. Criar Notificação para o Usuário
      try {
        await createNotificationForUser(
          request.user_id,
          'Carregamento Aprovado!',
          `O seu carregamento de ${request.amount.toLocaleString()} Kz foi aprovado e creditado na sua conta.`,
          'wallet'
        );
      } catch (notifErr) {
        console.warn("Erro ao notificar usuário sobre aprovação:", notifErr);
      }

      setDepositRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'approved' } : r));
      setViewingProof(null);
      alert(t('confirm_credit_success', { amount: request.amount }));
    } catch (err: any) {
      alert(t('approval_failed') + err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRejectDeposit = async (requestId: string) => {
    if (!confirm(t('reject_confirm'))) return;
    setIsActionLoading(true);
    try {
      const { error } = await supabase.from('deposit_requests').update({ status: 'rejected' }).eq('id', requestId);
      if (error) throw error;

      // Notificar outros administradores
      const request = depositRequests.find(r => r.id === requestId);
      if (request) {
        const user = profiles.find(p => p.id === request.user_id);
        notifyAdmins(
          'Depósito Rejeitado',
          `O administrador rejeitou o depósito de ${request.amount.toLocaleString()} Kz para ${user?.name || 'Usuário'}.`,
          'wallet'
        );
      }

      // 2.1. Criar Notificação para o Usuário
      try {
        const request = depositRequests.find(r => r.id === requestId);
        if (request) {
          await createNotificationForUser(
            request.user_id,
            'Carregamento Rejeitado',
            `O seu pedido de carregamento de ${request.amount.toLocaleString()} Kz foi rejeitado. Verifique o comprovativo e tente novamente.`,
            'wallet'
          );
        }
      } catch (notifErr) {
        console.warn("Erro ao notificar usuário sobre rejeição:", notifErr);
      }

      setDepositRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r));
      setViewingProof(null);
    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editingUser.name,
          phone: editingUser.phone,
          userType: editingUser.userType,
          balance: Number(editingUser.balance)
        })
        .eq('id', editingUser.id);

      if (error) throw error;
      setProfiles(prev => prev.map(p => p.id === editingUser.id ? editingUser : p));
      
      // Notificar outros administradores
      notifyAdmins(
        'Usuário Atualizado',
        `O administrador atualizou os dados do usuário ${editingUser.name}.`
      );

      setEditingUser(null);
      alert(t('user_updated_success'));
    } catch (err: any) {
      alert(t('user_update_error') + err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleUserStatus = async (user: any) => {
    const currentStatus = user.is_active !== false;
    const newStatus = !currentStatus;
    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', user.id);

      if (error) throw error;
      setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, is_active: newStatus } : p));

      // Notificar outros administradores
      notifyAdmins(
        'Status de Usuário Alterado',
        `O administrador ${newStatus ? 'ativou' : 'desativou'} o usuário ${user.name}.`
      );
    } catch (err: any) {
      alert(t('status_change_error') + err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleUserVerification = async (user: any) => {
    const newStatus = !user.is_verified;
    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: newStatus })
        .eq('id', user.id);

      if (error) throw error;

      // Notificar outros administradores
      notifyAdmins(
        'Verificação de Usuário Alterada',
        `O administrador ${newStatus ? 'verificou' : 'removeu a verificação'} do usuário ${user.name}.`
      );

      // Sincronizar com o depósito vinculado se for um gestor de depósito
      const depotId = user.depot_id || user.depotId || user.companyId;
      if (user.userType === 'DEPOSITO' && depotId) {
        await supabase
          .from('depots')
          .update({ is_verified: newStatus })
          .eq('id', depotId);
        
        // Atualizar estado local dos depósitos se estiverem carregados
        setDepots(prev => prev.map(d => d.id === depotId ? { ...d, isVerified: newStatus } : d));
      }

      setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, is_verified: newStatus } : p));
    } catch (err: any) {
      alert(t('verification_change_error') + err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(t('delete_user_confirm'))) return;
    setIsActionLoading(true);
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      
      // Notificar outros administradores
      const deletedUser = profiles.find(p => p.id === userId);
      notifyAdmins(
        'Usuário Eliminado',
        `O administrador eliminou o usuário ${deletedUser?.name || 'ID: ' + userId}.`
      );

      setProfiles(prev => prev.filter(p => p.id !== userId));
      alert(t('delete_user_success'));
    } catch (err: any) {
      alert(t('delete_user_error') + err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyingUser || !notificationMessage.trim() || !notificationTitle.trim()) return;
    
    setIsActionLoading(true);
    try {
      await createNotificationForUser(
        notifyingUser.id,
        notificationTitle,
        notificationMessage,
        'system'
      );
      
      alert(t('notification_sent_success') || 'Notificação enviada com sucesso!');
      setNotifyingUser(null);
      setNotificationMessage('');
      setNotificationTitle('');
    } catch (err: any) {
      alert((t('notification_send_error') || 'Erro ao enviar notificação: ') + err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSendSystemNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationTitle.trim() || !notificationMessage.trim()) return;

    setIsSendingGlobal(true);
    try {
      await notifyAllUsers(
        notificationTitle,
        notificationMessage,
        globalNotifType
      );
      
      alert(t('notification_sent_success') || 'Notificação enviada para todos os usuários!');
      setNotificationTitle('');
      setNotificationMessage('');
    } catch (err: any) {
      alert((t('notification_send_error') || 'Erro ao enviar notificação: ') + err.message);
    } finally {
      setIsSendingGlobal(false);
    }
  };

  const handleToggleDepotVerification = async (depot: Depot) => {
    const newStatus = !depot.isVerified;
    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from('depots')
        .update({ is_verified: newStatus })
        .eq('id', depot.id);

      if (error) throw error;
      setDepots(prev => prev.map(d => d.id === depot.id ? { ...d, isVerified: newStatus } : d));

      // Notificar outros administradores
      notifyAdmins(
        'Verificação de Depósito Alterada',
        `O administrador ${newStatus ? 'verificou' : 'removeu a verificação'} do depósito ${depot.name}.`
      );
    } catch (err: any) {
      alert(t('verification_change_error') + err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
    p.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    p.phone?.includes(userSearchTerm)
  );

  const blockClass = areBlocksDark ? "bg-[#1E293B] border-white/5 text-white" : "bg-white border-gray-100 text-[#1A3A5A]";

  return (
    <div className={`h-screen flex flex-col lg:flex-row transition-all duration-500 overflow-hidden ${isBgDark ? 'bg-[#0F172A]' : 'bg-[#F8FAFC]'}`}>
      
      <aside className={`fixed inset-y-0 left-0 z-[120] w-64 lg:w-72 bg-[#1A3A5A] text-white transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-10 lg:mb-12">
            <div className="w-9 h-9 lg:w-10 lg:h-10 bg-white rounded-xl lg:rounded-2xl flex items-center justify-center">
                 <img src="/assets/splash.png" className="w-7 h-7 lg:w-8 lg:h-8 object-contain" alt="" />
            </div>
            <h1 className="text-lg lg:text-xl font-black uppercase tracking-tight">GÁS JÁ <span className="text-[#ED1C24]">{t('admin_panel')}</span></h1>
          </div>

          <nav className="flex-1 space-y-1 lg:space-y-2">
            <button onClick={() => { setActiveTab('dash'); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between px-4 lg:px-5 py-3 lg:py-4 rounded-xl lg:rounded-2xl text-[10px] lg:text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'dash' ? 'bg-[#ED1C24] text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
              <div className="flex items-center gap-4">
                <LayoutDashboard size={18} /> {t('dashboard')}
              </div>
              {notifications.some(n => !n.read) && (
                <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
              )}
            </button>
            <button onClick={() => { onNavigateToBalanceRequests(); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-4 lg:px-5 py-3 lg:py-4 rounded-xl lg:rounded-2xl text-[10px] lg:text-xs font-black uppercase tracking-widest transition-all text-white/60 hover:text-white hover:bg-white/5`}>
              <Wallet size={18} /> {t('balance_requests')}
              {depositRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="ml-auto bg-white text-[#ED1C24] text-[8px] px-1.5 py-0.5 rounded-full animate-pulse">
                  {depositRequests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
            <button onClick={() => { onNavigateToOrderTracking(); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-4 lg:px-5 py-3 lg:py-4 rounded-xl lg:rounded-2xl text-[10px] lg:text-xs font-black uppercase tracking-widest transition-all text-white/60 hover:text-white hover:bg-white/5`}>
              <ShoppingBag size={18} /> {t('order_tracking' as any) || 'Pedidos'}
              {orders.filter(o => o.status === OrderStatus.PENDING).length > 0 && (
                <span className="ml-auto bg-white text-[#ED1C24] text-[8px] px-1.5 py-0.5 rounded-full animate-pulse">
                  {orders.filter(o => o.status === OrderStatus.PENDING).length}
                </span>
              )}
            </button>
            <button onClick={() => { setActiveTab('depots'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-4 lg:px-5 py-3 lg:py-4 rounded-xl lg:rounded-2xl text-[10px] lg:text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'depots' ? 'bg-[#ED1C24] text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
              <Store size={18} /> {t('depots')}
            </button>
            <button onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-4 lg:px-5 py-3 lg:py-4 rounded-xl lg:rounded-2xl text-[10px] lg:text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-[#ED1C24] text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
              <Users size={18} /> {t('users')}
            </button>
            <button onClick={() => { onNavigateToBanners(); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-4 lg:px-5 py-3 lg:py-4 rounded-xl lg:rounded-2xl text-[10px] lg:text-xs font-black uppercase tracking-widest transition-all text-white/60 hover:text-white hover:bg-white/5`}>
              <ImageIcon size={18} /> {t('banners_ads')}
            </button>
            <button onClick={() => { setActiveTab('system_notifs'); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between px-4 lg:px-5 py-3 lg:py-4 rounded-xl lg:rounded-2xl text-[10px] lg:text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'system_notifs' ? 'bg-[#ED1C24] text-white shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
              <div className="flex items-center gap-4">
                <Send size={18} /> {t('system_notifications' as any) || 'Notificações Sistema'}
              </div>
            </button>
            <button onClick={() => { setGlobalTab(AppTab.NOTIFICATIONS); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between px-4 lg:px-5 py-3 lg:py-4 rounded-xl lg:rounded-2xl text-[10px] lg:text-xs font-black uppercase tracking-widest transition-all text-white/60 hover:text-white hover:bg-white/5`}>
              <div className="flex items-center gap-4">
                <Bell size={18} /> {t('notifications')}
              </div>
              {notifications.some(n => !n.read) && (
                <div className="w-2 h-2 rounded-full bg-[#ED1C24] animate-pulse"></div>
              )}
            </button>
          </nav>

          <div className="mt-auto pt-6 lg:pt-8 border-t border-white/5 space-y-3 lg:space-y-4">
             <button onClick={onBack} className="w-full flex items-center gap-4 px-4 lg:px-5 py-3 lg:py-4 rounded-xl lg:rounded-2xl text-[10px] lg:text-xs font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 transition-all">
                <ChevronLeft size={18} /> {t('exit_panel')}
             </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-y-auto p-5 lg:p-12 relative">
        <header className="flex items-center justify-between mb-6 lg:mb-8">
           <div className="flex items-center gap-3 lg:gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2.5 bg-white/10 rounded-xl"><Menu size={18} /></button>
              <h2 className={`text-xl lg:text-3xl font-black ${areBlocksDark ? 'text-white' : 'text-[#1A3A5A]'}`}>
                {activeTab === 'dash' && t('overview')}
                {activeTab === 'depots' && t('partner_network')}
                {activeTab === 'users' && t('users')}
                {activeTab === 'system_notifs' && (t('system_notifications' as any) || 'Notificações do Sistema')}
              </h2>
           </div>
            <div className="flex items-center gap-2 lg:gap-4">
              <button onClick={fetchAdminData} className="p-2.5 lg:p-3 bg-blue-600 text-white rounded-xl lg:rounded-2xl shadow-lg active:scale-95 transition-all">
                <RefreshCcw size={18} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>
        </header>

        {errorMsg && (
          <div className="mb-8 p-4 bg-[#ED1C24]/10 border border-[#ED1C24]/20 rounded-3xl flex items-center gap-4 text-[#ED1C24]">
             <AlertCircle size={24} />
             <p className="text-xs font-bold">{errorMsg}</p>
          </div>
        )}

        {activeTab === 'dash' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
               <StatCard 
                 title={t('total_revenue')} 
                 value={`${stats.totalRevenue.toLocaleString()} Kz`} 
                 icon={<DollarSign size={24} />} 
                 trend="+12.5%" 
                 trendUp={true}
                 blockClass={blockClass}
                 color="text-emerald-500"
                 bgColor="bg-emerald-500/10"
               />
               <StatCard 
                 title={t('total_orders')} 
                 value={stats.totalOrders.toString()} 
                 icon={<ShoppingBag size={24} />} 
                 trend="+5.2%" 
                 trendUp={true}
                 blockClass={blockClass}
                 color="text-blue-500"
                 bgColor="bg-blue-500/10"
               />
               <StatCard 
                 title={t('users')} 
                 value={stats.totalUsers.toString()} 
                 icon={<Users size={24} />} 
                 trend="+2.1%" 
                 trendUp={true}
                 blockClass={blockClass}
                 color="text-violet-500"
                 bgColor="bg-violet-500/10"
               />
               <StatCard 
                 title={t('active_depots')} 
                 value={stats.activeDepots.toString()} 
                 icon={<Store size={24} />} 
                 trend={t('stable')} 
                 trendUp={null}
                 blockClass={blockClass}
                 color="text-orange-500"
                 bgColor="bg-orange-500/10"
               />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
              {/* Chart Section */}
              <div className={`${blockClass} p-5 lg:p-8 rounded-3xl lg:rounded-[40px] border shadow-sm xl:col-span-2`}>
                <div className="flex items-center justify-between mb-6 lg:mb-8">
                  <div>
                    <h3 className="text-sm lg:text-lg font-black uppercase tracking-tight">{t('sales_performance')}</h3>
                    <p className="text-[9px] lg:text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('revenue_7d')}</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 bg-gray-500/5 rounded-xl lg:rounded-2xl">
                    <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-[9px] lg:text-[10px] font-black uppercase">{t('revenue')}</span>
                  </div>
                </div>
                
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={generateChartData(orders)}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={areBlocksDark ? "#ffffff10" : "#00000005"} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                        tickFormatter={(value) => `${value/1000}k`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: areBlocksDark ? '#1E293B' : '#ffffff',
                          borderRadius: '20px',
                          border: 'none',
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#3B82F6" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Activity */}
              <div className={`${blockClass} p-5 lg:p-8 rounded-3xl lg:rounded-[40px] border shadow-sm`}>
                <div className="flex items-center justify-between mb-6 lg:mb-8">
                  <h3 className="text-sm lg:text-lg font-black uppercase tracking-tight">{t('recent_activity')}</h3>
                  <Clock size={18} className="text-gray-400 lg:w-5 lg:h-5" />
                </div>
                
                <div className="space-y-4 lg:space-y-6">
                  {orders.slice(0, 5).map((order) => {
                    const client = profiles.find(p => p.id === order.user_id);
                    const vendor = depots.find(d => d.id === order.depot_id || d.id === order.depotId);
                    
                    return (
                      <div key={order.id} className="p-3.5 lg:p-4 rounded-2xl lg:rounded-3xl bg-gray-500/5 border border-transparent hover:border-blue-500/10 transition-all">
                        <div className="flex items-center justify-between mb-2.5 lg:mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] lg:text-[10px] font-black uppercase text-blue-500">#{order.id.slice(0, 8)}</span>
                            <span className="text-[9px] lg:text-[10px] font-bold text-gray-400">• {new Date(order.date).toLocaleDateString()}</span>
                          </div>
                          <span className={`text-[7px] lg:text-[8px] font-black px-1.5 lg:px-2 py-0.5 rounded-full uppercase ${
                            order.status === 'Entregue' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                          }`}>
                            {order.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
                              <Users size={12} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[9px] font-black uppercase text-gray-400 leading-none mb-1">{t('client')}</p>
                              <p className="text-[10px] font-bold truncate">{client?.name || '---'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                              <Store size={12} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[9px] font-black uppercase text-gray-400 leading-none mb-1">{t('vendor')}</p>
                              <p className="text-[10px] font-bold truncate">{vendor?.name || order.depotName || '---'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-500/5">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">{t('order_total')}</p>
                          <p className="text-xs font-black text-blue-600">{order.total.toLocaleString()} Kz</p>
                        </div>
                      </div>
                    );
                  })}
                  
                  {orders.length === 0 && (
                    <div className="text-center py-12 opacity-20">
                      <Database size={40} className="mx-auto mb-2" />
                      <p className="text-[10px] font-black uppercase">{t('no_activity')}</p>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => onNavigateToOrderTracking()}
                  className="w-full mt-8 py-4 bg-gray-500/5 hover:bg-gray-500/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  {t('view_all_records')}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'depots' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
            {depots.map(d => {
              const owner = profiles.find(p => p.id === d.id || p.depot_id === d.id || p.depotId === d.id);
              
              // Calcular estatísticas de pedidos para este depósito
              const depotOrders = orders.filter(o => o.depot_id === d.id || o.depotId === d.id);
              const activeCount = depotOrders.filter(o => [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.READY_FOR_PICKUP].includes(o.status)).length;
              const rejectedCount = depotOrders.filter(o => o.status === OrderStatus.CANCELLED).length;
              const confirmedCount = depotOrders.filter(o => o.status === OrderStatus.CONFIRMED).length;
              const deliveredCount = depotOrders.filter(o => o.status === OrderStatus.DELIVERED).length;

              return (
                <div key={d.id} className={`${blockClass} p-4 lg:p-6 rounded-2xl lg:rounded-[32px] border flex flex-col gap-4 group hover:scale-[1.02] transition-all duration-300`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 lg:gap-4">
                      <img 
                        src={d.imageUrl || "https://picsum.photos/seed/depot/200/200"} 
                        className="w-12 h-12 lg:w-16 lg:h-16 rounded-xl lg:rounded-2xl object-cover" 
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs lg:text-sm font-black">{d.name}</h4>
                          {d.isVerified && <ShieldCheck size={14} className="text-blue-500" />}
                        </div>
                        <p className="text-[9px] lg:text-[10px] text-gray-400 font-bold uppercase truncate max-w-[150px] lg:max-w-none">{d.address}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleToggleDepotVerification(d)}
                        className={`p-2 lg:p-3 rounded-xl transition-all ${d.isVerified ? 'bg-blue-500/10 text-blue-500' : 'bg-gray-500/10 text-gray-400'}`}
                        title={d.isVerified ? "Remover Verificação" : "Verificar Parceiro"}
                      >
                        <ShieldCheck size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          if (owner) {
                            setNotifyingUser(owner);
                            setNotificationTitle('Mensagem do Administrador');
                          } else {
                            alert('Usuário responsável não encontrado.');
                          }
                        }}
                        className="p-2 lg:p-3 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all"
                        title="Notificar Parceiro"
                      >
                        <Bell size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Order Stats for Depot */}
                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-500/5">
                    <div className="text-center p-2 rounded-xl bg-blue-500/5">
                      <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Ativos</p>
                      <p className="text-xs font-black text-blue-500">{activeCount}</p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-green-500/5">
                      <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Confirm.</p>
                      <p className="text-xs font-black text-green-500">{confirmedCount}</p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-[#ED1C24]/5">
                      <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Rejeit.</p>
                      <p className="text-xs font-black text-[#ED1C24]">{rejectedCount}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${d.isOpen ? 'bg-green-500' : 'bg-[#ED1C24]'}`}></div>
                      <span className="text-[9px] font-black uppercase text-gray-400">{d.isOpen ? 'Aberto' : 'Fechado'}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-gray-400 uppercase">Stock</p>
                      <p className={`text-[10px] font-black ${d.stock < 10 ? 'text-[#ED1C24]' : 'text-emerald-500'}`}>{d.stock} botijas</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'users' && (
           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className={`${blockClass} p-4 rounded-3xl border flex items-center gap-3`}>
                <Search size={20} className="text-gray-400" />
                <input 
                  type="text" 
                  placeholder={t('search_users_placeholder')} 
                  className="bg-transparent border-none outline-none flex-1 text-sm font-bold"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                />
              </div>

               <div className={`${blockClass} rounded-3xl lg:rounded-[40px] border overflow-hidden shadow-sm`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-500/5 text-[9px] lg:text-[10px] font-black uppercase text-gray-400">
                        <tr>
                          <th className="px-5 lg:px-8 py-4 lg:py-5">{t('user')}</th>
                          <th className="px-5 lg:px-8 py-4 lg:py-5">{t('phone') || 'Telemóvel'}</th>
                          <th className="px-5 lg:px-8 py-4 lg:py-5">{t('type')}</th>
                          <th className="px-5 lg:px-8 py-4 lg:py-5 text-right">{t('balance')}</th>
                          <th className="px-5 lg:px-8 py-4 lg:py-5 text-right">{t('status') || 'Estado'}</th>
                          <th className="px-5 lg:px-8 py-4 lg:py-5 text-right">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-500/10">
                        {filteredProfiles.map(p => (
                          <tr key={p.id} className="hover:bg-gray-500/5 transition-colors">
                            <td className="px-5 lg:px-8 py-4 lg:py-5">
                              <div className="flex items-center gap-3">
                                {p.avatar ? (
                                  <img 
                                    src={p.avatar} 
                                    alt={p.name} 
                                    className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl object-cover border border-gray-500/10"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-black text-[10px] lg:text-xs">
                                    {p.name?.charAt(0) || 'U'}
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs lg:text-sm font-black">{p.name}</p>
                                  </div>
                                  <p className="text-[9px] lg:text-[10px] opacity-50 truncate max-w-[100px] lg:max-w-none">{p.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 lg:px-8 py-4 lg:py-5">
                              <p className="text-xs font-bold text-gray-500">{p.phone || '---'}</p>
                            </td>
                            <td className="px-5 lg:px-8 py-4 lg:py-5">
                              <span className={`text-[8px] lg:text-[9px] font-black uppercase px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-md ${
                                p.userType === 'ADMIN' ? 'bg-[#ED1C24]/10 text-[#ED1C24]' : 
                                p.userType === 'DEPOSITO' ? 'bg-orange-500/10 text-orange-500' : 
                                'bg-blue-500/10 text-blue-500'
                              }`}>
                                {p.userType}
                              </span>
                            </td>
                            <td className="px-5 lg:px-8 py-4 lg:py-5 text-right font-black text-xs lg:text-sm">
                              {Number(p.balance || 0).toLocaleString()} Kz
                            </td>
                            <td className="px-5 lg:px-8 py-4 lg:py-5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${p.is_active !== false ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-gray-400'}`}></div>
                                <span className={`text-[9px] font-black uppercase ${p.is_active !== false ? 'text-green-500' : 'text-gray-400'}`}>
                                  {p.is_active !== false ? 'Online' : 'Offline'}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 lg:px-8 py-4 lg:py-5 text-right">
                              <div className="flex items-center justify-end gap-1 lg:gap-2">
                                <button 
                                  onClick={() => {
                                    setNotifyingUser(p);
                                    setNotificationTitle('Mensagem do Administrador');
                                  }}
                                  className="p-1.5 lg:p-2 hover:bg-blue-500/10 text-blue-500 rounded-lg transition-all"
                                  title={t('notify') || 'Notificar'}
                                >
                                  <Bell size={14} className="lg:w-4 lg:h-4" />
                                </button>
                                <button 
                                  onClick={() => setEditingUser(p)}
                                  className="p-1.5 lg:p-2 hover:bg-gray-500/10 text-gray-500 rounded-lg transition-all"
                                  title={t('edit') || 'Editar'}
                                >
                                  <Edit2 size={14} className="lg:w-4 lg:h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
         )}

        {activeTab === 'system_notifs' && (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className={`${blockClass} p-8 lg:p-12 rounded-[40px] border shadow-xl`}>
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-blue-500/10 text-blue-500 rounded-2xl">
                  <Send size={24} />
                </div>
                <div>
                  <h3 className="text-xl lg:text-2xl font-black uppercase tracking-tight">{t('send_global_notification' as any) || 'Notificação Global'}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{t('send_to_all_users' as any) || 'Enviar para todos os usuários cadastrados'}</p>
                </div>
              </div>

              <form onSubmit={handleSendSystemNotification} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">{t('notification_type' as any) || 'Tipo de Notificação'}</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      type="button"
                      onClick={() => setGlobalNotifType('system')}
                      className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${globalNotifType === 'system' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-gray-500/5 border-transparent text-gray-400'}`}
                    >
                      {t('system' as any) || 'Sistema'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setGlobalNotifType('promo')}
                      className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${globalNotifType === 'promo' ? 'bg-amber-500 border-amber-500 text-white shadow-lg' : 'bg-gray-500/5 border-transparent text-gray-400'}`}
                    >
                      {t('promotion' as any) || 'Promoção'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">{t('notification_title') || 'Título da Notificação'}</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-500/5 border border-transparent focus:border-blue-500/30 rounded-2xl px-6 py-4 text-sm font-bold outline-none transition-all"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    placeholder="Ex: Manutenção Programada"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">{t('message') || 'Mensagem'}</label>
                  <textarea 
                    className="w-full bg-gray-500/5 border border-transparent focus:border-blue-500/30 rounded-2xl px-6 py-4 text-sm font-bold outline-none transition-all min-h-[160px] resize-none"
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    placeholder="Digite a mensagem que todos os usuários receberão..."
                    required
                  />
                </div>

                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                  <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-amber-600 leading-relaxed uppercase tracking-tight">
                    {t('global_notif_warning' as any) || 'Atenção: Esta mensagem será enviada para TODOS os usuários do sistema. Use com responsabilidade.'}
                  </p>
                </div>

                <button 
                  type="submit" 
                  disabled={isSendingGlobal}
                  className="w-full py-5 bg-blue-600 text-white rounded-[24px] text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  {isSendingGlobal ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                  {t('send_to_all' as any) || 'Enviar para Todos'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <div className={`${blockClass} w-full max-w-md rounded-3xl lg:rounded-[40px] border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300`}>
              <div className="p-6 lg:p-8 border-b border-gray-500/10 flex items-center justify-between">
                <h3 className="text-lg lg:text-xl font-black uppercase tracking-tight">{t('edit_user')}</h3>
                <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-gray-500/10 rounded-xl transition-all">
                  <X size={18} className="lg:w-5 lg:h-5" />
                </button>
              </div>
              <form onSubmit={handleUpdateUser} className="p-6 lg:p-8 space-y-4 lg:space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">{t('full_name')}</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-500/5 border border-transparent focus:border-blue-500/30 rounded-xl lg:rounded-2xl px-4 lg:px-5 py-3.5 lg:py-4 text-xs lg:text-sm font-bold outline-none transition-all"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">{t('phone')}</label>
                  <input 
                    type="tel" 
                    className="w-full bg-gray-500/5 border border-transparent focus:border-blue-500/30 rounded-xl lg:rounded-2xl px-4 lg:px-5 py-3.5 lg:py-4 text-xs lg:text-sm font-bold outline-none transition-all"
                    value={editingUser.phone}
                    onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">{t('account_type')}</label>
                    <select 
                      className="w-full bg-gray-500/5 border border-transparent focus:border-blue-500/30 rounded-xl lg:rounded-2xl px-4 lg:px-5 py-3.5 lg:py-4 text-xs lg:text-sm font-bold outline-none transition-all appearance-none"
                      value={editingUser.userType}
                      onChange={(e) => setEditingUser({...editingUser, userType: e.target.value})}
                    >
                      <option value="CLIENTE">CLIENTE</option>
                      <option value="DEPOSITO">DEPOSITO</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">{t('balance_kz')}</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-500/5 border border-transparent focus:border-blue-500/30 rounded-xl lg:rounded-2xl px-4 lg:px-5 py-3.5 lg:py-4 text-xs lg:text-sm font-bold outline-none transition-all"
                      value={editingUser.balance}
                      onChange={(e) => setEditingUser({...editingUser, balance: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center gap-2 lg:gap-3 bg-gray-500/5 border border-transparent rounded-xl lg:rounded-2xl px-4 lg:px-5 py-3.5 lg:py-4">
                    <input 
                      type="checkbox" 
                      id="is_verified"
                      className="w-4 h-4 lg:w-5 lg:h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={editingUser.is_verified}
                      onChange={(e) => setEditingUser({...editingUser, is_verified: e.target.checked})}
                    />
                    <label htmlFor="is_verified" className="text-xs lg:text-sm font-bold cursor-pointer">{t('verified')}</label>
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={isActionLoading}
                  className="w-full py-4 lg:py-5 bg-blue-600 text-white rounded-xl lg:rounded-[24px] text-[10px] lg:text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isActionLoading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                  {t('save_changes')}
                </button>
              </form>
            </div>
          </div>
        )}
        {/* Notify User Modal */}
        {notifyingUser && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <div className={`${blockClass} w-full max-w-md rounded-3xl lg:rounded-[40px] border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300`}>
              <div className="p-6 lg:p-8 border-b border-gray-500/10 flex items-center justify-between">
                <div>
                  <h3 className="text-lg lg:text-xl font-black uppercase tracking-tight">{t('notify_user') || 'Notificar Usuário'}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{notifyingUser.name}</p>
                </div>
                <button onClick={() => setNotifyingUser(null)} className="p-2 hover:bg-gray-500/10 rounded-xl transition-all">
                  <X size={18} className="lg:w-5 lg:h-5" />
                </button>
              </div>
              <form onSubmit={handleSendNotification} className="p-6 lg:p-8 space-y-4 lg:space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">{t('notification_title') || 'Título da Notificação'}</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-500/5 border border-transparent focus:border-blue-500/30 rounded-xl lg:rounded-2xl px-4 lg:px-5 py-3.5 lg:py-4 text-xs lg:text-sm font-bold outline-none transition-all"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    placeholder="Ex: Atualização de Conta"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">{t('message') || 'Mensagem'}</label>
                  <textarea 
                    className="w-full bg-gray-500/5 border border-transparent focus:border-blue-500/30 rounded-xl lg:rounded-2xl px-4 lg:px-5 py-3.5 lg:py-4 text-xs lg:text-sm font-bold outline-none transition-all min-h-[120px] resize-none"
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    placeholder="Digite a mensagem para o usuário..."
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isActionLoading}
                  className="w-full py-4 lg:py-5 bg-blue-600 text-white rounded-xl lg:rounded-[24px] text-[10px] lg:text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isActionLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  {t('send_notification') || 'Enviar Notificação'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminScreen;
