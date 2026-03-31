
import React, { useState, useEffect } from 'react';
import { ClipboardList, Truck, Flame, Ticket, XCircle, MapPin, Store, CheckCircle2, Star, Phone, Calendar, Hash, Package, ChevronDown, ChevronUp, Check, ArrowLeft, Trash2, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { Order, OrderStatus, Depot, OrderType } from '../types';
import TrackingMap from '../components/TrackingMap';
import { useLanguage } from '../context/LanguageContext';
import { calculateReservationFee } from '../constants';

interface OrdersScreenProps {
  orders: Order[];
  trackingOrder: Order | null;
  onClearTracking: () => void;
  onCancelOrder: (id: string) => void;
  onDeleteOrder: (id: string) => void;
  onRateOrder?: (order: Order) => void;
  onViewOnMap?: (depotId: string) => void;
  onClearOldOrders?: () => void;
  areBlocksDark?: boolean;
  depots: Depot[];
  onBack?: () => void;
  isLoading?: boolean;
  onSubmitReview?: (depotId: string, rating: number, comment: string, orderId: string) => Promise<void>;
}

const CountdownTimer: React.FC<{ createdAt: string }> = ({ createdAt }) => {
  const { t } = useLanguage();
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const calculateTime = () => {
      const orderDate = new Date(createdAt);
      const expiryDate = new Date(orderDate.getTime() + 24 * 60 * 60 * 1000);
      const now = new Date();
      const diff = expiryDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('00:00:00');
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${h}${t('hours_short')} ${m}${t('minutes_short')} ${s}${t('seconds_short')}`);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [createdAt, t]);

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 rounded-lg border border-orange-500/20">
      <Clock size={12} className="text-orange-500 animate-pulse" />
      <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">
        {t('countdown_expires')}{timeLeft}
      </span>
    </div>
  );
};

const OrdersScreen: React.FC<OrdersScreenProps> = ({ orders, trackingOrder, onClearTracking, onCancelOrder, onDeleteOrder, onRateOrder, onViewOnMap, onClearOldOrders, areBlocksDark, depots, onBack, isLoading, onSubmitReview }) => {
  const { t } = useLanguage();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const blockClass = areBlocksDark ? "bg-[#1E293B] border-slate-800" : "bg-white border-gray-100 shadow-md";
  const titleClass = areBlocksDark ? "text-white" : "text-gray-800";
  const subTextClass = areBlocksDark ? "text-slate-400" : "text-gray-500";

  const getTrackingData = () => {
    if (!trackingOrder) return null;
    const depot = depots.find(d => d.id === trackingOrder.depotId || d.id === trackingOrder.depot_id);
    if (!depot) return null;

    return {
      depotCoords: { lat: depot.latitude, lng: depot.longitude },
      userCoords: { lat: -8.9250, lng: 13.2000 } 
    };
  };

  const trackingData = getTrackingData();

  const translateStatus = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return t('status_pending');
      case OrderStatus.CONFIRMED: return t('status_confirmed');
      case OrderStatus.OUT_FOR_DELIVERY: return t('status_out_for_delivery');
      case OrderStatus.DELIVERED: return t('status_delivered');
      case OrderStatus.CANCELLED: return t('status_cancelled');
      case OrderStatus.READY_FOR_PICKUP: return t('status_ready_for_pickup');
      default: return status;
    }
  };

  const translateOrderType = (type: OrderType) => {
    switch (type) {
      case OrderType.RESERVATION: return t('type_reservation');
      case OrderType.PICKUP: return t('type_pickup');
      default: return type;
    }
  };

  const canDeleteOrder = (createdAt: string) => {
    const orderDate = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - orderDate.getTime();
    const thresholdMs = (24 * 60 + 40) * 60 * 1000; // 24h 40m
    return diffMs > thresholdMs;
  };

  const handleRatingSubmit = async () => {
    if (!ratingOrder || !onSubmitReview) return;
    
    setIsSubmittingRating(true);
    try {
      const response = await onSubmitReview(
        ratingOrder.depotId || (ratingOrder as any).depot_id,
        ratingValue,
        ratingComment,
        ratingOrder.id
      );
      setRatingOrder(null);
      setRatingValue(5);
      setRatingComment('');
      alert(t('review_published_alert'));
    } catch (err) {
      console.error("Error submitting review:", err);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {onBack && (
            <button 
              onClick={onBack}
              className={`p-2 rounded-xl border ${areBlocksDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-100 text-gray-600'}`}
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h2 className={`text-xl font-black ${titleClass}`}>{t('my_orders')}</h2>
        </div>

        {orders.some(o => o.status === OrderStatus.DELIVERED || o.status === OrderStatus.CANCELLED) && onClearOldOrders && (
          <button 
            onClick={() => setShowClearConfirm(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
              areBlocksDark ? 'bg-[#ED1C24]/10 text-[#ED1C24] border border-[#ED1C24]/20' : 'bg-red-50 text-[#ED1C24] border border-red-100'
            }`}
          >
            <Trash2 size={14} />
            {t('clear_history')}
          </button>
        )}
      </div>

      {/* Modal de Confirmação para Limpar Histórico */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`${blockClass} w-full max-w-sm rounded-[32px] p-8 border shadow-2xl animate-in zoom-in-95 duration-300`}>
            <div className="w-16 h-16 rounded-full bg-[#ED1C24]/10 text-[#ED1C24] flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h3 className={`text-center font-black text-lg ${titleClass} mb-2 uppercase tracking-tight`}>{t('clear_old_orders')}</h3>
            <p className={`text-center text-xs ${subTextClass} mb-8 font-medium leading-relaxed`}>
              {t('clear_history_desc')}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setShowClearConfirm(false)}
                className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${areBlocksDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
              >
                {t('cancel_btn')}
              </button>
              <button 
                onClick={() => {
                  onClearOldOrders();
                  setShowClearConfirm(false);
                }}
                className="py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-[#ED1C24] text-white shadow-lg shadow-[#ED1C24]/20"
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Cancelar Reserva */}
      {cancelConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`${blockClass} w-full max-w-sm rounded-[32px] p-8 border shadow-2xl animate-in zoom-in-95 duration-300`}>
            <div className="w-16 h-16 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-6">
              <XCircle size={32} />
            </div>
            <h3 className={`text-center font-black text-lg ${titleClass} mb-2 uppercase tracking-tight`}>{t('cancel_reservation')}</h3>
            <p className={`text-center text-xs ${subTextClass} mb-8 font-medium leading-relaxed`}>
              {t('cancel_reservation_desc')}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setCancelConfirmId(null)}
                className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${areBlocksDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
              >
                {t('back')}
              </button>
              <button 
                onClick={() => {
                  onCancelOrder(cancelConfirmId);
                  setCancelConfirmId(null);
                }}
                className="py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-orange-500 text-white shadow-lg shadow-orange-500/20"
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Avaliação */}
      {ratingOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`${blockClass} w-full max-w-sm rounded-[32px] p-8 border shadow-2xl animate-in zoom-in-95 duration-300`}>
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center mx-auto mb-6">
              <Star size={32} fill="currentColor" />
            </div>
            <h3 className={`text-center font-black text-lg ${titleClass} mb-2 uppercase tracking-tight`}>{t('rate_depot')}</h3>
            <p className={`text-center text-[10px] ${subTextClass} mb-6 font-bold uppercase tracking-widest`}>
              {ratingOrder.depotName}
            </p>

            <div className="flex justify-center gap-2 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatingValue(star)}
                  className="transition-transform active:scale-90"
                >
                  <Star
                    size={32}
                    className={star <= ratingValue ? "text-yellow-400" : "text-gray-300"}
                    fill={star <= ratingValue ? "currentColor" : "none"}
                  />
                </button>
              ))}
            </div>

            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder={t('write_comment')}
              className={`w-full p-4 rounded-2xl text-xs font-medium border mb-8 focus:ring-2 focus:ring-[#ED1C24]/20 transition-all ${
                areBlocksDark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-gray-50 border-gray-100 text-gray-800 placeholder:text-gray-400'
              }`}
              rows={3}
            />

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setRatingOrder(null)}
                disabled={isSubmittingRating}
                className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${areBlocksDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
              >
                {t('cancel_btn')}
              </button>
              <button 
                onClick={handleRatingSubmit}
                disabled={isSubmittingRating}
                className="py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-[#ED1C24] text-white shadow-lg shadow-[#ED1C24]/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmittingRating ? <Loader2 size={14} className="animate-spin" /> : t('send')}
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`${blockClass} w-full max-w-sm rounded-[32px] p-8 border shadow-2xl animate-in zoom-in-95 duration-300`}>
            <div className="w-16 h-16 rounded-full bg-[#ED1C24]/10 text-[#ED1C24] flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className={`text-center font-black text-lg ${titleClass} mb-2 uppercase tracking-tight`}>{t('delete_order')}</h3>
            <p className={`text-center text-xs ${subTextClass} mb-8 font-medium leading-relaxed`}>
              {t('delete_order_confirm')}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${areBlocksDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
              >
                {t('cancel_btn')}
              </button>
              <button 
                onClick={() => {
                  onDeleteOrder(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-[#ED1C24] text-white shadow-lg shadow-[#ED1C24]/20"
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {trackingOrder && trackingOrder.status !== OrderStatus.DELIVERED && (
        <div className={`${blockClass} rounded-[32px] p-6 mb-8 border shadow-xl relative overflow-hidden transition-colors`}>
          <div className="absolute top-0 right-0 p-4">
            <div className="bg-green-500/10 text-green-500 text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest animate-pulse">{t('live_tracking')}</div>
          </div>

          <div className="flex justify-between items-center mb-6">
            <div>
              <span className="text-[10px] font-black text-[#ED1C24] uppercase tracking-widest bg-[#ED1C24]/10 px-2.5 py-1 rounded-lg">{t('tracking_delivery')}</span>
              <h3 className={`mt-2 font-black ${titleClass} text-lg leading-none`}>#{trackingOrder.id}</h3>
            </div>
          </div>
          
          {trackingData && (
            <TrackingMap 
              progress={trackingOrder.trackingProgress} 
              depotCoords={trackingData.depotCoords}
              userCoords={trackingData.userCoords}
            />
          )}

          <div className="flex gap-4 items-center">
            <div className={`p-4 rounded-2xl ${areBlocksDark ? 'bg-blue-500/20' : 'bg-blue-50'} text-blue-600 animate-pulse shadow-sm`}>
              <Truck size={28} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`w-2 h-2 rounded-full bg-blue-600`}></span>
                <h3 className={`font-black ${titleClass} text-xs uppercase tracking-tight`}>{translateStatus(trackingOrder.status)}</h3>
              </div>
              <p className={`text-[10px] ${subTextClass} font-bold leading-tight`}>{t('courier_on_way').replace('{name}', trackingOrder.depotName)}</p>
              
              <div className="mt-3 w-full h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-1000 ease-out" 
                  style={{ width: `${trackingOrder.trackingProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <button 
            onClick={onClearTracking}
            className={`w-full mt-6 py-3.5 text-[10px] font-black ${areBlocksDark ? 'text-slate-300 bg-slate-800 border-slate-700' : 'text-[#1A3A5A] bg-gray-50 border-gray-100 shadow-sm'} border rounded-2xl uppercase tracking-widest transition-all active:scale-95`}
          >
            {t('hide_tracking')}
          </button>
        </div>
      )}

      {orders.length === 0 ? (
        isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
            <p className={`font-black text-sm uppercase tracking-widest ${areBlocksDark ? 'text-white' : 'text-gray-900'}`}>{t('loading' as any) || 'Carregando...'}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 opacity-30 dark:opacity-10 text-center">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${areBlocksDark ? 'bg-slate-800' : 'bg-gray-200'}`}>
              <ClipboardList size={48} className={`${areBlocksDark ? 'text-white' : 'text-[#1A3A5A]'}`} />
            </div>
            <p className={`font-black text-sm uppercase tracking-widest ${areBlocksDark ? 'text-white' : 'text-gray-900'}`}>{t('no_history')}.</p>
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4 px-1">
             <div className="w-1 h-4 bg-[#ED1C24] rounded-full"></div>
             <p className={`text-[11px] font-black ${subTextClass} uppercase tracking-[0.2em]`}>{t('recent_history')}</p>
          </div>
          
          {orders.map(order => {
            const depot = depots.find(d => d.id === order.depotId || d.id === order.depot_id);
            const isExpanded = expandedOrderId === order.id;
            
            return (
              <div key={order.id} className={`${blockClass} rounded-[32px] p-6 border shadow-sm group transition-all hover:border-[#ED1C24]/20`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm overflow-hidden ${
                      order.orderType === OrderType.PICKUP ? 'bg-green-500/5 text-green-600' : 'bg-blue-500/5 text-blue-600'
                    }`}>
                      {depot?.imageUrl ? (
                        <img 
                          src={depot.imageUrl} 
                          className="w-full h-full object-cover" 
                          alt={order.depotName} 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        order.orderType === OrderType.PICKUP ? <Store size={28} /> : <Truck size={28} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-black text-base ${titleClass} uppercase truncate`}>{order.depotName}</h4>
                        <span className="text-[8px] font-black bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-gray-400 uppercase tracking-widest">
                          {translateOrderType(order.orderType)}
                        </span>
                        {canDeleteOrder(order.createdAt) && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(order.id);
                            }}
                            className="p-1.5 rounded-lg bg-[#ED1C24]/10 text-[#ED1C24] hover:bg-[#ED1C24] hover:text-white transition-all active:scale-90"
                            title={t('delete_order_info')}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                         <Hash size={10} className="text-[#ED1C24]" />
                         <p className={`text-[10px] ${subTextClass} font-black uppercase tracking-widest`}>
                           {t('order_ref')}: {order.id.slice(0, 8).toUpperCase()}
                         </p>
                      </div>
                      
                      {/* Mostrar itens no estado colapsado para melhor visibilidade */}
                      <div className="mt-1 flex items-center gap-1.5">
                        <Package size={10} className="text-gray-400" />
                        <p className={`text-[10px] font-bold ${titleClass} truncate`}>{order.items}</p>
                      </div>
                      
                      {/* Preçário e Status */}
                      <div className="mt-3 flex items-center gap-3">
                        <div className={`px-3 py-1.5 rounded-xl ${areBlocksDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'} border shadow-inner`}>
                          <p className={`text-[7px] font-black uppercase tracking-widest ${subTextClass} mb-0.5 opacity-60`}>{t('total_fee_paid')}</p>
                          <p className={`font-black text-sm ${areBlocksDark ? 'text-white' : 'text-[#1A3A5A]'} leading-none tracking-tighter`}>
                            {calculateReservationFee(order.quantity || 1).toLocaleString('pt-AO')} <span className="text-[8px] opacity-40">Kz</span>
                          </p>
                          <p className={`text-[7px] font-black uppercase tracking-widest ${subTextClass} mt-1.5 mb-0.5 opacity-60`}>{t('to_pay_at_depot')}</p>
                          <p className={`font-black text-sm text-orange-500 leading-none tracking-tighter`}>
                            {order.total.toLocaleString('pt-AO')} <span className="text-[8px] opacity-40">Kz</span>
                          </p>
                        </div>
                        
                        <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${
                          order.status === OrderStatus.DELIVERED || order.status === OrderStatus.READY_FOR_PICKUP ? 'bg-green-500/10 text-green-600' : 
                          order.status === OrderStatus.CANCELLED ? 'bg-[#ED1C24]/10 text-[#ED1C24]' :
                          'bg-blue-500/10 text-blue-600'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            order.status === OrderStatus.DELIVERED || order.status === OrderStatus.READY_FOR_PICKUP ? 'bg-green-600' : 
                            order.status === OrderStatus.CANCELLED ? 'bg-[#ED1C24]' :
                            'bg-blue-600 animate-pulse'
                          }`}></div>
                          <span className="text-[8px] font-black uppercase tracking-widest">
                            {translateStatus(order.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {order.orderType === OrderType.PICKUP && order.status === OrderStatus.CONFIRMED && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 rounded-2xl flex items-center gap-3 animate-in zoom-in-95 duration-500">
                    <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-green-500/20">
                      <Check size={16} strokeWidth={4} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase tracking-widest leading-tight">{t('confirmed_reservation')}</p>
                      <p className="text-[9px] font-bold text-green-600/80 dark:text-green-500/60 uppercase mt-0.5">{t('pickup_ready_info')}</p>
                    </div>
                  </div>
                )}

                {order.orderType === OrderType.PICKUP && order.status === OrderStatus.READY_FOR_PICKUP && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl flex items-center gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20">
                      <Store size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest leading-tight">{t('ready_for_pickup')}</p>
                      <p className="text-[9px] font-bold text-blue-600/80 dark:text-blue-500/60 uppercase mt-0.5">{t('pickup_instruction')}</p>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-center gap-4">
                  <button 
                    onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                    className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${subTextClass} hover:text-[#ED1C24] transition-colors`}
                  >
                    {isExpanded ? (
                      <>{t('hide_details')} <ChevronUp size={14} /></>
                    ) : (
                      <>{t('view_details')} <ChevronDown size={14} /></>
                    )}
                  </button>

                  {order.status === OrderStatus.PENDING && order.createdAt && (
                    <div className="scale-90">
                      <CountdownTimer createdAt={order.createdAt} />
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    {depot?.imageUrl && (
                      <div className="w-full h-32 rounded-2xl overflow-hidden mb-4 border border-gray-100 dark:border-slate-800">
                        <img 
                          src={depot.imageUrl} 
                          className="w-full h-full object-cover" 
                          alt={order.depotName} 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-3 py-4 border-y border-gray-50 dark:border-slate-800/50">
                    {order.status === OrderStatus.PENDING && (
                      <div className="mb-2">
                        <button 
                          onClick={() => setCancelConfirmId(order.id)}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#ED1C24]/10 text-[#ED1C24] text-[10px] font-black uppercase tracking-widest border border-[#ED1C24]/20 hover:bg-[#ED1C24] hover:text-white transition-all"
                        >
                          <XCircle size={14} />
                          {t('cancel_reservation')}
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-400">
                          <Package size={14} />
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{t('order_items')}</p>
                          <p className={`text-xs font-bold ${titleClass}`}>{order.items}</p>
                        </div>
                    </div>

                    {depot && (
                      <>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-400">
                              <MapPin size={14} />
                            </div>
                            <div className="flex-1">
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{t('depot_location')}</p>
                              <div className="flex items-center justify-between gap-2">
                                <p className={`text-xs font-bold ${titleClass} truncate max-w-[150px]`}>{depot.address}</p>
                                <button 
                                  onClick={() => onViewOnMap?.(depot.id)}
                                  className="flex items-center gap-1 text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                                >
                                  <MapPin size={10} />
                                  {t('view_on_map')}
                                </button>
                              </div>
                            </div>
                        </div>
                        {depot.isOpen && (
                          <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-400">
                                <Phone size={14} />
                              </div>
                              <div>
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{t('depot_contact')}</p>
                                <p className={`text-xs font-bold ${titleClass}`}>{depot.phone}</p>
                              </div>
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-400">
                          <Calendar size={14} />
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{t('date_time')}</p>
                          <p className={`text-xs font-bold ${titleClass}`}>{order.date}</p>
                        </div>
                    </div>
                  </div>
                </div>
              )}

                {(order.status === OrderStatus.DELIVERED || order.status === OrderStatus.READY_FOR_PICKUP) && (
                  <div className="mt-4 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <CheckCircle2 size={14} className="text-green-500" />
                       <span className={`text-[10px] font-bold ${subTextClass}`}>{t('cylinder_received')}</span>
                     </div>
                      {order.isRated ? (
                        <div className="flex items-center gap-1">
                           <Star size={12} className="text-yellow-400 fill-yellow-400" />
                           <span className="text-[10px] font-black text-yellow-500">{t('rated')}</span>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setRatingOrder(order)}
                          className="bg-[#ED1C24]/10 text-[#ED1C24] px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#ED1C24] hover:text-white transition-all active:scale-95"
                        >
                          {t('rate_depot')}
                        </button>
                      )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrdersScreen;
