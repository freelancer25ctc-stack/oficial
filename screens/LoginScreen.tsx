
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useLanguage } from '../context/LanguageContext';

interface LoginScreenProps {
  onBack: () => void;
  onSwitchToSignup: () => void;
  onLoginSuccess: () => void;
  onForgotPassword: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onBack, onSwitchToSignup, onLoginSuccess, onForgotPassword }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Carregar dados salvos ao iniciar
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('gasja_remembered_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch (e) {
      console.warn("Erro ao ler e-mail lembrado:", e);
    }
  }, []);

  const handleLogin = async () => {
    if (!email || !password) return;
    setIsLoading(true);
    setErrorMsg('');
    
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      setErrorMsg(error.message === 'Invalid login credentials' ? t('invalid_credentials') : error.message);
      setIsLoading(false);
    } else {
      // Salvar ou remover e-mail do localStorage
      try {
        if (rememberMe) {
          localStorage.setItem('gasja_remembered_email', email);
        } else {
          localStorage.removeItem('gasja_remembered_email');
        }
      } catch (e) {
        console.warn("Erro ao gerenciar e-mail lembrado no cache:", e);
      }
      onLoginSuccess();
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
        <div className="flex bg-gray-100 dark:bg-slate-800 rounded-full p-1 mb-8 w-full max-w-[240px]">
          <button className="flex-1 bg-[#1A3A5A] dark:bg-[#ED1C24] text-white rounded-full py-2 text-sm font-bold shadow-lg">{t('login')}</button>
          <button onClick={onSwitchToSignup} className="flex-1 text-gray-500 dark:text-slate-400 py-2 text-sm font-bold">{t('signup')}</button>
        </div>

        <div className="w-full space-y-4">
          <input 
            type="email" 
            placeholder={t('email')} 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-100 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-sm dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none placeholder:text-gray-400"
          />
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder={t('password')} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-100 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-sm dark:text-white focus:ring-2 focus:ring-[#ED1C24]/20 outline-none placeholder:text-gray-400"
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="w-full mt-4 flex items-center justify-between px-1">
          <button 
            onClick={() => setRememberMe(!rememberMe)}
            className="flex items-center gap-2 group cursor-pointer"
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-[#ED1C24] border-[#ED1C24]' : 'border-gray-200 dark:border-slate-700'}`}>
              {rememberMe && <Check size={14} className="text-white" strokeWidth={4} />}
            </div>
            <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">{t('remember_me')}</span>
          </button>
          <button 
            onClick={onForgotPassword}
            className="text-[11px] font-bold text-[#ED1C24] hover:underline uppercase tracking-widest"
          >
            {t('forgot_password')}
          </button>
        </div>

        {errorMsg && <p className="text-[#ED1C24] text-[10px] font-bold mt-4 animate-shake text-center">{errorMsg}</p>}

        <button 
          onClick={handleLogin}
          disabled={isLoading || !email || !password}
          className="w-full bg-[#ED1C24] text-white py-4 rounded-2xl font-bold text-sm shadow-lg mt-8 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : t('login')}
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;
