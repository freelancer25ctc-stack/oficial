import React, { useState } from 'react';
import { ChevronLeft, Lock, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useLanguage } from '../context/LanguageContext';

interface ResetPasswordScreenProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ onSuccess, onCancel }) => {
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleReset = async () => {
    if (!password || password !== confirmPassword) {
      setErrorMsg(t('passwords_dont_match'));
      return;
    }

    if (password.length < 8) {
      setErrorMsg(t('min_8_chars'));
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setErrorMsg(error.message);
        setIsLoading(false);
      } else {
        setIsSuccess(true);
        setIsLoading(false);
        setTimeout(() => {
          onSuccess();
        }, 3000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro ao processar o pedido.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1A3A5A] dark:bg-slate-950 flex flex-col items-center pt-8 animate-in slide-in-from-bottom duration-500 overflow-y-auto">
      <div className="flex flex-col items-center mt-12 mb-10">
        <div className="relative mb-2">
          <img src="/assets/splash.png" alt="Logo" className="w-32 h-32 object-contain" />
        </div>
        <p className="text-white text-[10px] tracking-widest font-medium opacity-80 uppercase">{t('one_map_solutions')}</p>
      </div>

      <div className="w-[90%] bg-white dark:bg-slate-900 rounded-[40px] p-8 shadow-2xl flex flex-col items-center mb-10">
        <h2 className="text-xl font-black text-[#1A3A5A] dark:text-white mb-2 uppercase tracking-tight text-center">
          {t('change_password')}
        </h2>
        <p className="text-gray-500 dark:text-slate-400 text-xs text-center mb-8 font-medium leading-relaxed">
          {isSuccess 
            ? t('password_updated_success') 
            : t('password_strength_info')}
        </p>

        {!isSuccess ? (
          <>
            <div className="w-full space-y-4">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock size={18} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder={t('new_password_label')} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-12 py-4 text-sm dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none placeholder:text-gray-400"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock size={18} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder={t('confirm_password_label')} 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-6 py-4 text-sm dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none placeholder:text-gray-400"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="mt-4 flex items-center gap-2 text-[#ED1C24] bg-[#ED1C24]/10 px-4 py-2 rounded-xl w-full animate-shake">
                <AlertCircle size={14} />
                <p className="text-[10px] font-bold uppercase">{errorMsg}</p>
              </div>
            )}

            <button 
              onClick={handleReset}
              disabled={isLoading || !password || !confirmPassword}
              className="w-full bg-[#ED1C24] text-white py-4 rounded-2xl font-bold text-sm shadow-lg mt-8 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : t('update_security')}
            </button>

            <button 
              onClick={onCancel}
              className="mt-8 text-[11px] font-bold text-gray-500 dark:text-slate-400 hover:text-[#ED1C24] transition-colors uppercase tracking-widest"
            >
              {t('cancel')}
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center py-4">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <CheckCircle2 size={40} className="text-green-500" />
            </div>
            <p className="text-green-500 font-bold text-sm uppercase tracking-widest text-center">
              {t('success')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordScreen;
