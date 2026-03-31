
import React from 'react';
import { X, Bell, CheckCircle2, Info, Tag, Clock, Trash2, CheckCheck, Trash } from 'lucide-react';
import { AppNotification } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onDeleteAllNotifications: () => void;
  onClickNotification?: (notification: AppNotification) => void;
  isDark: boolean;
  userType?: string;
  hasPendingReservations?: boolean;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ 
  isOpen, 
  onClose, 
  notifications, 
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onDeleteAllNotifications,
  onClickNotification,
  isDark,
  userType,
  hasPendingReservations
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const isPersistent = (notification: AppNotification) => {
    if (notification.type !== 'order') return false;
    const type = userType?.toString().toUpperCase();
    if (type !== 'DEPOSITO' && type !== 'DEPÓSITO') return false;
    const msg = notification.message.toLowerCase();
    const isReservation = msg.includes('reserva') || msg.includes('pickup') || msg.includes('pedido');
    return isReservation && hasPendingReservations;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'order': return <CheckCircle2 size={18} className="text-green-500" />;
      case 'promo': return <Tag size={18} className="text-orange-500" />;
      default: return <Info size={18} className="text-blue-500" />;
    }
  };

  const activeCount = notifications.filter(n => !n.read || isPersistent(n)).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className={`relative w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-[#ED1C24]" />
            <h2 className={`font-black uppercase tracking-widest text-sm ${isDark ? 'text-white' : 'text-[#1A3A5A]'}`}>
              {t('notifications')}
            </h2>
            {activeCount > 0 && (
              <span className="bg-[#ED1C24] text-white text-[8px] px-2 py-0.5 rounded-full font-black">
                {activeCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <>
                {notifications.some(n => !n.read) && (
                  <button 
                    onClick={onMarkAllAsRead}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-blue-500"
                    title={t('mark_all_read')}
                  >
                    <CheckCheck size={18} />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button 
                    onClick={onDeleteAllNotifications}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-[#ED1C24]"
                    title={t('delete_all')}
                  >
                    <Trash size={18} />
                  </button>
                )}
              </>
            )}
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
              <X size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
          {userType === 'ADMIN' && (
            <div className="mb-4 p-3 bg-blue-500/5 rounded-2xl border border-blue-500/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">{t('live_activity')}</span>
              </div>
              <p className="text-[9px] font-medium text-gray-500 dark:text-slate-400">
                {t('monitoring_real_time')}
              </p>
            </div>
          )}
          {notifications.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center">
              <Bell size={48} className="text-gray-200 dark:text-slate-800 mb-4" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {t('no_notifications')}
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div 
                key={notification.id}
                onClick={() => {
                  if (onClickNotification) {
                    onClickNotification(notification);
                  } else if (!notification.read) {
                    onMarkAsRead(notification.id);
                  }
                }}
                className={`p-4 rounded-2xl border transition-all relative group cursor-pointer ${
                  notification.read 
                    ? (isDark ? 'bg-slate-800/20 border-slate-800' : 'bg-gray-50 border-gray-100') 
                    : (isDark ? 'bg-slate-800 border-blue-500/30' : 'bg-white border-blue-100 shadow-sm')
                } ${isPersistent(notification) ? 'border-l-4 border-l-[#ED1C24]' : ''}`}
              >
                {!notification.read && (
                  <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
                
                {!isPersistent(notification) && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNotification(notification.id);
                    }}
                    className="absolute bottom-4 right-4 p-1.5 rounded-lg bg-[#ED1C24]/10 text-[#ED1C24] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                <div className="flex gap-3">
                  <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-xs font-black mb-1 truncate pr-6 ${isDark ? 'text-white' : 'text-[#1A3A5A]'}`}>
                      {notification.title}
                    </h4>
                    <p className={`text-[10px] font-medium leading-relaxed mb-2 pr-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-1 text-[8px] font-black text-gray-400 uppercase tracking-widest">
                      <Clock size={10} />
                      {new Date(notification.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-gray-50 dark:bg-slate-800/50">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-[#1A3A5A] dark:bg-[#ED1C24] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
          >
            {t('close' as any) || 'Fechar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;
