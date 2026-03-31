
import { 
  Home as HomeIcon, 
  ClipboardList, 
  User as UserIcon, 
  Navigation,
  HelpCircle,
  Bell,
  Store,
  UserPlus,
  LayoutDashboard,
  Heart,
  Settings
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { AppTab, Depot, Order, OrderStatus, OrderType, Review, AppNotification, Product, UserType } from './types';
import { supabase } from './services/supabaseClient';
import { RESERVATION_FEE, calculateReservationFee } from './constants';

// Contexts
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DepotProvider, useDepots } from './context/DepotContext';
import { OrderProvider, useOrders } from './context/OrderContext';
import { BannerProvider, useBanners } from './context/BannerContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { nativeService } from './services/NativeService';

// Screens
import SplashScreen from './components/SplashScreen';
import HomeScreen from './screens/HomeScreen';
import GPSFastScreen from './screens/GPSFastScreen';
import OrdersScreen from './screens/OrdersScreen';
import ProfileScreen from './screens/ProfileScreen';
import WalletScreen from './screens/WalletScreen';
import DepotDetailsScreen from './screens/DepotDetailsScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import SearchScreen from './screens/SearchScreen';
import AdminScreen from './screens/AdminScreen';
import DepositoScreen from './screens/DepositoScreen';
import BalanceRequestScreen from './screens/BalanceRequestScreen';
import PostScreen from './screens/PostScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import OrderTrackingScreen from './screens/OrderTrackingScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import PasswordRecoveryScreen from './screens/PasswordRecoveryScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import NotificationModal from './components/NotificationModal';


import { NetworkStatus } from './components/NetworkStatus';
import { sqliteService } from './services/sqlite';

