
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  MapPin, 
  Zap, 
  Layers, 
  Map as MapIcon,
  Radar,
  Timer,
  ShieldCheck,
  Info,
  Target,
  Sparkles,
  Wind,
  Droplets,
  Calendar,
  AlertCircle,
  ChevronRight,
  Filter,
  CheckCircle2,
  Package,
  TrendingUp,
  Store,
  // Add missing icons
  Globe,
  X,
  Heart,
  ArrowLeft
} from 'lucide-react';
import { Depot } from '../types';
import { useLanguage } from '../context/LanguageContext';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface GPSFastScreenProps {
  depots: Depot[];
  onSelectDepot: (depot: Depot) => void;
  areBlocksDark?: boolean;
  isBgDark?: boolean;
  userCoords: {lat: number, lng: number} | null;
  gpsEnabled: boolean;
  favorites?: string[];
  onToggleFavorite?: (depotId: string) => void;
  onBack?: () => void;
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

const GPSFastScreen: React.FC<GPSFastScreenProps> = ({ 
  depots, 
  onSelectDepot, 
  areBlocksDark, 
  isBgDark, 
  userCoords, 
  gpsEnabled,
  favorites = [],
  onToggleFavorite,
  onBack
}) => {
  const { t } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const depotMarkersRef = useRef<Record<string, any>>({});
  const layersRef = useRef<Record<string, any>>({});
  
  const [mapMode, setMapMode] = useState<'street' | 'satellite' | 'terrain' | 'dark'>('street');
  const [filter, setFilter] = useState<'all' | 'open' | 'price'>('all');
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Filtragem e Ordenação Real Time
  const processedDepots = useMemo(() => {
    let list = [...depots];
    
    if (filter === 'open') list = list.filter(d => d.isOpen && d.stock > 0);
    if (filter === 'price') list = list.sort((a, b) => a.price - b.price);
    
    // Se tiver GPS, ordena pela distância real
    if (userCoords) {
      list = list.sort((a, b) => {
        const distA = calculateDistance(userCoords.lat, userCoords.lng, a.latitude, a.longitude);
        const distB = calculateDistance(userCoords.lat, userCoords.lng, b.latitude, b.longitude);
        return distA - distB;
      });
    }
    
    return list;
  }, [depots, filter, userCoords]);

  const nearestDepot = useMemo(() => {
    const viable = depots.filter(d => d.isOpen && d.stock > 0);
    if (!userCoords || viable.length === 0) return null;
    
    return viable.sort((a, b) => {
      const distA = calculateDistance(userCoords.lat, userCoords.lng, a.latitude, a.longitude);
      const distB = calculateDistance(userCoords.lat, userCoords.lng, b.latitude, b.longitude);
      return distA - distB;
    })[0];
  }, [depots, userCoords]);

  const distanceToNearest = useMemo(() => {
    if (!userCoords || !nearestDepot) return 0;
    return calculateDistance(userCoords.lat, userCoords.lng, nearestDepot.latitude, nearestDepot.longitude);
  }, [userCoords, nearestDepot]);

  const changeMapMode = (newMode: 'street' | 'satellite' | 'terrain' | 'dark') => {
    if (!mapInstanceRef.current) return;
    
    // Remover todas as camadas base
    Object.values(layersRef.current).forEach(layer => {
      if (mapInstanceRef.current.hasLayer(layer)) {
        mapInstanceRef.current.removeLayer(layer);
      }
    });

    // Adicionar a nova camada
    layersRef.current[newMode].addTo(mapInstanceRef.current);
    setMapMode(newMode);
    setShowLayerMenu(false);
  };

  useEffect(() => {
    if (!mapInstanceRef.current && mapContainerRef.current) {
      const initialCoords: [number, number] = [-15.1915, 12.1485];
      const map = L.map(mapContainerRef.current, { 
        zoomControl: false, 
        attributionControl: false,
        dragging: true,
        touchZoom: true
      }).setView(initialCoords, 14);
      
      const lightTiles = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      const darkTiles = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      const terrainTiles = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      const satelliteTiles = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      
      layersRef.current.street = L.tileLayer(lightTiles, { maxZoom: 20 });
      layersRef.current.dark = L.tileLayer(darkTiles, { maxZoom: 20 });
      layersRef.current.terrain = L.tileLayer(terrainTiles, { maxZoom: 17 });
      layersRef.current.satellite = L.tileLayer(satelliteTiles, { maxZoom: 19 });
      
      // Escolher camada inicial baseada no tema
      const initialLayer = isBgDark ? 'dark' : 'street';
      layersRef.current[initialLayer].addTo(map);
      setMapMode(initialLayer as any);
      
      mapInstanceRef.current = map;
    }
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        depotMarkersRef.current = {};
        userMarkerRef.current = null;
        routeLineRef.current = null;
      }
    };
  }, [isBgDark]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      if (gpsEnabled && userCoords) {
        const currentPos: [number, number] = [userCoords.lat, userCoords.lng];
        if (!userMarkerRef.current) {
          const userIcon = L.divIcon({ className: 'custom-marker-user', iconSize: [18, 18], iconAnchor: [9, 9] });
          userMarkerRef.current = L.marker(currentPos, { icon: userIcon, zIndexOffset: 2000 }).addTo(mapInstanceRef.current);
        } else {
          userMarkerRef.current.setLatLng(currentPos);
        }
      }

      // Sincronizar Marcadores de Depósitos do Banco de Dados
      const currentDepotIds = new Set(depots.map(d => d.id));
      
      // Remover marcadores que não existem mais
      Object.keys(depotMarkersRef.current).forEach(id => {
        if (!currentDepotIds.has(id)) {
          depotMarkersRef.current[id].remove();
          delete depotMarkersRef.current[id];
        }
      });

      depots.forEach(depot => {
        const lat = Number(depot.latitude);
        const lng = Number(depot.longitude);
        
        if (isNaN(lat) || isNaN(lng)) return;

        const isNearest = nearestDepot && depot.id === nearestDepot.id;
        const iconClass = `custom-marker-depot ${isNearest ? 'custom-marker-nearest' : ''} ${!depot.isOpen || depot.stock <= 0 ? 'grayscale' : ''}`;
        
        const html = `
          <div class="relative flex items-center justify-center w-full h-full">
            <span class="text-[10px] font-black">G</span>
            ${depot.stock < 10 && depot.isOpen ? '<div class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 border border-white rounded-full"></div>' : ''}
          </div>
        `;

        if (!depotMarkersRef.current[depot.id]) {
          const depotIcon = L.divIcon({ 
            className: iconClass, 
            html: html, 
            iconSize: isNearest ? [36, 36] : [30, 30], 
            iconAnchor: isNearest ? [18, 18] : [15, 15] 
          });
          const marker = L.marker([lat, lng], { icon: depotIcon })
            .addTo(mapInstanceRef.current)
            .on('click', () => onSelectDepot(depot));
          depotMarkersRef.current[depot.id] = marker;
        } else {
          const marker = depotMarkersRef.current[depot.id];
          const depotIcon = L.divIcon({ 
            className: iconClass, 
            html: html, 
            iconSize: isNearest ? [36, 36] : [30, 30], 
            iconAnchor: isNearest ? [18, 18] : [15, 15] 
          });
          marker.setLatLng([lat, lng]);
          marker.setIcon(depotIcon);
          marker.setZIndexOffset(isNearest ? 1500 : 0);
        }
      });

      // Rota Visual para o mais próximo
      if (gpsEnabled && userCoords && nearestDepot) {
        const routePoints = [[userCoords.lat, userCoords.lng], [nearestDepot.latitude, nearestDepot.longitude]];
        if (!routeLineRef.current) {
          routeLineRef.current = L.polyline(routePoints, { color: '#22c55e', weight: 3, opacity: 0.5, dashArray: '10, 10' }).addTo(mapInstanceRef.current);
        } else {
          routeLineRef.current.setLatLngs(routePoints);
        }
      }
    }
  }, [depots, userCoords, gpsEnabled, nearestDepot]);

  useEffect(() => {
    if (mapInstanceRef.current && depots.length > 0 && !userCoords) {
      try {
        const bounds = L.latLngBounds(depots.map(d => [Number(d.latitude), Number(d.longitude)]));
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } catch (e) {
        console.error("Erro ao ajustar limites do mapa:", e);
      }
    }
  }, [depots, userCoords]);

  const centerOnUser = () => { if (userCoords && mapInstanceRef.current) mapInstanceRef.current.flyTo([userCoords.lat, userCoords.lng], 16); };
  
  const blockClass = areBlocksDark ? "bg-[#1E293B] text-white border-slate-700 shadow-xl" : "bg-white text-[#1A3A5A] border-gray-100 shadow-md";
  const subTextClass = areBlocksDark ? "text-slate-400" : "text-gray-500";

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500 pb-24 overflow-y-auto">
      
      {/* Header com Chips de Filtro */}
      <div className="px-6 mt-4 mb-4 shrink-0">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <button 
                onClick={onBack}
                className={`p-2 rounded-xl border ${areBlocksDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-100 text-gray-600'}`}
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h2 className={`text-xl font-extrabold ${areBlocksDark ? 'text-white' : 'text-[#1A3A5A]'}`}>GPS Fast</h2>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 ${gpsEnabled ? 'bg-green-500 animate-pulse' : 'bg-[#ED1C24]'} rounded-full`}></div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('real_time')}</p>
              </div>
            </div>
          </div>
          <div className={`p-2 bg-[#ED1C24]/10 text-[#ED1C24] rounded-xl`}><Radar size={18} /></div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'all', label: t('all'), icon: <Globe size={12} /> },
            { id: 'open', label: t('available'), icon: <CheckCircle2 size={12} /> },
            { id: 'price', label: t('best_price'), icon: <TrendingUp size={12} /> }
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setFilter(item.id as any)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap border ${
                filter === item.id 
                ? 'bg-[#ED1C24] border-[#ED1C24] text-white shadow-lg shadow-[#ED1C24]/20' 
                : `${blockClass} border-transparent`
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mapa */}
      <div className="h-[380px] relative mb-6 shrink-0 group">
        <div ref={mapContainerRef} className={`absolute inset-0 transition-opacity duration-1000 ${isBgDark ? 'bg-[#1e1e1e]' : 'bg-[#f0f2f5]'}`}></div>
        
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
          <div className="relative">
            <button 
              onClick={() => setShowLayerMenu(!showLayerMenu)} 
              className={`${blockClass} w-10 h-10 rounded-xl flex items-center justify-center border active:scale-90 transition-all shadow-lg`}
            >
              <Layers size={18} />
            </button>
            
            {showLayerMenu && (
              <div className={`${blockClass} absolute right-12 top-0 w-40 rounded-2xl border p-2 shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300`}>
                {[
                  { id: 'street', label: t('map_street'), icon: <MapIcon size={14} /> },
                  { id: 'satellite', label: t('map_satellite'), icon: <Globe size={14} /> },
                  { id: 'terrain', label: t('map_terrain'), icon: <TrendingUp size={14} /> },
                  { id: 'dark', label: t('map_dark'), icon: <Layers size={14} /> }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => changeMapMode(mode.id as any)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      mapMode === mode.id ? 'bg-[#ED1C24] text-white' : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {mode.icon} {mode.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <button onClick={centerOnUser} className={`${blockClass} w-10 h-10 rounded-xl flex items-center justify-center border active:scale-90 transition-all text-[#ED1C24] shadow-lg`}>
            <Target size={18} />
          </button>
        </div>

        {!nearestDepot && gpsEnabled && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-[1000] flex flex-col items-center justify-center p-8 text-center">
             <AlertCircle size={48} className="text-white mb-4 opacity-50" />
             <h4 className="text-white font-black uppercase text-xs tracking-widest">{t('no_nearby_depots')}</h4>
             <p className="text-white/60 text-[10px] font-medium mt-2">{t('try_changing_filter')}</p>
          </div>
        )}
      </div>

      {/* Lista de Depósitos Próximos (Do Banco de Dados) */}
      <div className="px-6 space-y-6">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
             <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${areBlocksDark ? 'text-white' : 'text-[#1A3A5A]'}`}>{t('near_you')}</h3>
           </div>
           {gpsEnabled && <span className="text-[10px] font-bold text-blue-500 uppercase">{t('sorted_by_gps')}</span>}
        </div>

        <div className="space-y-4">
          {processedDepots.length > 0 && processedDepots.slice(0, 5).map((depot) => {
            const distance = userCoords ? calculateDistance(userCoords.lat, userCoords.lng, depot.latitude, depot.longitude) : null;
            const isNearest = nearestDepot?.id === depot.id;
            
            return (
              <div 
                key={depot.id}
                onClick={() => onSelectDepot(depot)}
                className={`${blockClass} rounded-[32px] p-5 border shadow-sm flex items-center gap-5 cursor-pointer active:scale-[0.98] transition-all hover:border-[#ED1C24]/30 relative overflow-hidden`}
              >
                {isNearest && <div className="absolute top-0 right-0 px-3 py-1 bg-green-500 text-white text-[8px] font-black uppercase tracking-widest rounded-bl-2xl">{t('fastest')}</div>}
                
                <div className="relative shrink-0">
                  <img src={depot.imageUrl} className={`w-16 h-16 rounded-2xl object-cover shadow-md ${!depot.isOpen ? 'grayscale' : ''}`} alt="" />
                  {!depot.isOpen && <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center"><X className="text-white" size={14} /></div>}
                  {onToggleFavorite && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(depot.id);
                      }}
                      className={`absolute -top-1 -left-1 p-1 rounded-full shadow-md border transition-all active:scale-90 ${
                        favorites.includes(depot.id) 
                          ? 'bg-white border-[#ED1C24] text-[#ED1C24]' 
                          : 'bg-white border-gray-100 text-gray-300'
                      }`}
                    >
                      <Heart size={10} fill={favorites.includes(depot.id) ? 'currentColor' : 'none'} />
                    </button>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h4 className="font-black text-sm truncate">{depot.name}</h4>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-2">
                     <p className={`text-[10px] ${subTextClass} font-medium truncate flex items-center gap-1`}>
                       <MapPin size={10} className="text-[#ED1C24]" /> {depot.address.split(',')[0]}
                     </p>
                     {distance && <span className="text-[9px] font-black text-blue-500 uppercase">{distance.toFixed(1)} km</span>}
                  </div>

                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-1.5">
                        <Package size={10} className={depot.stock < 10 ? 'text-orange-500' : 'text-green-500'} />
                        <span className={`text-[9px] font-black uppercase ${depot.stock < 10 ? 'text-orange-500' : 'text-green-500'}`}>
                          {depot.stock < 10 ? t('low_stock') : t('stock_ok')}
                        </span>
                     </div>
                     <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Informação do Sistema */}
        <div className={`p-6 rounded-[32px] ${areBlocksDark ? 'bg-blue-500/5 border-blue-500/10' : 'bg-blue-50 border-blue-100'} border flex items-start gap-4`}>
           <div className="p-2 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20"><Timer size={20} /></div>
           <div className="flex-1">
              <h4 className={`text-xs font-black uppercase mb-1 ${areBlocksDark ? 'text-white' : 'text-blue-900'}`}>{t('price_update')}</h4>
              <p className={`text-[11px] leading-relaxed font-medium ${areBlocksDark ? 'text-blue-200/60' : 'text-blue-800/60'}`}>
                {t('price_sync_info')}
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default GPSFastScreen;
