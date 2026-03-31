
import React from 'react';
import { Star, ShieldCheck, Clock, MapPin, Phone, Heart } from 'lucide-react';
import { Depot } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface SellerBlockProps {
  depot: Depot;
  onClick: (depot: Depot) => void;
  areBlocksDark?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (depotId: string) => void;
}

const SellerBlock: React.FC<SellerBlockProps> = ({ 
  depot, 
  onClick, 
  areBlocksDark,
  isFavorite,
  onToggleFavorite
}) => {
  const { t } = useLanguage();
  const isVerified = depot.isVerified || (depot as any).is_verified || depot.category === 'Premium';
  const blockClass = areBlocksDark 
    ? `bg-[#1E293B] ${isVerified ? 'border-green-500/50' : 'border-slate-800'}` 
    : `bg-white ${isVerified ? 'border-green-500/50' : 'border-gray-100'}`;
  const titleClass = areBlocksDark ? "text-white" : "text-gray-800";
  const subTextClass = areBlocksDark ? "text-slate-500" : "text-gray-400";

  const isAvailable = depot.isOpen && depot.stock > 0;
  const statusLabel = !depot.isOpen ? t('closed') : (depot.stock <= 0 ? t('out_of_stock') : t('open'));
  const statusColor = isAvailable ? "text-green-600" : "text-[#ED1C24]";

  const translateCategory = (cat?: string) => {
    switch (cat) {
      case 'Premium': return t('cat_premium');
      case 'Express': return t('cat_express');
      case 'Económico': return t('cat_economic');
      default: return cat;
    }
  };

  return (
    <div 
      onClick={() => onClick(depot)}
      className={`${blockClass} rounded-2xl p-3 border shadow-sm flex flex-col gap-3 cursor-pointer hover:border-[#ED1C24]/30 transition-all active:scale-[0.97]`}
    >
      <div className="relative h-28 w-full">
        <img 
          src={depot.imageUrl} 
          alt={depot.name} 
          className={`w-full h-full object-cover rounded-xl border-2 ${isVerified ? 'border-green-500' : 'border-gray-100'}`} 
        />
        {depot.isOpen && (
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-10">
            <div className="bg-blue-500 text-white p-1 rounded-full shadow-lg border border-white/20 animate-in zoom-in-50">
              <Phone size={10} fill="white" />
            </div>
          </div>
        )}
        {onToggleFavorite && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(depot.id);
            }}
            className={`absolute top-2 right-2 p-2 rounded-full shadow-lg backdrop-blur-md border transition-all active:scale-90 z-20 ${
              isFavorite 
                ? 'bg-white/95 border-[#ED1C24]/20 text-[#ED1C24]' 
                : 'bg-white/80 border-white/20 text-gray-400'
            }`}
          >
            <Heart size={14} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={isFavorite ? 2.5 : 2} />
          </button>
        )}
        {!depot.isOpen && (
          <div className="absolute inset-[2px] bg-black/40 backdrop-blur-[1px] rounded-[10px] flex items-center justify-center">
            <span className="text-white text-[10px] font-black uppercase tracking-widest bg-black/60 px-2 py-1 rounded">{t('closed')}</span>
          </div>
        )}
      </div>
      
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
            depot.category === 'Premium' ? 'bg-rose-100 text-[#ED1C24]' :
            depot.category === 'Express' ? 'bg-blue-100 text-blue-600' :
            'bg-green-100 text-green-600'
          }`}>
            {translateCategory(depot.category)}
          </span>
          <div className="flex items-center gap-0.5 text-yellow-400 text-[10px] font-bold">
            <Star size={10} fill="currentColor" /> {depot.rating}
          </div>
        </div>
        
        <h3 className={`font-bold ${titleClass} text-xs truncate`}>{depot.name}</h3>
        
        <div className={`flex items-center gap-1 text-[9px] ${subTextClass} font-medium`}>
          <MapPin size={10} /> {depot.distance}
        </div>

        <div className={`mt-2 pt-2 border-t ${areBlocksDark ? 'border-slate-800' : 'border-gray-50'} flex justify-between items-center`}>
          <span className={`${statusColor} font-black text-[10px] uppercase`}>{statusLabel}</span>
          <div className={`flex flex-col items-end gap-0.5 text-[8px] ${subTextClass} font-bold`}>
            <div className="flex items-center gap-1">
              <Clock size={9} /> {depot.openingHours.split(' ')[0]}
            </div>
            {depot.workingDays && (
              <span className="opacity-60 text-[7px] uppercase tracking-tighter">{depot.workingDays}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerBlock;
