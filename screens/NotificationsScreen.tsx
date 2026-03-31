
import React, { useMemo } from 'react';
import { 
  ArrowLeft, 
  Bell, 
  CheckCheck, 
  Trash2, 
  Clock, 
  Package, 
  Tag, 
  Info,
  Eye,
  AlertCircle,
  Wallet,
  Calendar,
  CheckCircle2,
  XCircle,
  Filter
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { AppNotification, AppTab } from '../types';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationsScreenProps {
  onBack: () => void;
}

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ onBack }) => {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const { 
    notifications, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    deleteAllNotifications,
    isDark,
    setActiveTab,
    setDepositoView
  } = useApp();

  const handleView = (notification: AppNotification) => {
    if (!notification.read) markAsRead(notification.id);
    
    if (notification.type === 'order') {
      if (profile?.userType === 'DEPOSITO') {
        setDepositoView('reservations');
        setActiveTab(AppTab.DEPOSITO);
      } else if (profile?.userType === 'ADMIN') {
        setActiveTab(AppTab.ORDER_TRACKING);
      } else {
        setActiveTab(AppTab.ORDERS);
      }
      onBack();
    } else if (notification.type === 'wallet') {
      if (profile?.userType === 'ADMIN') {
        setActiveTab(AppTab.BALANCE_REQUESTS);
      } else {
        setActiveTab(AppTab.WALLET);
      }
      onBack();
    }
  };

  const isOlderThan24h = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    return diffInHours >= 24;
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return t('just_now');
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return language === 'fr' ? `${t('ago')} ${minutes}m` : `${minutes}m ${t('ago')}`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return language === 'fr' ? `${t('ago')} ${hours}h` : `${hours}h ${t('ago')}`;
    }
    const days = Math.floor(diffInSeconds / 86400);
    if (days === 1) return t('yesterday');
    return date.toLocaleDateString(language === 'pt' ? 'pt-PT' : language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' });
  };

  const getIcon = (type: AppNotification['type'], title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('aprovado') || lowerTitle.includes('sucesso')) {
      return <CheckCircle2 size={20} className="text-emerald-500" />;
    }
    if (lowerTitle.includes('rejeitado') || lowerTitle.includes('cancelado') || lowerTitle.includes('erro')) {
      return <XCircle size={20} className="text-[#ED1C24]" />;
    }

    switch (type) {
      case 'order': return <Package size={20} className="text-blue-500" />;
      case 'promo': return <Tag size={20} className="text-amber-500" />;
      case 'wallet': return <Wallet size={20} className="text-indigo-500" />;
      case 'system': return <Info size={20} className="text-[#ED1C24]" />;
      default: return <Bell size={20} className="text-gray-400" />;
    }
  };

  const groupedNotifications = useMemo(() => {
    const today: AppNotification[] = [];
    const yesterday: AppNotification[] = [];
    const earlier: AppNotification[] = [];
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;

    notifications.forEach(n => {
      const time = new Date(n.date).getTime();
      if (time >= todayStart) today.push(n);
      else if (time >= yesterdayStart) yesterday.push(n);
      else earlier.push(n);
    });

    return { today, yesterday, earlier };
  }, [notifications]);

  const bgClass = isDark ? 'bg-[#0F172A]' : 'bg-[#F3F7FA]';
  const cardClass = isDark ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-gray-100 shadow-sm';
  const textPrimary = isDark ? 'text-white' : 'text-[#1A3A5A]';
  const textSecondary = isDark ? 'text-slate-400' : 'text-gray-400';

  return (
    <div className={`flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500 ${bgClass} overflow-x-hidden`}>
      {/* Header */}
      <header className={`${isDark ? 'bg-slate-900/80' : 'bg-white/80'} backdrop-blur-xl border-b ${isDark ? 'border-white/5' : 'border-slate-200/60'} h-24 flex items-center justify-between shrink-0 z-20 sticky top-0`}>
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className={`p-2 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-100 text-gray-600'}`}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className={`text-xl lg:text-2xl font-black uppercase tracking-tight ${textPrimary}`}>
              {t('notifications')}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-1.5 h-1.5 bg-[#ED1C24] rounded-full animate-pulse"></div>
              <p className="text-[10px] font-black text-[#ED1C24] uppercase tracking-widest">
                {notifications.filter(n => !n.read).length} {t('unread')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {notifications.some(n => !n.read) && (
            <button 
              onClick={markAllAsRead}
              className={`p-2.5 ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'} rounded-2xl transition-all flex items-center gap-2 group`}
              title={t('mark_all_read')}
            >
              <CheckCheck size={20} className="text-blue-500 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase hidden md:block text-slate-500">{t('mark_all_read')}</span>
            </button>
          )}
          {notifications.some(n => isOlderThan24h(n.date)) && (
            <button 
              onClick={deleteAllNotifications}
              className={`p-2.5 ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'} rounded-2xl transition-all flex items-center gap-2 group`}
              title={t('delete_all')}
            >
              <Trash2 size={20} className="text-[#ED1C24] group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase hidden md:block text-slate-500">{t('delete_all')}</span>
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-32 pt-6 custom-scrollbar overflow-x-hidden">
        {notifications.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className={`w-28 h-28 rounded-[48px] ${isDark ? 'bg-slate-900' : 'bg-white'} border ${isDark ? 'border-white/5' : 'border-slate-200'} flex items-center justify-center mb-8 shadow-2xl relative`}>
              <div className="absolute inset-0 bg-[#ED1C24] blur-2xl opacity-5 rounded-full"></div>
              <Bell size={48} className="text-slate-300 relative z-10" />
            </div>
            <h3 className={`text-2xl font-black uppercase tracking-tight mb-3 ${textPrimary}`}>
              {t('no_notifications')}
            </h3>
            <p className={`text-[11px] font-bold uppercase tracking-[0.2em] max-w-[280px] leading-relaxed ${textSecondary}`}>
              {t('no_notifications_desc')}
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-10">
            {groupedNotifications.today.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                  <Calendar size={14} className="text-[#ED1C24]" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {t('today')}
                  </h3>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-white/5"></div>
                </div>
                <div className="grid gap-4">
                  <AnimatePresence initial={false}>
                    {groupedNotifications.today.map(notification => {
                      const canDelete = isOlderThan24h(notification.date);
                      const isUnread = !notification.read;
                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={`relative group ${cardClass} rounded-[32px] p-5 lg:p-6 border transition-all hover:shadow-lg ${isUnread ? 'ring-2 ring-[#ED1C24]/10' : ''}`}
                          onClick={() => isUnread && markAsRead(notification.id)}
                        >
                          <div className="flex items-start gap-5">
                            <div className={`w-14 h-14 rounded-[24px] flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-sm ${
                              notification.type === 'order' ? 'bg-blue-500/10' :
                              notification.type === 'promo' ? 'bg-amber-500/10' :
                              notification.type === 'wallet' ? 'bg-indigo-500/10' :
                              'bg-[#ED1C24]/10'
                            }`}>
                              {getIcon(notification.type, notification.title)}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex flex-col gap-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                                      notification.type === 'order' ? 'bg-blue-500/10 text-blue-500' :
                                      notification.type === 'promo' ? 'bg-amber-500/10 text-amber-500' :
                                      notification.type === 'wallet' ? 'bg-indigo-500/10 text-indigo-500' :
                                      'bg-[#ED1C24]/10 text-[#ED1C24]'
                                    }`}>
                                      {notification.type}
                                    </span>
                                    <h4 className={`text-sm lg:text-base font-black uppercase tracking-tight ${textPrimary} ${isUnread ? 'opacity-100' : 'opacity-70'}`}>
                                      {notification.title}
                                    </h4>
                                  </div>
                                </div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap shrink-0 mt-1">
                                  {getTimeAgo(notification.date)}
                                </span>
                              </div>
                              
                              <p className={`text-xs lg:text-sm leading-relaxed mb-5 ${textSecondary} ${isUnread ? 'font-bold opacity-100' : 'font-medium opacity-60'}`}>
                                {notification.message}
                              </p>
                              
                              <div className="flex items-center justify-between mt-auto">
                                <div className="flex items-center gap-3">
                                  {(notification.type === 'order' || notification.type === 'wallet') && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleView(notification);
                                      }}
                                      className="flex items-center gap-2 px-5 py-3 bg-[#1A3A5A] dark:bg-white text-white dark:text-[#1A3A5A] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md"
                                    >
                                      <Eye size={16} />
                                      {t('view')}
                                    </button>
                                  )}
                                  {isUnread && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAsRead(notification.id);
                                      }}
                                      className="flex items-center gap-2 px-4 py-3 bg-blue-500/10 text-blue-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all"
                                    >
                                      <CheckCheck size={16} />
                                      {t('mark_read')}
                                    </button>
                                  )}
                                </div>

                                <div className={`flex items-center gap-2 transition-opacity ${canDelete ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                  {!canDelete ? (
                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-amber-500 uppercase tracking-tighter bg-amber-500/5 px-2.5 py-1.5 rounded-lg border border-amber-500/10">
                                      <Clock size={12} />
                                      {t('delete_after_24h')}
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteNotification(notification.id);
                                      }}
                                      className="p-2.5 text-slate-400 hover:text-[#ED1C24] hover:bg-[#ED1C24]/10 rounded-xl transition-all"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {groupedNotifications.yesterday.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                  <Clock size={14} className="text-slate-400" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {t('yesterday')}
                  </h3>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-white/5"></div>
                </div>
                <div className="grid gap-4">
                  <AnimatePresence initial={false}>
                    {groupedNotifications.yesterday.map(notification => {
                      const canDelete = isOlderThan24h(notification.date);
                      const isUnread = !notification.read;
                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={`relative group ${cardClass} rounded-[32px] p-5 lg:p-6 border transition-all hover:shadow-lg ${isUnread ? 'ring-2 ring-[#ED1C24]/10' : ''}`}
                          onClick={() => isUnread && markAsRead(notification.id)}
                        >
                          <div className="flex items-start gap-5">
                            <div className={`w-14 h-14 rounded-[24px] flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-sm ${
                              notification.type === 'order' ? 'bg-blue-500/10' :
                              notification.type === 'promo' ? 'bg-amber-500/10' :
                              notification.type === 'wallet' ? 'bg-indigo-500/10' :
                              'bg-[#ED1C24]/10'
                            }`}>
                              {getIcon(notification.type, notification.title)}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex flex-col gap-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                                      notification.type === 'order' ? 'bg-blue-500/10 text-blue-500' :
                                      notification.type === 'promo' ? 'bg-amber-500/10 text-amber-500' :
                                      notification.type === 'wallet' ? 'bg-indigo-500/10 text-indigo-500' :
                                      'bg-[#ED1C24]/10 text-[#ED1C24]'
                                    }`}>
                                      {notification.type}
                                    </span>
                                    <h4 className={`text-sm lg:text-base font-black uppercase tracking-tight ${textPrimary} ${isUnread ? 'opacity-100' : 'opacity-70'}`}>
                                      {notification.title}
                                    </h4>
                                  </div>
                                </div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap shrink-0 mt-1">
                                  {getTimeAgo(notification.date)}
                                </span>
                              </div>
                              
                              <p className={`text-xs lg:text-sm leading-relaxed mb-5 ${textSecondary} ${isUnread ? 'font-bold opacity-100' : 'font-medium opacity-60'}`}>
                                {notification.message}
                              </p>
                              
                              <div className="flex items-center justify-between mt-auto">
                                <div className="flex items-center gap-3">
                                  {(notification.type === 'order' || notification.type === 'wallet') && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleView(notification);
                                      }}
                                      className="flex items-center gap-2 px-5 py-3 bg-[#1A3A5A] dark:bg-white text-white dark:text-[#1A3A5A] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md"
                                    >
                                      <Eye size={16} />
                                      {t('view')}
                                    </button>
                                  )}
                                  {isUnread && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAsRead(notification.id);
                                      }}
                                      className="flex items-center gap-2 px-4 py-3 bg-blue-500/10 text-blue-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all"
                                    >
                                      <CheckCheck size={16} />
                                      {t('mark_read')}
                                    </button>
                                  )}
                                </div>

                                <div className={`flex items-center gap-2 transition-opacity ${canDelete ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                  {!canDelete ? (
                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-amber-500 uppercase tracking-tighter bg-amber-500/5 px-2.5 py-1.5 rounded-lg border border-amber-500/10">
                                      <Clock size={12} />
                                      {t('delete_after_24h')}
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteNotification(notification.id);
                                      }}
                                      className="p-2.5 text-slate-400 hover:text-[#ED1C24] hover:bg-[#ED1C24]/10 rounded-xl transition-all"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {groupedNotifications.earlier.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                  <Filter size={14} className="text-slate-400" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {t('earlier')}
                  </h3>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-white/5"></div>
                </div>
                <div className="grid gap-4">
                  <AnimatePresence initial={false}>
                    {groupedNotifications.earlier.map(notification => {
                      const canDelete = isOlderThan24h(notification.date);
                      const isUnread = !notification.read;
                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={`relative group ${cardClass} rounded-[32px] p-5 lg:p-6 border transition-all hover:shadow-lg ${isUnread ? 'ring-2 ring-[#ED1C24]/10' : ''}`}
                          onClick={() => isUnread && markAsRead(notification.id)}
                        >
                          <div className="flex items-start gap-5">
                            <div className={`w-14 h-14 rounded-[24px] flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-sm ${
                              notification.type === 'order' ? 'bg-blue-500/10' :
                              notification.type === 'promo' ? 'bg-amber-500/10' :
                              notification.type === 'wallet' ? 'bg-indigo-500/10' :
                              'bg-[#ED1C24]/10'
                            }`}>
                              {getIcon(notification.type, notification.title)}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex flex-col gap-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                                      notification.type === 'order' ? 'bg-blue-500/10 text-blue-500' :
                                      notification.type === 'promo' ? 'bg-amber-500/10 text-amber-500' :
                                      notification.type === 'wallet' ? 'bg-indigo-500/10 text-indigo-500' :
                                      'bg-[#ED1C24]/10 text-[#ED1C24]'
                                    }`}>
                                      {notification.type}
                                    </span>
                                    <h4 className={`text-sm lg:text-base font-black uppercase tracking-tight ${textPrimary} ${isUnread ? 'opacity-100' : 'opacity-70'}`}>
                                      {notification.title}
                                    </h4>
                                  </div>
                                </div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap shrink-0 mt-1">
                                  {getTimeAgo(notification.date)}
                                </span>
                              </div>
                              
                              <p className={`text-xs lg:text-sm leading-relaxed mb-5 ${textSecondary} ${isUnread ? 'font-bold opacity-100' : 'font-medium opacity-60'}`}>
                                {notification.message}
                              </p>
                              
                              <div className="flex items-center justify-between mt-auto">
                                <div className="flex items-center gap-3">
                                  {(notification.type === 'order' || notification.type === 'wallet') && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleView(notification);
                                      }}
                                      className="flex items-center gap-2 px-5 py-3 bg-[#1A3A5A] dark:bg-white text-white dark:text-[#1A3A5A] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md"
                                    >
                                      <Eye size={16} />
                                      {t('view')}
                                    </button>
                                  )}
                                  {isUnread && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAsRead(notification.id);
                                      }}
                                      className="flex items-center gap-2 px-4 py-3 bg-blue-500/10 text-blue-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all"
                                    >
                                      <CheckCheck size={16} />
                                      {t('mark_read')}
                                    </button>
                                  )}
                                </div>

                                <div className={`flex items-center gap-2 transition-opacity ${canDelete ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                  {!canDelete ? (
                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-amber-500 uppercase tracking-tighter bg-amber-500/5 px-2.5 py-1.5 rounded-lg border border-amber-500/10">
                                      <Clock size={12} />
                                      {t('delete_after_24h')}
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteNotification(notification.id);
                                      }}
                                      className="p-2.5 text-slate-400 hover:text-[#ED1C24] hover:bg-[#ED1C24]/10 rounded-xl transition-all"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsScreen;
