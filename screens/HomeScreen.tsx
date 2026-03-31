
import React from 'react';
import FeaturedCard from '../components/FeaturedCard';
import DepotCard from '../components/DepotCard';
import SellerBlock from '../components/SellerBlock';
import { Depot, Banner, UserType } from '../types';
import { supabase } from '../services/supabaseClient';
import { useLanguage } from '../context/LanguageContext';
import { 
  Flame, 
  ShieldCheck, 
  Grid, 
  Search, 
  Zap, 
  MapPin, 
  Navigation, 
  Ticket, 
  Copy, 
  Check, 
  Store, 
  ArrowRight, 
  LogIn, 
  UserPlus,
  ChevronRight,
  Truck,
  Wallet,
  Users,
  Heart,
  Globe
} from 'lucide-react';

interface HomeScreenProps {
  depots: Depot[];
  onSelectDepot: (depot: Depot) => void;
  onNavigateToMap: () => void;
  onNavigateToSignup: (type?: UserType) => void;
  onNavigateToLogin: () => void;
  onNavigateToSearch?: () => void;
  isAuthenticated?: boolean;
  areBlocksDark?: boolean;
  isBgDark?: boolean;
  userCoords: {lat: number, lng: number} | null;
  gpsEnabled: boolean;
  profileName?: string;
  isVerified?: boolean;
  favorites?: string[];
  onToggleFavorite?: (depotId: string) => void;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const ICON_MAP: Record<string, React.ReactNode> = {
  'Flame': <Flame size={24} />,
  'Ticket': <Ticket size={24} />,
  'Truck': <Truck size={24} />,
  'ShieldCheck': <ShieldCheck size={24} />,
  'Wallet': <Wallet size={24} />,
  'Users': <Users size={24} />,
  'Zap': <Zap size={24} />
};

const HomeScreen: React.FC<HomeScreenProps> = ({ 
  depots, 
  onSelectDepot, 
  onNavigateToMap, 
  onNavigateToSignup,
  onNavigateToLogin,
  onNavigateToSearch,
  isAuthenticated,
  areBlocksDark,
  userCoords,
  gpsEnabled,
  profileName,
  isVerified,
  favorites = [],
  onToggleFavorite
}) => {
  const { t, language, setLanguage } = useLanguage();
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);
  
  const premiumSellers = React.useMemo(() => {
    return depots.filter(d => d.isVerified === true || (d as any).is_verified === true || d.category === 'Premium');
  }, [depots]);

  const otherDepots = React.useMemo(() => {
    return depots.filter(d => d.isVerified !== true && (d as any).is_verified !== true && d.category !== 'Premium');
  }, [depots]);

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getSuggestedDepot = () => {
    if (!userCoords || !gpsEnabled) return null;

    const viableDepots = depots.filter(d => d.isOpen && d.stock > 0);
    if (viableDepots.length === 0) return null;

    return [...viableDepots].sort((a, b) => {
      const distA = calculateDistance(userCoords.lat, userCoords.lng, a.latitude, a.longitude);
      const distB = calculateDistance(userCoords.lat, userCoords.lng, b.latitude, b.longitude);
      return distA - distB;
    })[0];
  };

  const suggestedDepot = getSuggestedDepot();
  const isSuggestedVerified = suggestedDepot ? (suggestedDepot.isVerified || (suggestedDepot as any).is_verified || suggestedDepot.category === 'Premium') : false;

  const blockClass = areBlocksDark ? "bg-[#1E293B] border-slate-800" : "bg-white border-gray-100";

  return (
    <div className={`animate-in fade-in slide-in-from-bottom-4 duration-500`}>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h2 className={`text-2xl font-black leading-tight ${areBlocksDark ? 'text-white' : 'text-[#1A3A5A]'}`}>
            {isAuthenticated && profileName 
              ? t('welcome_user', { name: profileName.split(' ')[0] }) 
              : t('welcome')}
          </h2>
        </div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('find_offers')}</p>
      </div>

