
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface TrackingMapProps {
  progress: number;
  depotCoords: { lat: number, lng: number };
  userCoords: { lat: number, lng: number };
}

const TrackingMap: React.FC<TrackingMapProps> = ({ progress, depotCoords, userCoords }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const deliveryMarkerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current && mapContainerRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        touchZoom: false
      }).setView([depotCoords.lat, depotCoords.lng], 14);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20
      }).addTo(map);

      // Ícones customizados
      const depotIcon = L.divIcon({
        className: 'custom-marker-depot',
        html: `<span>D</span>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const userIcon = L.divIcon({
        className: 'custom-marker-user',
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const deliveryIcon = L.divIcon({
        className: 'custom-delivery-icon',
        html: `<div class="bg-blue-600 p-1.5 rounded-lg border-2 border-white shadow-lg"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      L.marker([depotCoords.lat, depotCoords.lng], { icon: depotIcon }).addTo(map);
      L.marker([userCoords.lat, userCoords.lng], { icon: userIcon }).addTo(map);

      // Traçado do caminho
      const pathPoints = [
        [depotCoords.lat, depotCoords.lng],
        [userCoords.lat, userCoords.lng]
      ];
      L.polyline(pathPoints, { color: '#cbd5e1', weight: 4, dashArray: '8, 8' }).addTo(map);

      // Marcador de entrega (estafeta)
      deliveryMarkerRef.current = L.marker([depotCoords.lat, depotCoords.lng], { 
        icon: deliveryIcon,
        zIndexOffset: 1000
      }).addTo(map);

      mapRef.current = map;
      
      // Ajusta o zoom para mostrar ambos os pontos
      const bounds = L.latLngBounds([depotCoords.lat, depotCoords.lng], [userCoords.lat, userCoords.lng]);
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    // Atualiza posição do marcador baseado no progresso (interpolação simples)
    if (deliveryMarkerRef.current && mapRef.current) {
      const lat = depotCoords.lat + (userCoords.lat - depotCoords.lat) * (progress / 100);
      const lng = depotCoords.lng + (userCoords.lng - depotCoords.lng) * (progress / 100);
      deliveryMarkerRef.current.setLatLng([lat, lng]);
      
      // Mantém o estafeta no centro se o progresso estiver acontecendo
      if (progress > 0 && progress < 100) {
        mapRef.current.panTo([lat, lng]);
      }
    }

    return () => {
      // Cleanup happens if component unmounts
    };
  }, [progress, depotCoords, userCoords]);

  return (
    <div className="relative w-full h-56 rounded-2xl overflow-hidden border border-gray-100 shadow-inner mb-6 z-0">
      <div ref={mapContainerRef} className="w-full h-full"></div>
      
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black text-blue-600 shadow-sm z-[500] flex items-center gap-2 border border-blue-50">
        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-ping"></div>
        GPS ATIVO
      </div>
      
      <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black shadow-lg z-[500] animate-pulse">
        PEDIDO EM TEMPO REAL
      </div>

      <style>{`
        .custom-delivery-icon {
          transition: all 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default TrackingMap;
