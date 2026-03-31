import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, 
  Star, 
  Flame, 
  ShoppingCart, 
  Clock, 
  MapPin, 
  Package, 
  Ticket, 
  Heart, 
  MessageSquare,
  AlertCircle,
  Phone, 
  ShieldCheck,
  Truck,
  Store,
  CheckCircle2,
  Send,
  Check,
  Info,
  Wallet,
  Banknote,
  BadgeCheck,
  Loader2,
  Plus,
  Minus,
  Layers,
  Sparkles
} from 'lucide-react';
import { Depot, Review, OrderType, Product } from '../types';
import { supabase } from '../services/supabaseClient';
import { useLanguage } from '../context/LanguageContext';
import { RESERVATION_FEE, calculateReservationFee } from '../constants';
import { sqliteService } from '../services/sqlite';

interface DepotDetailsScreenProps {
  depot: Depot;
  onBack: () => void;
  onPlaceOrder: (type: OrderType, bottleType: string, quantity: number, productId?: string) => void;
  onAddReview: (review: Review) => void;
  areBlocksDark?: boolean;
  isBgDark?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (depotId: string) => void;
}

const BOTTLE_METADATA: Record<string, { label: string, image: string }> = {
  '12kg': { 
    label: '12kg (Normal)', 
    image: 'https://gasinsp.pt/wp-content/uploads/2018/09/bottle_site.jpg' 
  },
  'levita': { 
    label: 'Levita (Leve)', 
    image: 'https://dxm.content-center.totalenergies.com/api/wedia/dam/transform/xysh7dg731tahrciai1e4eisxo/levita-mini.webp?t=resize&width=691&height=387' 
  },
  '5kg': { 
    label: '5kg (Pequena)', 
    image: 'https://www.galaxcommerce.com.br/sistema/upload/3200/produtos/botijAo-de-gAs-p05_2021-12-28_16-36-10_1_418.jpg' 
  },
  '35kg': { 
    label: '35kg (Industrial)', 
    image: 'https://www.rcgas.pt/wp-content/uploads/2016/06/PL35kg.jpg' 
  },
};

const VALID_COUPONS: Record<string, number> = {
  'GASJA10': 500,
  'KILAMBA24': 300,
  'PRIMEIRACOMPRA': 1000,
  'NAMIBE500': 500,
  'PROMO2024': 400,
  'GASJA500': 500
};