      <div className="flex flex-col gap-5 mb-8">
        {/* Barra de pesquisa só aparece se estiver logado */}
        {isAuthenticated && (
          <div 
            onClick={onNavigateToSearch}
            className={`flex items-center gap-3 px-5 py-4 rounded-[20px] border cursor-pointer active:scale-[0.98] transition-all shadow-sm animate-in zoom-in-95 duration-300 ${
              areBlocksDark ? 'bg-[#1e293b]/60 border-slate-700/50' : 'bg-white border-gray-100'
            }`}
          >
            <Search size={20} className="text-[#ED1C24]" strokeWidth={2.5} />
            <span className={`text-[13px] font-semibold ${areBlocksDark ? 'text-slate-400' : 'text-gray-400'}`}>
              {t('search_placeholder')}
            </span>
          </div>
        )}
        
        <div className="relative">
          <FeaturedCard onOrderNow={onNavigateToMap} />
        </div>
      </div>

      {/* Banner de Parceiro */}
      {!isAuthenticated && (
        <div className="mb-10 px-1">
          <div className="bg-gradient-to-r from-[#1A3A5A] to-[#2C527A] rounded-[32px] p-6 text-white relative overflow-hidden shadow-xl shadow-[#1A3A5A]/20 group">
             <div className="absolute -right-4 -bottom-4 bg-white/5 p-8 rounded-full group-hover:scale-110 transition-transform">
                <Store size={80} />
             </div>
             <div className="relative z-10">
                <h3 className="text-lg font-black leading-tight mb-2">{t('have_depot')}</h3>
                <p className="text-[11px] font-bold text-white/70 max-w-[200px] mb-4">{t('increase_sales')}</p>
                <button onClick={() => onNavigateToSignup(UserType.DEPOSITO)} className="flex items-center gap-2 bg-[#ED1C24] text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
                   {t('start_selling')} <ArrowRight size={14} />
                </button>
             </div>
          </div>
        </div>
      )}

