
import React from 'react';
import { Flame } from 'lucide-react';

interface SplashScreenProps {
  isDark?: boolean;
  loadingMessage?: string;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ isDark, loadingMessage }) => {
  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden`}>
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/assets/Fundo.jpg" 
          alt="Background" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
      
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative mb-6 animate-float">
          <div className="w-32 h-32 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] transform rotate-3">
             <img src="/assets/splash.png" alt="Logo" className="w-24 h-24 object-contain" />
          </div>
          <div className="absolute -top-4 -right-4 w-12 h-12 bg-[#ED1C24] rounded-full flex items-center justify-center border-4 border-white dark:border-slate-800 animate-pulse shadow-lg">
            <Flame size={20} className="text-white fill-white" />
          </div>
        </div>

        <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-lg">
          GÁS <span className="text-[#ED1C24] italic">JÁ</span>
        </h1>

        <div className="mt-12 w-48 h-1.5 bg-white/10 rounded-full overflow-hidden relative border border-white/5">
          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#ED1C24] to-white w-full animate-progress-glow"></div>
        </div>

        {loadingMessage && (
          <div className="mt-6 h-6">
            <p className="text-white/80 text-sm font-medium animate-pulse text-center">
              {loadingMessage}
            </p>
          </div>
        )}
      </div>

      <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center z-10">
        <p className="text-white/60 text-xs font-bold uppercase tracking-[0.4em] opacity-80 animate-pulse">
          021|ELEVATE
        </p>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(3deg); }
          50% { transform: translateY(-15px) rotate(-1deg); }
        }
        @keyframes progress-glow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-progress-glow {
          animation: progress-glow 2s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