const AppContent: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    isDark, 
    gpsEnabled, 
    userCoords, 
    notifications, 
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    createNotification,
    createNotificationForUser,
    notifyAdmins,
    isOffline,
    isBalanceVisible,
    setIsBalanceVisible,
    isNotificationsOpen,
    setIsNotificationsOpen,
    selectedDepotId,
    setSelectedDepotId,
    depositoView,
    setDepositoView,
    favorites,
    toggleFavorite,
    isFavorite,
    submitReview
  } = useApp();

  const handleNotificationClick = (notification: AppNotification) => {
    if (isDeposito && notification.type === 'order') {
      const msg = notification.message.toLowerCase();
      if (msg.includes('reserva') || msg.includes('pedido') || msg.includes('pickup')) {
        setDepositoView('reservations');
        setActiveTab(AppTab.DEPOSITO);
      }
    }
    if (!notification.read) markAsRead(notification.id);
    setIsNotificationsOpen(false);
  };

  const { profile, isAuthenticated, isAdmin, isDeposito, isResettingPassword, setIsResettingPassword, logout, updateProfile, isLoading: isAuthLoading } = useAuth();
  const { t } = useLanguage();
  const { depots, refreshDepots, isLoading: isDepotsLoading, hasError: isDepotsError } = useDepots();
  const { banners, isLoading: isBannersLoading } = useBanners();
  const { orders, trackingOrder, setTrackingOrder, cancelOrder, deleteOrder, refreshOrders, clearOldOrders, isLoading: isOrdersLoading } = useOrders();

  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(t('loading' as any));
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [signupUserType, setSignupUserType] = useState<UserType | undefined>(undefined);

  useEffect(() => {
    // Inicializar serviços nativos (Capacitor) e SQLite
    const initServices = async () => {
      await nativeService.initialize();
      await sqliteService.initialize();
    };
    
    initServices();

    // Garantir que a splash screen dure pelo menos 5 segundos
    const timer = setTimeout(() => setMinTimeElapsed(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Só remove o carregamento após 5s E quando os dados críticos estiverem prontos
    if (minTimeElapsed && !isAuthLoading && !isDepotsLoading && !isBannersLoading) {
      setIsLoading(false);
    }
  }, [minTimeElapsed, isAuthLoading, isDepotsLoading, isBannersLoading]);

  // Efeito para rotatividade de mensagens na Splash Screen
  useEffect(() => {
    if (!isLoading) return;

    const messages = [
      t('loading_sync_prices' as any),
      t('loading_check_stock' as any),
      t('loading_locate_depots' as any),
      t('loading_load_promos' as any),
      t('loading_prepare_experience' as any),
      t('loading_validate_security' as any),
      t('loading_connect_delivery' as any)
    ];

    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % messages.length;
      setLoadingMessage(messages[currentIndex]);
    }, 1500);

    return () => clearInterval(interval);
  }, [isLoading, t]);

  // Efeito para atualizar a cor da status bar e navigation bar no Capacitor
  useEffect(() => {
    const themeColor = isDark ? '#0F172A' : '#ED1C24';
    nativeService.setStatusBarColor(themeColor, isDark);
    
    // Atualizar meta tag theme-color para navegadores
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', themeColor);
  }, [isDark]);

  // Redirecionamento Automático e Lógica de Abas
  useEffect(() => {
    if (profile && (activeTab === AppTab.LOGIN || activeTab === AppTab.SIGNUP)) {
      if (isAdmin) {
        setActiveTab(AppTab.ADMIN);
      } else if (isDeposito) {
        setActiveTab(AppTab.DEPOSITO);
      } else {
        setActiveTab(AppTab.HOME);
      }
    }
  }, [profile, isAdmin, isDeposito, activeTab]);

  // Refresh orders only when entering orders tab
  useEffect(() => {
    if (activeTab === AppTab.ORDERS && isAuthenticated) {
      refreshOrders();
    }
  }, [activeTab, isAuthenticated]);

  const handleLogout = async () => {
    await logout();
    setActiveTab(AppTab.HOME);
  };

  const handleSelectDepot = (depot: Depot) => {
    if (!isAuthenticated) {
      setActiveTab(AppTab.LOGIN);
      return;
    }
    setSelectedDepotId(depot.id);
    setActiveTab(AppTab.DEPOT_DETAILS);
  };

  const handlePlaceOrder = async (type: OrderType, bottleType: string, quantity: number, productId?: string) => {
    if (!profile || !selectedDepotId) return;

    const depot = depots.find(d => d.id === selectedDepotId);
    if (!depot) return;

    let finalUnitPrice = depot.price;
    
    // Se houver um produto específico, buscar o preço dele
    if (productId) {
      const { data: prodData } = await supabase.from('products').select('price').eq('id', productId).single();
      if (prodData) finalUnitPrice = prodData.price;
    }

    const finalFee = calculateReservationFee(quantity);
    const userBalance = profile.balance || 0;

    if (userBalance < finalFee) {
      alert(t('insufficient_balance_fee'));
      return;
    }

    try {
      // 1. Criar o Pedido
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: profile.id,
          user_name: profile.name,
          user_phone: profile.phone,
          depot_id: depot.id,
          depot_name: depot.name,
          status: OrderStatus.PENDING,
          total: finalUnitPrice * quantity,
          discount: 0,
          items: `${quantity}x Botija ${bottleType}`,
          order_type: type,
          bottle_type: bottleType,
          quantity: quantity,
          tracking_progress: 0
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderRef = newOrder.id.slice(0, 8).toUpperCase();

      // SISTEMA DE NOTIFICAÇÃO - 3 REGISTROS (ADMIN, CLIENTE, DEPÓSITO)
      
      // 1. NOTIFICAÇÃO PARA O CLIENTE (O próprio usuário)
      try {
        await createNotification(
          'Pedido Realizado com Sucesso!',
          `O seu pedido de ${quantity}x ${bottleType} no depósito ${depot.name} foi enviado e aguarda confirmação. Ref: ${orderRef}`,
          'order'
        );
      } catch (notifErr) {
        console.warn("Erro ao notificar cliente:", notifErr);
      }

      // 2. NOTIFICAÇÃO PARA O ADMINISTRADOR
      try {
        await notifyAdmins(
          'Novo Pedido no Sistema',
          `O cliente ${profile.name} realizou um pedido de ${quantity}x ${bottleType} no depósito ${depot.name}. Ref: ${orderRef}`,
          'order'
        );
      } catch (notifErr) {
        console.warn("Erro ao notificar administradores:", notifErr);
      }

      // 3. NOTIFICAÇÃO PARA O DEPÓSITO (VENDEDOR)
      try {
        // Buscar o perfil do dono do depósito
        const { data: depotOwners } = await supabase
          .from('profiles')
          .select('id')
          .eq('depot_id', depot.id);

        if (depotOwners && depotOwners.length > 0) {
          for (const owner of depotOwners) {
            await createNotificationForUser(
              owner.id,
              'Novo Pedido Recebido!',
              `Você recebeu um novo pedido de ${profile.name}: ${quantity}x ${bottleType}. Por favor, confirme a disponibilidade. Ref: ${orderRef}`,
              'order'
            );
          }
        }
      } catch (notifErr) {
        console.warn("Erro ao notificar o depósito:", notifErr);
      }

      // 2. Descontar Taxa do Saldo
      const newBalance = userBalance - finalFee;
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      // 3. Registrar Transação
      await supabase.from('transactions').insert([{
        user_id: profile.id,
        type: 'out',
        category: 'payment',
        amount: finalFee,
        description: `Taxa de Reserva: ${depot.name}`
      }]);

      // 4. Sucesso Final
      updateProfile({ ...profile, balance: newBalance });
      await refreshOrders();
      await refreshDepots(); // Atualiza mapa e listas
      setActiveTab(AppTab.ORDERS);
      alert(t('reservation_confirmed_alert'));

    } catch (err: any) {
      console.error("Erro ao processar reserva:", err);
      alert(t('error_processing', { message: err.message }));
    }
  };

  const handleReview = async (review: Review) => {
    if (!profile || !selectedDepotId) return;
    
    try {
      await submitReview(selectedDepotId, review.rating, review.comment);
      
      // Notificar Administradores sobre a nova avaliação
      try {
        await notifyAdmins(
          'Nova Avaliação Recebida',
          `${profile.name} avaliou o depósito ${depots.find(d => d.id === selectedDepotId)?.name} com ${review.rating} estrelas.`,
          'system'
        );
      } catch (notifErr) {
        console.warn("Erro ao notificar administradores sobre a avaliação:", notifErr);
      }
      
      alert(t('review_published_alert' as any) || 'Avaliação publicada com sucesso!');
      refreshDepots();
    } catch (err) {
      console.error("Error saving review:", err);
    }
  };

  const renderScreen = () => {
    const screenProps = { 
      areBlocksDark: isDark, 
      isBgDark: isDark,
      userCoords,
      gpsEnabled
    };

    switch (activeTab) {
      case AppTab.HOME:
        if (isAdmin) return <AdminScreen {...screenProps} onBack={() => setActiveTab(AppTab.PROFILE)} onLogout={handleLogout} onNavigateToBalanceRequests={() => setActiveTab(AppTab.BALANCE_REQUESTS)} onNavigateToBanners={() => setActiveTab(AppTab.POSTS)} onNavigateToOrderTracking={() => setActiveTab(AppTab.ORDER_TRACKING)} />;
        if (isDeposito) return <DepositoScreen {...screenProps} profile={profile} onUpdateProfile={updateProfile} onBack={() => setActiveTab(AppTab.HOME)} onLogout={handleLogout} onNavigateToPortal={() => {}} onNavigateToProfile={() => setDepositoView('settings')} />;
        return <HomeScreen 
          {...screenProps}
          isAuthenticated={isAuthenticated} 
          depots={depots} 
          onSelectDepot={handleSelectDepot} 
          onNavigateToMap={() => {
            if (isAuthenticated) {
              setActiveTab(AppTab.MAP);
            } else {
              setActiveTab(AppTab.LOGIN);
            }
          }}
          onNavigateToSignup={(type) => {
            setSignupUserType(type);
            setActiveTab(AppTab.SIGNUP);
          }}
          onNavigateToLogin={() => setActiveTab(AppTab.LOGIN)}
          onNavigateToSearch={() => setActiveTab(AppTab.SEARCH)}
          profileName={profile?.name}
          isVerified={profile?.is_verified}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />;
      case AppTab.MAP:
        return <GPSFastScreen 
          {...screenProps} 
          depots={depots} 
          onSelectDepot={handleSelectDepot} 
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onBack={() => setActiveTab(AppTab.HOME)}
        />;
      case AppTab.ORDERS:
        if (isDeposito) return <HomeScreen {...screenProps} isAuthenticated={isAuthenticated} depots={depots} onSelectDepot={handleSelectDepot} onNavigateToMap={() => setActiveTab(AppTab.MAP)} onNavigateToSignup={(type) => { setSignupUserType(type); setActiveTab(AppTab.SIGNUP); }} onNavigateToLogin={() => setActiveTab(AppTab.LOGIN)} onNavigateToSearch={() => setActiveTab(AppTab.SEARCH)} profileName={profile?.name} />;
        return <OrdersScreen 
          {...screenProps}
          orders={orders} 
          trackingOrder={trackingOrder} 
          onClearTracking={() => setTrackingOrder(null)} 
          onCancelOrder={cancelOrder}
          onDeleteOrder={deleteOrder}
          onClearOldOrders={clearOldOrders}
          depots={depots}
          isLoading={isOrdersLoading}
          onSubmitReview={submitReview}
          onViewOnMap={(id) => {
            setSelectedDepotId(id);
            setActiveTab(AppTab.MAP);
          }}
          onBack={() => setActiveTab(AppTab.HOME)}
        />;
      case AppTab.FAVORITES:
        return <FavoritesScreen 
          {...screenProps} 
          depots={depots} 
          favorites={favorites} 
          onSelectDepot={handleSelectDepot} 
          onToggleFavorite={toggleFavorite}
          onBack={() => setActiveTab(AppTab.HOME)}
        />;
      case AppTab.PROFILE:
        if (isDeposito) return <DepositoScreen {...screenProps} profile={profile} onUpdateProfile={updateProfile} onBack={() => setActiveTab(AppTab.HOME)} onLogout={handleLogout} onNavigateToPortal={() => {}} onNavigateToProfile={() => setDepositoView('settings')} />;
        
        // Calcular estatísticas do utilizador
        const userStats = {
          totalOrders: orders.length,
          bottlesPurchased: orders.reduce((acc, o) => {
            // Tentar extrair quantidade da string "items" ou usar o campo quantity se existir
            const qty = o.quantity || parseInt(o.items.split(' ')[0]) || 1;
            return acc + (o.status === OrderStatus.DELIVERED ? qty : 0);
          }, 0),
          reviewsMade: orders.filter(o => o.isRated).length,
          favoritesCount: favorites.length
        };

        return <ProfileScreen 
          {...screenProps}
          onLogout={handleLogout} 
          onNavigateToWallet={() => setActiveTab(AppTab.WALLET)}
          onNavigateToAdmin={() => setActiveTab(AppTab.ADMIN)}
          onNavigateToDeposito={() => setActiveTab(AppTab.DEPOSITO)}
          profile={profile}
          onUpdateProfile={updateProfile}
          stats={userStats}
        />;
      case AppTab.WALLET:
        return <WalletScreen 
          {...screenProps} 
          balance={profile?.balance || 0} 
          isBalanceVisible={isBalanceVisible} 
          onToggleBalance={() => setIsBalanceVisible(!isBalanceVisible)} 
          profile={profile} 
          onUpdateProfile={updateProfile} 
          onBack={() => setActiveTab(AppTab.PROFILE)}
        />;
      case AppTab.ADMIN:
        return <AdminScreen {...screenProps} onBack={() => setActiveTab(AppTab.PROFILE)} onLogout={handleLogout} onNavigateToBalanceRequests={() => setActiveTab(AppTab.BALANCE_REQUESTS)} onNavigateToBanners={() => setActiveTab(AppTab.POSTS)} onNavigateToOrderTracking={() => setActiveTab(AppTab.ORDER_TRACKING)} />;
      case AppTab.BALANCE_REQUESTS:
        return <BalanceRequestScreen {...screenProps} onBack={() => setActiveTab(AppTab.ADMIN)} />;
      case AppTab.POSTS:
        return <PostScreen {...screenProps} onBack={() => setActiveTab(AppTab.ADMIN)} />;
      case AppTab.ORDER_TRACKING:
        return <OrderTrackingScreen onBack={() => setActiveTab(AppTab.ADMIN)} isDark={isDark} />;
      case AppTab.DEPOSITO:
        return <DepositoScreen {...screenProps} profile={profile} onUpdateProfile={updateProfile} onBack={() => setActiveTab(AppTab.HOME)} onLogout={handleLogout} onNavigateToPortal={() => {}} onNavigateToProfile={() => setDepositoView('settings')} />;
      case AppTab.LOGIN:
        return <LoginScreen onBack={() => setActiveTab(AppTab.HOME)} onSwitchToSignup={() => { setSignupUserType(undefined); setActiveTab(AppTab.SIGNUP); }} onLoginSuccess={() => {}} onForgotPassword={() => setActiveTab(AppTab.PASSWORD_RECOVERY)} />;
      case AppTab.SIGNUP:
        return <SignupScreen onBack={() => setActiveTab(AppTab.HOME)} onSwitchToLogin={() => setActiveTab(AppTab.LOGIN)} onSignupSuccess={() => {}} initialUserType={signupUserType} />;
      case AppTab.DEPOT_DETAILS:
        const selected = depots.find(d => d.id === selectedDepotId);
        return selected ? (
          <DepotDetailsScreen 
            {...screenProps} 
            depot={selected} 
            onBack={() => setActiveTab(AppTab.HOME)} 
            onPlaceOrder={handlePlaceOrder} 
            onAddReview={handleReview} 
            isFavorite={isFavorite(selected.id)}
            onToggleFavorite={toggleFavorite}
          />
        ) : null;
      case AppTab.SEARCH:
        return <SearchScreen 
          {...screenProps} 
          depots={depots} 
          onSelectDepot={handleSelectDepot} 
          onBack={() => setActiveTab(AppTab.HOME)} 
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />;
      case AppTab.NOTIFICATIONS:
        return <NotificationsScreen onBack={() => setActiveTab(AppTab.HOME)} />;
      case AppTab.PASSWORD_RECOVERY:
        return <PasswordRecoveryScreen onBack={() => setActiveTab(AppTab.LOGIN)} />;
      case AppTab.RESET_PASSWORD:
        return <ResetPasswordScreen onSuccess={() => { setIsResettingPassword(false); setActiveTab(AppTab.LOGIN); }} onCancel={() => { setIsResettingPassword(false); setActiveTab(AppTab.LOGIN); }} />;
      default:
        return null;
    }
  };

  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.read).length;
    const pendingOrdersCount = orders.filter(o => o.status === OrderStatus.PENDING).length;
    const totalActivity = unreadCount + (isDeposito ? pendingOrdersCount : 0);

    if (totalActivity > 0) {
      document.title = `(${totalActivity}) Gás Já`;
    } else {
      document.title = 'Gás Já';
    }
  }, [notifications, orders, isDeposito]);

  useEffect(() => {
    if (isResettingPassword) {
      setActiveTab(AppTab.RESET_PASSWORD);
    }
  }, [isResettingPassword]);

  if (isLoading) return <SplashScreen isDark={isDark} loadingMessage={loadingMessage} />;

  const isAuthScreen = activeTab === AppTab.LOGIN || activeTab === AppTab.SIGNUP;
  const isDesktopPortal = activeTab === AppTab.ADMIN || activeTab === AppTab.DEPOSITO || activeTab === AppTab.BALANCE_REQUESTS || activeTab === AppTab.POSTS || activeTab === AppTab.ORDER_TRACKING ||
    (activeTab === AppTab.HOME && (isAdmin || isDeposito)) || 
    (activeTab === AppTab.PROFILE && (isAdmin || isDeposito));
  const hideNavBar = isAuthScreen || isDesktopPortal;

  const hasActiveAlert = notifications.some(n => !n.read) || orders.some(o => 
    (o.status === OrderStatus.CONFIRMED || o.status === OrderStatus.READY_FOR_PICKUP) && 
    o.orderType === OrderType.PICKUP
  );

  return (
    <div className={isDark ? 'dark' : ''}>
      <NetworkStatus />
      <div className={`mx-auto h-screen transition-colors duration-500 ${isAuthScreen ? 'bg-[#1A3A5A]' : isDark ? 'bg-[#0F172A]' : 'bg-[#F3F7FA]'} flex flex-col relative overflow-hidden ${isDesktopPortal ? 'max-w-none' : 'max-w-md border-x border-gray-100 dark:border-slate-800'}`}>

        {isDepotsError && (
          <div className="bg-[#ED1C24] text-white text-[10px] font-bold py-2 px-4 text-center z-50 flex items-center justify-center gap-2">
            <span className="animate-pulse">⚠️</span>
            <span>{t('connection_error' as any) || 'ERRO DE CONEXÃO COM O SERVIDOR'}</span>
            <button 
              onClick={() => refreshDepots()}
              className="ml-2 bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-md transition-colors"
            >
              {t('retry' as any) || 'TENTAR NOVAMENTE'}
            </button>
          </div>
        )}

        {!isAuthScreen && !isDesktopPortal && (
          <header className="px-6 pt-6 pb-4 flex justify-between items-center z-20">
            <div className="flex items-center">
                <img src="/assets/splash.png" className="w-12 h-12 object-contain" alt="Logo" />
                <div className="flex flex-col ml-1">
                  <h1 className={`text-xl font-extrabold ${isDark ? 'text-white' : 'text-[#1A3A5A]'}`}>GÁS <span className="text-[#ED1C24]">JÁ</span></h1>
                 <span className="text-[8px] font-bold text-gray-400 uppercase">{t('one_map_solutions')}</span>
               </div>
            </div>
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {activeTab !== AppTab.NOTIFICATIONS && (
                  <button 
                    onClick={() => setActiveTab(AppTab.NOTIFICATIONS)}
                    className={`relative p-2.5 rounded-xl transition-all active:scale-90 ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-[#1A3A5A] shadow-sm'}`}
                  >
                    <Bell size={20} />
                    {(notifications.some(n => !n.read) || (isAdmin && orders.some(o => [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.OUT_FOR_DELIVERY].includes(o.status)))) && (
                      <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#ED1C24] border-2 border-white dark:border-slate-800 rounded-full animate-pulse"></span>
                    )}
                  </button>
                )}
                
                {activeTab !== AppTab.PROFILE && (
                  <button 
                    onClick={() => {
                      if (isDeposito) {
                        setDepositoView('settings');
                        setActiveTab(AppTab.HOME);
                      } else {
                        setActiveTab(AppTab.PROFILE);
                      }
                    }} 
                    className="active:scale-95 transition-transform"
                  >
                    <img 
                      src={profile?.avatar || "https://i.pravatar.cc/150?u=user"} 
                      className={`w-10 h-10 rounded-xl border shadow-md object-cover ${isDark ? 'border-slate-800' : 'border-white'}`} 
                      alt="Profile"
                    />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right duration-500">
                <button 
                  onClick={() => setActiveTab(AppTab.LOGIN)}
                  className={`text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl transition-all ${isDark ? 'text-white/70 hover:text-white' : 'text-[#1A3A5A]/70 hover:text-[#1A3A5A]'}`}
                >
                  {t('login')}
                </button>
                <button 
                  onClick={() => {
                    setSignupUserType(undefined);
                    setActiveTab(AppTab.SIGNUP);
                  }}
                  className="text-[9px] font-black uppercase tracking-widest bg-[#ED1C24] text-white px-4 py-2 rounded-xl shadow-lg shadow-[#ED1C24]/20 active:scale-95 transition-all flex items-center gap-1"
                >
                  <UserPlus size={12} />
                  {t('signup')}
                </button>
              </div>
            )}
          </header>
        )}

        <main className={`flex-1 overflow-y-auto ${!isAuthScreen && !isDesktopPortal && activeTab !== AppTab.MAP ? 'px-6 pb-24' : ''}`}>
          {renderScreen()}
        </main>

        <NotificationModal 
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          notifications={notifications}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onDeleteNotification={deleteNotification}
          onDeleteAllNotifications={deleteAllNotifications}
          onClickNotification={handleNotificationClick}
          isDark={isDark}
          userType={profile?.userType}
          hasPendingReservations={isDeposito && orders.some(o => 
            o.status === OrderStatus.PENDING && 
            ((o as any).order_type === OrderType.PICKUP || o.orderType === OrderType.PICKUP)
          )}
        />

        {isAuthenticated && !hideNavBar && (
          <nav className={`fixed bottom-0 left-0 right-0 max-w-md mx-auto ${isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-gray-100'} border-t px-6 py-3 flex justify-between items-center z-40 rounded-t-3xl shadow-2xl`}>
            {isAdmin ? (
              <>
                <button onClick={() => setActiveTab(AppTab.ADMIN)} className={`flex flex-col items-center gap-1 relative ${activeTab === AppTab.ADMIN ? 'text-[#ED1C24]' : 'text-gray-300'}`}>
                  <LayoutDashboard size={22} />
                  {(notifications.some(n => !n.read) || orders.some(o => o.status === OrderStatus.PENDING)) && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#ED1C24] border-2 border-white dark:border-[#1E293B] rounded-full animate-pulse"></span>
                  )}
                  <span className="text-[9px] font-bold">{t('dashboard' as any)}</span>
                </button>
                <button onClick={() => setActiveTab(AppTab.PROFILE)} className={`flex flex-col items-center gap-1 ${activeTab === AppTab.PROFILE ? 'text-[#ED1C24]' : 'text-gray-300'}`}>
                  <UserIcon size={22} /><span className="text-[9px] font-bold">{t('profile' as any)}</span>
                </button>
              </>
            ) : isDeposito ? (
              <>
                <button onClick={() => setActiveTab(AppTab.DEPOSITO)} className={`flex flex-col items-center gap-1 relative ${(activeTab as any) === AppTab.DEPOSITO ? 'text-[#ED1C24]' : 'text-gray-300'}`}>
                  <LayoutDashboard size={22} />
                  {(notifications.some(n => !n.read) || orders.some(o => o.status === OrderStatus.PENDING)) && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#ED1C24] border-2 border-white dark:border-[#1E293B] rounded-full animate-pulse"></span>
                  )}
                  <span className="text-[9px] font-bold">{t('panel' as any)}</span>
                </button>
                <button 
                  onClick={() => {
                    setDepositoView('settings');
                    setActiveTab(AppTab.HOME);
                  }} 
                  className={`flex flex-col items-center gap-1 ${activeTab === AppTab.HOME && depositoView === 'settings' ? 'text-[#ED1C24]' : 'text-gray-300'}`}
                >
                  <Settings size={22} /><span className="text-[9px] font-bold">{t('settings' as any)}</span>
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setActiveTab(AppTab.HOME)} className={`flex flex-col items-center gap-1 ${activeTab === AppTab.HOME ? 'text-[#ED1C24]' : 'text-gray-300'}`}>
                  <HomeIcon size={22} /><span className="text-[9px] font-bold">{t('home' as any)}</span>
                </button>
                <button onClick={() => setActiveTab(AppTab.MAP)} className={`flex flex-col items-center gap-1 ${activeTab === AppTab.MAP ? 'text-[#ED1C24]' : 'text-gray-300'}`}>
                  <Navigation size={22} /><span className="text-[9px] font-bold">{t('gps_fast' as any)}</span>
                </button>
                
                <button onClick={() => setActiveTab(AppTab.ORDERS)} className={`flex flex-col items-center gap-1 relative ${activeTab === AppTab.ORDERS ? 'text-[#ED1C24]' : 'text-gray-300'}`}>
                  <ClipboardList size={22} />
                  {hasActiveAlert && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#ED1C24] border-2 border-white dark:border-[#1E293B] rounded-full animate-bounce"></span>
                  )}
                  <span className="text-[9px] font-bold">{t('orders' as any)}</span>
                </button>
                <button onClick={() => setActiveTab(AppTab.FAVORITES)} className={`flex flex-col items-center gap-1 ${activeTab === AppTab.FAVORITES ? 'text-[#ED1C24]' : 'text-gray-300'}`}>
                  <Heart size={22} fill={activeTab === AppTab.FAVORITES ? 'currentColor' : 'none'} /><span className="text-[9px] font-bold">{t('favorites' as any)}</span>
                </button>
                <button onClick={() => setActiveTab(AppTab.PROFILE)} className={`flex flex-col items-center gap-1 ${activeTab === AppTab.PROFILE ? 'text-[#ED1C24]' : 'text-gray-300'}`}>
                  <UserIcon size={22} /><span className="text-[9px] font-bold">{t('profile' as any)}</span>
                </button>
              </>
            )}
          </nav>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <LanguageProvider>
    <AuthProvider>
      <AppProvider>
        <BannerProvider>
          <DepotProvider>
            <OrderProvider>
              <AppContent />
            </OrderProvider>
          </DepotProvider>
        </BannerProvider>
      </AppProvider>
    </AuthProvider>
  </LanguageProvider>
);

export default App;
