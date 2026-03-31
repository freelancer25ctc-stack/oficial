import React, { useState } from 'react';
import { ChevronLeft, Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useLanguage } from '../context/LanguageContext';

interface PasswordRecoveryScreenProps {
  onBack: () => void;
}

const PasswordRecoveryScreen: React.FC<PasswordRecoveryScreenProps> = ({ onBack }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRecovery = async () => {
    if (!email) return;
    setIsLoading(true);
    setErrorMsg('');
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (error) {
        setErrorMsg(error.message);
        setIsLoading(false);
      } else {
        setIsSent(true);
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro ao processar o pedido.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1A3A5A] dark:bg-slate-950 flex flex-col items-center pt-8 animate-in slide-in-from-right duration-300 overflow-y-auto">
      <button onClick={onBack} className="absolute top-8 left-6 bg-white dark:bg-slate-800 rounded-full p-1 shadow-md active:scale-90 transition-transform">
        <ChevronLeft size={20} className="text-gray-800 dark:text-white" />
      </button>

      <div className="flex flex-col items-center mt-12 mb-10">
        <div className="relative mb-2">
          <img src="/assets/splash.png" alt="Logo" className="w-32 h-32 object-contain" />
        </div>
        <p className="text-white text-[10px] tracking-widest font-medium opacity-80 uppercase">{t('one_map_solutions')}</p>
      </div>

      <div className="w-[90%] bg-white dark:bg-slate-900 rounded-[40px] p-8 shadow-2xl flex flex-col items-center mb-10">
        <h2 className="text-xl font-black text-[#1A3A5A] dark:text-white mb-2 uppercase tracking-tight text-center">
          {t('recover_password')}
        </h2>
        <p className="text-gray-500 dark:text-slate-400 text-xs text-center mb-8 font-medium leading-relaxed">
          {isSent 
            ? t('recovery_email_sent_desc') 
            : t('recovery_desc')}
        </p>

        {!isSent ? (
          <>
            <div className="w-full relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Mail size={18} />
              </div>
              <input 
                type="email" 
                placeholder={t('email')} 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-100 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-6 py-4 text-sm dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none placeholder:text-gray-400"
              />
            </div>

            {errorMsg && (
              <div className="mt-4 flex items-center gap-2 text-[#ED1C24] bg-[#ED1C24]/10 px-4 py-2 rounded-xl w-full animate-shake">
                <AlertCircle size={14} />
                <p className="text-[10px] font-bold uppercase">{errorMsg}</p>
              </div>
            )}

            <button 
              onClick={handleRecovery}
              disabled={isLoading || !email}
              className="w-full bg-[#ED1C24] text-white py-4 rounded-2xl font-bold text-sm shadow-lg mt-8 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : t('send_instructions')}
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center py-4">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <CheckCircle2 size={40} className="text-green-500" />
            </div>
            <button 
              onClick={onBack}
              className="w-full bg-[#1A3A5A] dark:bg-slate-800 text-white py-4 px-12 rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all uppercase tracking-widest"
            >
              {t('back_to_login')}
            </button>
          </div>
        )}

        {!isSent && (
          <button 
            onClick={onBack}
            className="mt-8 text-[11px] font-bold text-gray-500 dark:text-slate-400 hover:text-[#ED1C24] transition-colors uppercase tracking-widest"
          >
            {t('cancel')}
          </button>
        )}
      </div>
    </div>
  );
};

export default PasswordRecoveryScreen;
