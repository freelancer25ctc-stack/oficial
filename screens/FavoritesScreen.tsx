
import React from 'react';
import { Heart, Grid, Search, ArrowLeft } from 'lucide-react';
import { Depot } from '../types';
import DepotCard from '../components/DepotCard';
import { useLanguage } from '../context/LanguageContext';

interface FavoritesScreenProps {
  depots: Depot[];
  favorites: string[];
  onSelectDepot: (depot: Depot) => void;
  onToggleFavorite: (depotId: string) => void;
  areBlocksDark?: boolean;
  onBack?: () => void;
}

const FavoritesScreen: React.FC<FavoritesScreenProps> = ({ 
  depots, 
  favorites, 
  onSelectDepot, 
  onToggleFavorite,
  areBlocksDark,
  onBack
}) => {
  const { t } = useLanguage();
  const favoriteDepots = depots.filter(d => favorites.includes(d.id));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-6">
        {onBack && (
          <button 
            onClick={onBack}
            className={`p-2 rounded-xl border ${areBlocksDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-100 text-gray-600'}`}
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div>
          <h2 className={`text-2xl font-black leading-tight ${areBlocksDark ? 'text-white' : 'text-[#1A3A5A]'}`}>
            {t('favorites_title')}
          </h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('preferred_depots')}</p>
        </div>
      </div>

      {favoriteDepots.length > 0 ? (
        <div className="space-y-1 pb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#ED1C24] text-white rounded-lg shadow-sm">
                <Heart size={16} fill="white" />
              </div>
              <h2 className={`font-extrabold text-base tracking-tight ${areBlocksDark ? 'text-white' : 'text-gray-900'}`}>{t('saved')}</h2>
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('items_count', { count: favoriteDepots.length })}</span>
          </div>
          
          {favoriteDepots.map(depot => (
            <div key={depot.id} className="relative">
              <DepotCard 
                depot={depot} 
                onClick={onSelectDepot} 
                areBlocksDark={areBlocksDark} 
              />
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(depot.id);
                }}
                className="absolute top-4 right-4 p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full shadow-sm z-10 active:scale-90 transition-transform"
              >
                <Heart size={16} className="text-[#ED1C24]" fill="#ED1C24" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${areBlocksDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
            <Heart size={40} className="text-gray-300" />
          </div>
          <h3 className={`text-lg font-bold mb-2 ${areBlocksDark ? 'text-white' : 'text-gray-800'}`}>{t('no_favorites_yet')}</h3>
          <p className="text-sm text-gray-400 max-w-[200px]">{t('tap_heart_to_save')}</p>
        </div>
      )}
    </div>
  );
};

export default FavoritesScreen;
