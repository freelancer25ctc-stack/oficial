
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Flame, Ticket, Truck, ShieldCheck, Wallet, Users, Zap, ChevronRight } from 'lucide-react';
import { useBanners } from '../context/BannerContext';

interface FeaturedCardProps {
  onOrderNow: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  'Flame': <Flame className="w-24 h-24 opacity-20 rotate-12" />,
  'Ticket': <Ticket className="w-24 h-24 opacity-20 -rotate-12" />,
  'Truck': <Truck className="w-24 h-24 opacity-20 rotate-45" />,
  'ShieldCheck': <ShieldCheck className="w-24 h-24 opacity-20" />,
  'Wallet': <Wallet className="w-24 h-24 opacity-20 -rotate-6" />,
  'Users': <Users className="w-24 h-24 opacity-20" />,
  'Zap': <Zap className="w-24 h-24 opacity-20" />
};

const FeaturedCard: React.FC<FeaturedCardProps> = ({ onOrderNow }) => {
  const { banners, isLoading } = useBanners();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoPlayTimer = useRef<number | null>(null);

  const startAutoPlay = useCallback(() => {
    if (banners.length <= 1) return;
    stopAutoPlay();
    autoPlayTimer.current = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 8000);
  }, [banners.length]);

  const stopAutoPlay = useCallback(() => {
    if (autoPlayTimer.current) {
      clearInterval(autoPlayTimer.current);
      autoPlayTimer.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoPlay();
    return () => stopAutoPlay();
  }, [startAutoPlay, stopAutoPlay]);

  // Reset index if banners change and current index is out of bounds
  useEffect(() => {
    if (currentIndex >= banners.length && banners.length > 0) {
      setCurrentIndex(0);
    }
  }, [banners.length, currentIndex]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (banners.length <= 1) return;
    stopAutoPlay();
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.targetTouches[0].clientX;
    const diff = currentX - touchStart;
    setDragOffset(diff);
  };

  const onTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const threshold = 100;

    if (dragOffset < -threshold && currentIndex < banners.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (dragOffset > threshold && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }

    setDragOffset(0);
    startAutoPlay();
  };

  const getContainerTranslate = () => {
    if (!containerRef.current) return 0;
    const slideWidth = containerRef.current.offsetWidth;
    return -(currentIndex * slideWidth) + dragOffset;
  };

  if (isLoading && banners.length === 0) {
    return (
      <div className="relative -mx-6 w-[calc(100%+3rem)] h-52 overflow-hidden bg-slate-800 animate-pulse flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 bg-slate-700 rounded-full"></div>
          <div className="w-32 h-4 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (banners.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      className="relative -mx-6 w-[calc(100%+3rem)] h-52 overflow-hidden bg-gray-900 shadow-xl"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div 
        className={`flex h-full transition-transform ${isDragging ? 'duration-0' : 'duration-500 ease-out'}`}
        style={{ transform: `translateX(${getContainerTranslate()}px)` }}
      >
        {banners.map((slide) => (
          <div
            key={slide.id}
            className={`relative flex-none w-full h-full flex flex-col justify-center px-10 text-white`}
            style={{ 
              background: slide.image_url 
                ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url(${slide.image_url}) center/cover no-repeat` 
                : `linear-gradient(to bottom right, ${slide.gradient_from || '#1A3A5A'}, ${slide.gradient_to || '#2C527A'})` 
            }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none pr-4">
              {ICON_MAP[slide.icon_name || 'Flame'] || ICON_MAP['Flame']}
            </div>

            <div className="relative z-10 max-w-[75%]">
              <h2 className="text-2xl font-black mb-1 leading-tight tracking-tight uppercase">
                {slide.title}
              </h2>
              <p className="text-[11px] font-bold text-white/80 leading-snug mb-5">
                {slide.subtitle}
              </p>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (slide.button_link) {
                    window.open(slide.button_link, '_blank');
                  } else {
                    onOrderNow();
                  }
                }}
                className="bg-white text-gray-900 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all shadow-xl"
              >
                {slide.button_text || slide.buttonText || 'Pedir agora'}
                <ChevronRight size={14} strokeWidth={3} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-20 pointer-events-none">
        {banners.map((_, index) => (
          <div
            key={index}
            className={`transition-all duration-300 h-1 rounded-full ${
              index === currentIndex 
                ? 'w-8 bg-white' 
                : 'w-2 bg-white/30'
            }`}
          />
        ))}
      </div>

      {currentIndex === 0 && !isDragging && (
        <div className="absolute right-4 bottom-1/2 translate-y-1/2 animate-bounce flex flex-col items-center opacity-40">
           <ChevronRight size={24} className="text-white" />
        </div>
      )}
    </div>
  );
};

export default FeaturedCard;