const DepotDetailsScreen: React.FC<DepotDetailsScreenProps> = ({ 
  depot, 
  onBack, 
  onPlaceOrder, 
  onAddReview, 
  areBlocksDark, 
  isBgDark,
  isFavorite,
  onToggleFavorite
}) => {
  const { t } = useLanguage();
  const [orderType] = useState<OrderType>(OrderType.PICKUP);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchReviews();
  }, [depot.id]);

  const fetchReviews = async () => {
    setIsLoadingReviews(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          profiles:user_id (
            name,
            avatar
          )
        `)
        .eq('depot_id', depot.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedReviews: Review[] = data.map((r: any) => {
          const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
          return {
            id: r.id,
            userName: profile?.name || t('anonymous'),
            userAvatar: profile?.avatar || `https://i.pravatar.cc/150?u=${r.id}`,
            rating: r.rating,
            comment: r.comment,
            date: new Date(r.created_at).toLocaleDateString()
          };
        });
        setReviews(mappedReviews);
      }
    } catch (err) {
      console.error("Error fetching reviews:", err);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    
    // Load from SQLite cache first
    try {
      const cached = await sqliteService.getAllFromTable('products');
      const myCached = cached.filter(p => p.depot_id === depot.id);
      if (myCached.length > 0) {
        setAvailableProducts(myCached);
        if (myCached.length > 0) setSelectedProductId(myCached[0].id);
      }
    } catch (e) {
      console.warn("Erro ao ler produtos do SQLite:", e);
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('depot_id', depot.id)
      .eq('is_active', true);

    if (!error && data) {
      setAvailableProducts(data);
      if (data.length > 0) setSelectedProductId(data[0].id);
      
      // Save to SQLite
      try {
        for (const product of data) {
          await sqliteService.saveData('products', product.id, product);
        }
      } catch (e) {
        console.warn("Erro ao salvar produtos no SQLite:", e);
      }
    }
    setIsLoadingProducts(false);
  };

  const selectedProduct = useMemo(() => 
    availableProducts.find(p => p.id === selectedProductId), 
    [availableProducts, selectedProductId]
  );

  const unitPrice = selectedProduct ? selectedProduct.price : depot.price;
  const itemsSubtotal = unitPrice * quantity;

  const finalAppTotal = useMemo(() => calculateReservationFee(quantity), [quantity]);

  // Stock validado individualmente por produto
  const currentStock = selectedProduct ? selectedProduct.stock : 0;
  const isOutOfStock = currentStock < quantity;
  const isClosed = !depot.isOpen;

  const handleQuantity = (val: number) => {
    const next = quantity + val;
    if (next >= 1 && next <= currentStock) {
      setQuantity(next);
    }
  };

  const handleOrderClick = async () => {
    if (!selectedProduct) return;
    setIsPlacingOrder(true);
    await onPlaceOrder(orderType, selectedProduct.bottle_type, quantity, selectedProduct.id);
    setIsPlacingOrder(false);
  };

  const handleSubmitReview = async () => {
    if (newRating === 0 || !newComment.trim()) return;
    setIsSubmittingReview(true);
    try {
      const review: Review = {
        id: Math.random().toString(),
        userName: t('you'),
        userAvatar: 'https://i.pravatar.cc/150?u=me',
        rating: newRating,
        comment: newComment,
        date: t('now')
      };
      await onAddReview(review);
      fetchReviews();
      setNewRating(0);
      setNewComment('');
      setShowReviewForm(false);
    } catch (err) {
      console.error("Error submitting review:", err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const blockClass = areBlocksDark ? "bg-[#1E293B] border-slate-700 text-white" : "bg-white border-gray-100 text-[#1A3A5A]";
  const subTextClass = areBlocksDark ? "text-slate-400" : "text-gray-500";

  const getBottleLabel = (type: string) => {
    switch (type) {
      case '12kg': return t('bottle_12kg');
      case 'levita': return t('bottle_levita');
      case '5kg': return t('bottle_5kg');
      case '35kg': return t('bottle_35kg');
      default: return type;
    }
  };

  const translateCategory = (cat?: string) => {
    switch (cat) {
      case 'Premium': return t('cat_premium');
      case 'Express': return t('cat_express');
      case 'Económico': return t('cat_economic');
      default: return cat;
    }
  };

  return (
    <div className={`animate-in fade-in duration-500 pb-40 -mx-6 transition-colors ${isBgDark ? 'bg-[#0F172A]' : 'bg-[#F3F7FA]'}`}>
      {/* Floating Header Buttons */}
      <div className="fixed top-24 left-0 right-0 max-w-md mx-auto px-6 flex justify-between z-50 pointer-events-none">
        <button 
          onClick={onBack} 
          className="bg-white/90 dark:bg-slate-800/90 p-2.5 rounded-full text-gray-800 dark:text-white shadow-xl backdrop-blur-md border border-white/20 dark:border-slate-700/50 active:scale-90 transition-all pointer-events-auto"
        >
          <ArrowLeft size={20} />
        </button>
        <button 
          onClick={() => onToggleFavorite && onToggleFavorite(depot.id)} 
          className={`bg-white/90 dark:bg-slate-800/90 p-2.5 rounded-full shadow-xl backdrop-blur-md border border-white/20 dark:border-slate-700/50 active:scale-90 transition-all pointer-events-auto ${isFavorite ? 'text-[#ED1C24]' : 'text-gray-800 dark:text-white'}`}
        >
          <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Header */}
      <div className={`relative h-64 mb-6 border-b-4 ${ (depot.isVerified || (depot as any).is_verified || depot.category === 'Premium') ? 'border-green-500' : 'border-[#ED1C24]'}`}>
        <img src={depot.imageUrl} className="w-full h-full object-cover" alt={depot.name} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        
        <div className="absolute bottom-4 left-6 right-6 text-white z-10">
          <div className="flex items-center gap-2 mb-2">
               <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg tracking-widest ${
                 depot.category === 'Premium' ? 'bg-[#ED1C24] text-white' :
                 depot.category === 'Express' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
               }`}>
                 {translateCategory(depot.category)}
               </span>
          </div>
          <h2 className="text-3xl font-black leading-tight tracking-tight mb-1">{depot.name}</h2>
          <div className="flex items-center gap-4 text-white/80 text-[10px] font-bold uppercase tracking-wider">
             <span className="flex items-center gap-1"><MapPin size={12} className="text-[#ED1C24]" /> {depot.distance}</span>
             <span className="flex items-center gap-1 text-yellow-400"><Star size={12} fill="currentColor" /> {depot.rating}</span>
             <span className="text-white/60">{t('reviews_count', { count: depot.reviewCount || 0 })}</span>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* Alerta de Disponibilidade */}
        {(isClosed || isOutOfStock) && (
          <div className="bg-[#ED1C24]/10 border border-[#ED1C24]/20 p-5 rounded-3xl flex items-center gap-4 animate-in slide-in-from-top-2">
            <AlertCircle className="text-[#ED1C24] shrink-0" size={24} />
            <div className="flex-1">
              <p className="text-[10px] font-black text-[#ED1C24] uppercase tracking-widest leading-none mb-1">{t('stock_warning')}</p>
              <p className="text-[11px] font-bold text-red-800 dark:text-red-300">
                {isClosed ? t('partner_not_accepting') : t('stock_insufficient').replace('{type}', selectedProduct?.bottle_type || '')}
              </p>
            </div>
          </div>
        )}

        {/* Info do Pagamento Digital */}
        <div className="bg-blue-600 rounded-[32px] p-5 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group">
           <div className="absolute -right-4 -bottom-4 bg-white/10 p-6 rounded-full group-hover:scale-110 transition-transform">
              <Banknote size={48} />
           </div>
           <div className="relative z-10">
              <h3 className="text-sm font-black uppercase mb-1">{t('transparent_fees')}</h3>
              <p className="text-[11px] font-medium text-white/80 leading-snug">
                {t('fee_info')}
              </p>
           </div>
        </div>

        {/* SELEÇÃO DE BOTIJA DINÂMICA */}
        <div className="space-y-3">
          <p className={`text-[10px] font-black uppercase tracking-widest ml-1 ${subTextClass}`}>{t('bottle_type_label')}</p>
          {isLoadingProducts ? (
            <div className="flex justify-center py-6"><Loader2 size={24} className="animate-spin text-blue-500" /></div>
          ) : availableProducts.length === 0 ? (
            <div className={`${blockClass} p-8 rounded-3xl border-2 border-dashed border-gray-200 text-center`}>
              <p className="text-[10px] font-black uppercase opacity-40">{t('no_bottle_options')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {availableProducts.map(product => {
                const meta = BOTTLE_METADATA[product.bottle_type];
                return (
                  <button 
                    key={product.id}
                    onClick={() => { setSelectedProductId(product.id); setQuantity(1); }}
                    className={`p-4 rounded-[32px] border-2 transition-all flex flex-col items-center gap-3 ${
                      selectedProductId === product.id 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20' 
                      : `${blockClass} border-transparent`
                    }`}
                  >
                    <div className={`w-full h-24 rounded-2xl bg-white flex items-center justify-center p-2 shadow-inner overflow-hidden`}>
                      <img 
                        src={meta?.image || ''} 
                        className="w-full h-full object-contain" 
                        alt={getBottleLabel(product.bottle_type)} 
                        loading="lazy"
                      />
                    </div>
                    <span className="text-[10px] font-black uppercase text-center leading-tight">{getBottleLabel(product.bottle_type)}</span>
                    <div className={`mt-auto w-full px-2 py-1.5 rounded-xl flex flex-col items-center gap-0.5 ${selectedProductId === product.id ? 'bg-white/20' : 'bg-gray-50 dark:bg-slate-800'}`}>
                       <span className={`text-[9px] font-black uppercase ${selectedProductId === product.id ? 'text-white' : 'text-blue-600'}`}>
                        {product.price.toLocaleString()} Kz
                       </span>
                       <span className={`text-[7px] font-bold ${selectedProductId === product.id ? 'text-white/60' : 'text-gray-400'}`}>
                        {t('stock_units', { count: product.stock })}
                       </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* QUANTIDADE */}
        <div className={`${blockClass} rounded-[32px] p-6 border shadow-sm flex items-center justify-between`}>
          <div>
            <h3 className="text-sm font-black uppercase mb-1">{t('quantity_label')}</h3>
            <p className={`text-[10px] font-medium ${subTextClass}`}>{t('max_units').replace('{n}', currentStock.toString())}</p>
          </div>
          <div className="flex items-center gap-4 bg-gray-50 dark:bg-slate-900 p-2 rounded-2xl">
            <button 
              onClick={() => handleQuantity(-1)}
              className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-[#ED1C24] shadow-sm active:scale-90"
            >
              <Minus size={18} />
            </button>
            <span className="text-xl font-black w-8 text-center">{quantity}</span>
            <button 
              onClick={() => handleQuantity(1)}
              disabled={quantity >= currentStock}
              className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-blue-600 shadow-sm active:scale-90 disabled:opacity-30"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Resumo Financeiro Dinâmico */}
        <div className={`${blockClass} rounded-[40px] border shadow-2xl overflow-hidden divide-y divide-gray-100 dark:divide-slate-800`}>
           {/* Seção Digital (Gás Já Pay) */}
           <div className="p-6 bg-blue-50/30 dark:bg-blue-950/20">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                  <div className="p-1.5 bg-blue-600 text-white rounded-lg"><Wallet size={12} /></div>
                  {t('wallet_debit')}
                </h4>
                <div className="px-2 py-1 bg-blue-600/10 rounded-lg">
                  <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Gás Já Pay</span>
                </div>
              </div>
              
              <div className="space-y-3">
                 <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('reservation_fee')} ({quantity}x)</span>
                    <span className={`text-xs font-black ${quantity > 2 ? 'line-through opacity-30 text-[10px]' : areBlocksDark ? 'text-white' : 'text-[#1A3A5A]'}`}>
                      {(quantity * RESERVATION_FEE).toLocaleString('pt-AO')} Kz
                    </span>
                 </div>
                 
                 {quantity > 2 && (
                   <div className="flex justify-between items-center py-2 px-3 bg-green-500/10 rounded-xl border border-green-500/20 animate-in fade-in slide-in-from-right-2">
                     <div className="flex items-center gap-2">
                       <Ticket size={12} className="text-green-500" />
                       <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">Desconto (8%)</span>
                     </div>
                     <span className="text-xs font-black text-green-600">- {Math.round(quantity * RESERVATION_FEE * 0.08).toLocaleString('pt-AO')} Kz</span>
                   </div>
                 )}
                 
                 <div className="flex justify-between items-center pt-4 border-t border-dashed border-blue-200 dark:border-blue-800/50">
                    <span className="text-xs font-black uppercase tracking-widest text-blue-600">{t('total_fee')}</span>
                    <div className="text-right">
                      <p className="text-xl font-black text-blue-600 leading-none">{finalAppTotal.toLocaleString('pt-AO')} Kz</p>
                      <p className="text-[7px] font-bold text-blue-400 uppercase tracking-tighter mt-1">{t('charged_now_app')}</p>
                    </div>
                 </div>
              </div>
           </div>

           {/* Seção Manual (No Depósito) */}
           <div className="p-6 bg-orange-50/30 dark:bg-orange-950/10">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-600 flex items-center gap-2">
                  <div className="p-1.5 bg-orange-600 text-white rounded-lg"><Banknote size={12} /></div>
                  {t('manual_payment')}
                </h4>
                <div className="px-2 py-1 bg-orange-600/10 rounded-lg">
                  <span className="text-[8px] font-black text-orange-600 uppercase tracking-widest">No Depósito</span>
                </div>
              </div>

              <div className="space-y-4">
                 <div className="flex justify-between items-end p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-orange-100 dark:border-orange-900/20 shadow-sm">
                    <div className="flex-1 min-w-0 pr-4">
                       <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1 truncate">
                         {quantity}x {BOTTLE_METADATA[selectedProduct?.bottle_type || '']?.label || '...'}
                       </p>
                       <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tight">
                         {t('unit_price')}: {unitPrice.toLocaleString()} Kz
                       </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-orange-600 leading-none">{itemsSubtotal.toLocaleString('pt-AO')} Kz</p>
                      <p className="text-[7px] font-bold text-orange-400 uppercase tracking-tighter mt-1">{t('paid_on_pickup')}</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Detalhes Comerciais */}
        <div className="space-y-4">
           <div className="flex items-center gap-2 px-1">
             <Info size={14} className="text-gray-400" />
             <p className={`text-[10px] font-black uppercase tracking-widest ${subTextClass}`}>{t('partner_specs')}</p>
           </div>
           <div className={`${blockClass} rounded-[32px] p-6 border shadow-sm space-y-4`}>
              <div className="flex items-center gap-4">
                 <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-xl"><Clock size={16} className="text-blue-500" /></div>
                 <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">{t('opening_hours')}</p>
                    <p className="text-xs font-black">{depot.openingHours}</p>
                    {depot.workingDays && (
                      <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tighter mt-0.5">{depot.workingDays}</p>
                    )}
                 </div>
              </div>
              {depot.isOpen && (
                <div className="flex items-center gap-4">
                   <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-xl"><Phone size={16} className="text-green-500" /></div>
                   <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">{t('direct_contact')}</p>
                      <p className="text-xs font-black">{depot.phone}</p>
                   </div>
                </div>
              )}
           </div>
        </div>

        {/* Avaliações */}
        <div className="space-y-4 pb-12">
           <div className="flex justify-between items-center px-1">
             <div className="flex items-center gap-2">
               <MessageSquare size={14} className="text-gray-400" />
               <p className={`text-[10px] font-black uppercase tracking-widest ${subTextClass}`}>{t('community_feedback')} ({depot.reviewCount || 0})</p>
             </div>
             <button onClick={() => setShowReviewForm(!showReviewForm)} className="text-[10px] font-black text-[#ED1C24] uppercase tracking-widest">{t('rate_depot')}</button>
           </div>

           {showReviewForm && (
             <div className={`${blockClass} rounded-[32px] p-6 border border-[#ED1C24]/20 shadow-xl animate-in zoom-in-95`}>
                <h4 className="text-sm font-black mb-4">{t('your_experience')}</h4>
                <div className="flex gap-2 mb-6">
                   {[1,2,3,4,5].map(s => (
                     <button key={s} onClick={() => setNewRating(s)} className={`p-2 rounded-xl transition-all ${newRating >= s ? 'text-yellow-400' : 'text-gray-200'}`}>
                        <Star size={24} fill={newRating >= s ? 'currentColor' : 'none'} />
                     </button>
                   ))}
                </div>
                <textarea 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={t('write_briefly')}
                  className={`w-full h-24 p-4 rounded-2xl text-xs font-medium outline-none border mb-4 ${areBlocksDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-gray-50 border-gray-100'}`}
                />
                <button onClick={handleSubmitReview} disabled={isSubmittingReview || newRating === 0} className="w-full py-4 bg-[#ED1C24] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#ED1C24]/20 flex items-center justify-center gap-2">
                  {isSubmittingReview ? <Loader2 size={16} className="animate-spin" /> : t('publish_review')}
                </button>
             </div>
           )}

           <div className="space-y-3">
              {isLoadingReviews ? (
                <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-blue-500" /></div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-10 opacity-30">
                  <p className="text-[10px] font-black uppercase tracking-widest">{t('no_reviews_yet')}</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className={`${blockClass} p-5 rounded-3xl border shadow-sm`}>
                     <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                           <img src={review.userAvatar} className="w-8 h-8 rounded-full border border-gray-100 object-cover" alt="" />
                           <div>
                              <p className="text-xs font-black leading-none mb-1">{review.userName === t('you') ? t('you') : review.userName}</p>
                              <div className="flex gap-0.5 text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} size={8} fill={i < review.rating ? "currentColor" : "none"} />
                                ))}
                              </div>
                           </div>
                        </div>
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">{review.date === t('now') ? t('now') : review.date}</span>
                     </div>
                     <p className={`text-[11px] font-medium leading-relaxed ${subTextClass}`}>{review.comment}</p>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>

      {/* Checkout Fixo */}
      <div className={`fixed bottom-0 left-0 right-0 p-6 max-w-md mx-auto z-50 animate-in slide-in-from-bottom-8`}>
         <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white dark:from-slate-950 via-white/90 dark:via-slate-950/90 to-transparent pointer-events-none"></div>
         <div className={`relative z-10 p-2 rounded-[36px] ${areBlocksDark ? 'bg-slate-900/80' : 'bg-white/80'} backdrop-blur-xl border ${areBlocksDark ? 'border-white/10' : 'border-gray-200'} shadow-2xl`}>
           <button 
            onClick={handleOrderClick}
            disabled={isOutOfStock || isClosed || isPlacingOrder || !selectedProduct}
            className={`w-full py-5 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
              isOutOfStock || isClosed || !selectedProduct
              ? 'bg-gray-400 text-white cursor-not-allowed' 
              : 'bg-[#ED1C24] text-white shadow-[#ED1C24]/30'
            }`}
           >
             {isPlacingOrder ? <Loader2 size={18} className="animate-spin" /> : <ShoppingCart size={18} />}
             {isClosed ? t('shop_closed') : isOutOfStock ? t('no_stock_bottle') : !selectedProduct ? t('choose_bottle') : isPlacingOrder ? t('processing') : t('confirm_reservation')}
           </button>
         </div>
      </div>
    </div>
  );
};

export default DepotDetailsScreen;
