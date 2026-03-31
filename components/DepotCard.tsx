
import React from 'react';
import { Star, MapPin, ChevronRight, MessageSquare, Clock, Phone, Heart, ShieldCheck } from 'lucide-react';
import { Depot } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface DepotCardProps {
  depot: Depot;
  onClick: (depot: Depot) => void;
  areBlocksDark?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (depotId: string) => void;
}

const DepotCard: React.FC<DepotCardProps> = ({ 
  depot, 
  onClick, 
  areBlocksDark,
  isFavorite,
  onToggleFavorite
}) => {
  const { t } = useLanguage();
  const isVerified = depot.isVerified || (depot as any).is_verified || depot.category === 'Premium';
  const blockClass = areBlocksDark 
    ? "bg-[#1E293B] border-slate-800" 
    : "bg-white border-gray-100";
  const titleClass = areBlocksDark ? "text-white" : "text-gray-800";
  const subTextClass = areBlocksDark ? "text-slate-400" : "text-gray-500";

  const statusLabel = !depot.isOpen ? t('closed') : t('open');
  const statusColor = depot.isOpen ? "text-green-600" : "text-[#ED1C24]";

  return (
    <div 
      onClick={() => onClick(depot)}
      className={`${blockClass} rounded-[24px] p-4 mb-4 border shadow-sm flex items-center gap-4 cursor-pointer hover:border-[#ED1C24]/30 transition-all active:scale-[0.98] group`}
    >
      <div className="relative">
        <img 
          src={depot.imageUrl} 
          alt={depot.name} 
          className="w-24 h-24 rounded-2xl object-cover shadow-sm" 
        />
        {onToggleFavorite && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(depot.id);
            }}
            className={`absolute top-2 right-2 p-2 rounded-full shadow-lg backdrop-blur-md border transition-all active:scale-90 z-10 ${
              isFavorite 
                ? 'bg-white/95 border-[#ED1C24]/20 text-[#ED1C24]' 
                : 'bg-white/80 border-white/20 text-gray-400'
            }`}
          >
            <Heart size={14} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={isFavorite ? 2.5 : 2} />
          </button>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <h3 className={`font-black ${titleClass} text-sm truncate`}>{depot.name}</h3>
          {depot.isOpen && (
            <div className="bg-blue-500/10 p-1 rounded-lg">
              <Phone size={10} className="text-blue-500" />
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex items-center gap-0.5 text-yellow-400 font-black text-[10px]">
            <Star size={10} fill="currentColor" />
            {depot.rating}
          </div>
          <span className="text-[10px] text-gray-300 font-bold">•</span>
          <div className={`flex items-center gap-1 ${subTextClass} font-bold text-[9px] uppercase tracking-tighter`}>
            <Clock size={10} />
            {depot.openingHours}
            {depot.workingDays && (
              <span className="ml-1 opacity-60">({depot.workingDays})</span>
            )}
          </div>
        </div>

        <p className={`text-[10px] ${subTextClass} font-medium mb-3 flex items-center gap-1`}>
          <MapPin size={10} className="text-[#ED1C24]" /> {depot.address}
        </p>
        
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className={`text-[9px] font-black ${subTextClass} uppercase tracking-widest leading-none mb-0.5`}>{t('status')}</span>
            <span className={`${statusColor} font-black text-sm leading-none`}>{statusLabel}</span>
          </div>
          <div className={`${areBlocksDark ? 'bg-white/5' : 'bg-[#ED1C24]/5'} px-3 py-1.5 rounded-xl group-hover:bg-[#ED1C24] group-hover:text-white transition-colors`}>
            <ChevronRight size={14} className="text-gray-400 group-hover:text-white transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepotCard;