      {isAuthenticated && suggestedDepot && (
        <div className="mb-8 animate-in zoom-in-95 duration-500">
          <div className="flex items-center gap-2 mb-4 px-1">
            <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-sm">
              <Zap size={16} fill="white" />
            </div>
            <h2 className={`font-extrabold text-base tracking-tight ${areBlocksDark ? 'text-white' : 'text-gray-900'}`}>{t('suggested_for_you')}</h2>
            <div className="flex items-center gap-1.5 ml-auto bg-green-100 dark:bg-green-500/20 px-2 py-1 rounded-full">
               <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
               <span className="text-[8px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest">{t('gps_active')}</span>
            </div>
          </div>

          <div 
            onClick={() => onSelectDepot(suggestedDepot)}
            className={`rounded-[32px] p-5 border shadow-xl flex items-center gap-5 cursor-pointer hover:border-blue-500/30 transition-all active:scale-[0.98] relative overflow-hidden ${
              areBlocksDark 
                ? `bg-slate-800/40 ${isSuggestedVerified ? 'border-green-500/50' : 'border-slate-700'}` 
                : `bg-white ${isSuggestedVerified ? 'border-green-500/50' : 'border-blue-50'}`
            }`}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8"></div>
            <div className="relative shrink-0">
              <img 
                src={suggestedDepot.imageUrl} 
                className={`w-20 h-20 rounded-2xl object-cover shadow-md border ${areBlocksDark ? 'border-slate-700' : 'border-gray-200'}`} 
                alt="" 
              />
              {onToggleFavorite && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(suggestedDepot.id);
                  }}
                  className={`absolute top-2 right-2 p-2 rounded-full shadow-lg backdrop-blur-md border transition-all active:scale-90 z-20 ${
                    favorites.includes(suggestedDepot.id) 
                      ? 'bg-white/95 border-[#ED1C24]/20 text-[#ED1C24]' 
                      : 'bg-white/80 border-white/20 text-gray-400'
                  }`}
                >
                  <Heart size={14} fill={favorites.includes(suggestedDepot.id) ? 'currentColor' : 'none'} strokeWidth={favorites.includes(suggestedDepot.id) ? 2.5 : 2} />
                </button>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h4 className={`font-black text-sm truncate ${areBlocksDark ? 'text-white' : 'text-[#1A3A5A]'}`}>{suggestedDepot.name}</h4>
                </div>
                <span className="text-[9px] font-black text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-md">{t('closer')}</span>
              </div>
              <p className={`text-[10px] font-bold ${areBlocksDark ? 'text-slate-400' : 'text-gray-500'} mb-2 flex items-center gap-1 mt-1`}>
                <MapPin size={10} className="text-blue-500" /> {suggestedDepot.address}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-green-600 uppercase">{t('reserve')}</span>
                <div className="flex items-center gap-1.5">
                   <Navigation size={10} className="text-gray-400" />
                   <span className={`text-[9px] font-black uppercase ${areBlocksDark ? 'text-slate-500' : 'text-gray-400'}`}>{suggestedDepot.pickupTime}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {depots.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200 mt-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className={`text-base font-semibold mb-1 ${areBlocksDark ? 'text-white' : 'text-gray-900'}`}>{t('no_depots_found')}</h3>
          <p className={`text-sm text-center max-w-[240px] ${areBlocksDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {t('no_depots_found_desc')}
          </p>
        </div>
      )}

      {premiumSellers.length > 0 && (
        <div className="mt-4 mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-600 text-white rounded-lg shadow-sm">
                <ShieldCheck size={16} />
              </div>
              <h2 className={`font-extrabold text-base tracking-tight ${areBlocksDark ? 'text-white' : 'text-gray-900'}`}>{t('verified_accounts')}</h2>
            </div>
            <button onClick={onNavigateToMap} className={`text-[10px] font-bold uppercase tracking-wider hover:opacity-70 transition-opacity ${areBlocksDark ? 'text-white/70' : 'text-[#1A3A5A]'}`}>
              {t('full_grid')}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {premiumSellers.map(seller => (
              <SellerBlock 
                key={seller.id} 
                depot={seller} 
                onClick={onSelectDepot} 
                areBlocksDark={areBlocksDark} 
                isFavorite={favorites.includes(seller.id)}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </div>
      )}

      {otherDepots.length > 0 && (
        <>
          <div className="flex justify-between items-center mb-4 mt-8">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${areBlocksDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-200 text-gray-600'}`}>
                <Grid size={16} />
              </div>
              <h2 className={`font-extrabold text-base tracking-tight ${areBlocksDark ? 'text-white' : 'text-gray-900'}`}>{t('other_depots')}</h2>
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{otherDepots.length} {t('available')}</span>
          </div>

          <div className="space-y-1 pb-6 px-0">
            {otherDepots.map(depot => (
              <DepotCard 
                key={depot.id} 
                depot={depot} 
                onClick={onSelectDepot} 
                areBlocksDark={areBlocksDark} 
                isFavorite={favorites.includes(depot.id)}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </>
      )}

      {/* Seção de Idioma - Versão Discreta */}
      {!isAuthenticated && (
        <div className="mt-12 mb-8 flex flex-col items-center gap-3">
          <div className="flex items-center gap-1.5 opacity-40">
            <Globe size={12} className={areBlocksDark ? 'text-slate-400' : 'text-gray-400'} />
            <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${areBlocksDark ? 'text-slate-400' : 'text-gray-400'}`}>
              {t('language')}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {[
              { id: 'pt', label: 'PT', flag: '🇦🇴' },
              { id: 'en', label: 'EN', flag: '🇺🇸' },
              { id: 'fr', label: 'FR', flag: '🇫🇷' }
            ].map((lang) => (
              <button
                key={lang.id}
                onClick={() => setLanguage(lang.id as any)}
                className={`flex items-center gap-1.5 transition-all active:scale-90 ${
                  language === lang.id 
                    ? 'opacity-100 scale-110' 
                    : 'opacity-30 grayscale hover:opacity-60'
                }`}
              >
                <span className="text-sm">{lang.flag}</span>
                <span className={`text-[10px] font-black ${language === lang.id ? (areBlocksDark ? 'text-white' : 'text-[#1A3A5A]') : 'text-gray-400'}`}>
                  {lang.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;
