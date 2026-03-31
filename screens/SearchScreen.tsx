import React, { useState, useEffect, useRef } from 'react';
import { Search, ArrowLeft, X, History, MapPin, Star, Flame, ShieldCheck } from 'lucide-react';
import { Depot } from '../types';
import DepotCard from '../components/DepotCard';
import { useLanguage } from '../context/LanguageContext';

interface SearchScreenProps {
  depots: Depot[];
  onSelectDepot: (depot: Depot) => void;
  onBack: () => void;
  areBlocksDark?: boolean;
  favorites?: string[];
  onToggleFavorite?: (depotId: string) => void;
}

const SearchScreen: React.FC<SearchScreenProps> = ({ 
  depots, 
  onSelectDepot, 
  onBack, 
  areBlocksDark,
  favorites = [],
  onToggleFavorite
}) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Depot[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>(['Sonangol', 'Bairro 5 de Abril', 'Moçâmedes']);
  const inputRef = useRef<HTMLInputElement>(null);

  const blockClass = areBlocksDark ? "bg-[#1E293B] border-slate-700 text-white" : "bg-white border-gray-100 text-[#1A3A5A]";
  const subTextClass = areBlocksDark ? "text-slate-400" : "text-gray-400";

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setResults([]);
      return;
    }

    const filtered = depots.filter(depot => 
      depot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      depot.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      depot.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setResults(filtered);
  }, [searchTerm, depots]);

  return (
    <div className={`flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300 ${areBlocksDark ? 'bg-[#0F172A]' : 'bg-[#F3F7FA]'} -mx-6 px-6`}>
      {/* Search Header */}
      <div className="flex items-center gap-3 mb-6 mt-6">
        <button 
          onClick={onBack}
          className={`p-2 rounded-full shadow-sm active:scale-90 transition-transform ${blockClass}`}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            ref={inputRef}
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('search_namibe')}
            className={`w-full border rounded-2xl pl-12 pr-12 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/10 shadow-sm transition-all ${areBlocksDark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-gray-100 text-gray-700 placeholder:text-gray-400'}`}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {searchTerm === '' ? (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4 px-1">
                <History size={14} className="text-gray-400" />
                <h3 className={`text-[10px] font-black uppercase tracking-widest ${subTextClass}`}>{t('history_namibe')}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((s, i) => (
                  <button 
                    key={i}
                    onClick={() => setSearchTerm(s)}
                    className={`px-4 py-2 border rounded-full text-xs font-bold hover:border-[#ED1C24]/30 active:scale-95 transition-all shadow-sm ${blockClass}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className={`rounded-[32px] p-6 border shadow-sm ${blockClass}`}>
              <div className="flex items-center gap-2 mb-4">
                <Flame size={16} className="text-orange-500" />
                <h3 className="text-xs font-black uppercase tracking-tighter">{t('local_suggestions')}</h3>
              </div>
              <div className="space-y-4">
                {depots.slice(0, 3).map(depot => (
                  <div 
                    key={depot.id}
                    onClick={() => onSelectDepot(depot)}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 overflow-hidden shrink-0 border-2 ${depot.isVerified || (depot as any).is_verified || depot.category === 'Premium' ? 'border-green-500' : 'border-gray-200'}`}>
                      <img src={depot.imageUrl} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-xs font-bold group-hover:text-[#ED1C24] transition-colors ${areBlocksDark ? 'text-white' : 'text-gray-800'}`}>{depot.name}</p>
                      </div>
                      <p className={`text-[9px] font-medium truncate ${subTextClass}`}>{depot.address}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-yellow-400">
                      <Star size={10} fill="currentColor" /> {depot.rating}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className={`text-[10px] font-black uppercase tracking-widest ${subTextClass}`}>{t('results_mocamedes', { count: results.length })}</h3>
            </div>
            {results.map(depot => (
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
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${areBlocksDark ? 'bg-slate-800 text-slate-700' : 'bg-gray-100 text-gray-300'}`}>
              <Search size={40} />
            </div>
            <h3 className={`text-lg font-black mb-2 ${areBlocksDark ? 'text-white' : 'text-[#1A3A5A]'}`}>{t('no_results')}</h3>
            <p className={`text-xs font-medium max-w-[200px] leading-relaxed ${subTextClass}`}>
              {t('no_results_desc', { term: searchTerm })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchScreen;