
import React, { useState } from 'react';
import { ChevronLeft, Eye, EyeOff, X, Check, Loader2, AlertCircle, Store, User, MapPin, Phone as PhoneIcon } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { UserType } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';

interface SignupScreenProps {
  onBack: () => void;
  onSwitchToLogin: () => void;
  onSignupSuccess: () => void;
  initialUserType?: UserType;
}

const SignupScreen: React.FC<SignupScreenProps> = ({ onBack, onSwitchToLogin, onSignupSuccess, initialUserType }) => {
  const { t } = useLanguage();
  const { notifyAdmins } = useApp();
  const [userType, setUserType] = useState<UserType>(initialUserType || UserType.CLIENTE);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Campos extras para Depósito
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');

  const hasEightChars = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isAllValid = hasEightChars && hasUpperCase && hasNumber;

  const handleSignup = async () => {
    if (!isAllValid || !email || !name) return;
    
    if (password !== confirmPassword) {
      setErrorMsg(t('passwords_dont_match'));
      return;
    }

    if (userType === UserType.DEPOSITO && (!businessName || !address)) {
      setErrorMsg(t('fill_depot_data'));
      return;
    }
    
    setIsLoading(true);
    setErrorMsg('');

    const avatarUrl = `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=ED1C24&color=fff`;

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: { full_name: name, avatar_url: avatarUrl }
        }
      });

      if (authError) {
        setErrorMsg(authError.message);
        setIsLoading(false);
        return;
      }

      if (authData.user) {
        let depotId = null;

        // Se for um parceiro, primeiro criamos o depósito
        if (userType === UserType.DEPOSITO) {
          const { data: newDepot, error: depotError } = await supabase
            .from('depots')
            .insert([{
              name: businessName,
              address: address,
              phone: phone,
              stock: 0,
              price: 1200,
              is_open: false,
              latitude: -15.19, // Padrão Namibe
              longitude: 12.15,
              image_url: 'https://images.unsplash.com/photo-1584263347416-85a18a45a449?auto=format&fit=crop&q=80&w=400',
              category: t('cat_economic')
            }])
            .select()
            .single();

          if (depotError) throw depotError;
          depotId = newDepot.id;
        }

        // Criar Perfil vinculado usando depot_id (padrão Postgres)
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: authData.user.id,
            email: email,
            name: name,
            phone: phone,
            userType: userType, // Corrigido para "userType"
            depot_id: depotId,
            avatar: avatarUrl,
            balance: userType === UserType.CLIENTE ? 250 : 0
          }]);

        if (profileError) throw profileError;
        
        // Notificar o Usuário sobre a criação da conta
        try {
          const { data: notifData } = await supabase
            .from('notifications')
            .insert([{
              user_id: authData.user.id,
              title: t('welcome_to_gas_ja' as any) || 'Bem-vindo ao Gás Já!',
              message: t('account_created_msg' as any) || 'A sua conta foi criada com sucesso. Aproveite as nossas ofertas!',
              type: 'system',
              read: false
            }]);
        } catch (notifErr) {
          console.warn("Erro ao notificar usuário sobre o registro:", notifErr);
        }
        
        // Notificar Administradores sobre o novo registro
        try {
          await notifyAdmins(
            'Novo Registro de Usuário',
            `${name} se registrou como ${userType === UserType.CLIENTE ? 'Cliente' : 'Parceiro (Depósito)'}.`,
            'system'
          );
        } catch (notifErr) {
          console.warn("Erro ao notificar administradores sobre o registro:", notifErr);
        }

        // Registrar a transação do bónus inicial no histórico
        if (userType === UserType.CLIENTE) {
          await supabase.from('transactions').insert([{
            user_id: authData.user.id,
            type: 'in',
            category: 'deposit',
            amount: 250,
            description: t('welcome_bonus')
          }]);
        }
        
        onSignupSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || t('server_connection_failed'));
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1A3A5A] dark:bg-slate-950 flex flex-col items-center pt-8 overflow-y-auto animate-in slide-in-from-right duration-300">
      <button onClick={onBack} className="absolute top-8 left-6 bg-white dark:bg-slate-800 rounded-full p-1 shadow-md active:scale-90 transition-transform">
        <ChevronLeft size={20} className="text-gray-800 dark:text-white" />
      </button>

      <div className="flex flex-col items-center mt-12 mb-10 shrink-0">
        <div className="relative mb-2">
          <img src="/assets/splash.png" alt="Logo" className="w-32 h-32 object-contain" />
        </div>
        <p className="text-white text-[10px] tracking-widest font-medium opacity-80 uppercase">{t('one_map_solutions')}</p>
      </div>

      <div className="w-[90%] bg-white dark:bg-slate-900 rounded-[40px] p-8 shadow-2xl flex flex-col items-center mb-10">
        <div className="flex bg-gray-100 dark:bg-slate-800 rounded-full p-1 mb-8 w-full max-w-[240px]">
          <button onClick={onSwitchToLogin} className="flex-1 text-gray-500 dark:text-slate-400 py-2 text-sm font-bold">{t('login')}</button>
          <button className="flex-1 bg-[#1A3A5A] dark:bg-[#ED1C24] text-white rounded-full py-2 text-sm font-bold shadow-lg">{t('signup')}</button>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full mb-8">
          <button 
            onClick={() => setUserType(UserType.CLIENTE)}
            className={`py-4 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all ${userType === UserType.CLIENTE ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-gray-50 border-transparent text-gray-400'}`}
          >
            <User size={20} />
            <span className="text-[10px] font-black uppercase">{t('i_am_client')}</span>
          </button>
          <button 
            onClick={() => setUserType(UserType.DEPOSITO)}
            className={`py-4 rounded-2xl flex flex-col items-center gap-2 border-2 transition-all ${userType === UserType.DEPOSITO ? 'bg-[#ED1C24] border-[#ED1C24] text-white shadow-lg' : 'bg-gray-50 border-transparent text-gray-400'}`}
          >
            <Store size={20} />
            <span className="text-[10px] font-black uppercase">{t('i_am_depot')}</span>
          </button>
        </div>

        <div className="w-full space-y-4">
          <div className="space-y-4">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('personal_data')}</p>
             <input 
              type="text" 
              placeholder={t('name')} 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-800 rounded-2xl px-6 py-4 text-sm dark:text-white outline-none focus:ring-2 focus:ring-[#ED1C24]/20"
            />
            <input 
              type="email" 
              placeholder={t('email')} 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-800 rounded-2xl px-6 py-4 text-sm dark:text-white outline-none focus:ring-2 focus:ring-[#ED1C24]/20"
            />
            <input 
              type="tel" 
              placeholder={`${t('phone')} (+244)`} 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-800 rounded-2xl px-6 py-4 text-sm dark:text-white outline-none focus:ring-2 focus:ring-[#ED1C24]/20"
            />
          </div>

          {userType === UserType.DEPOSITO && (
            <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-top-4">
              <p className="text-[10px] font-black text-[#ED1C24] uppercase tracking-widest ml-1">{t('business_data')}</p>
              <input 
                type="text" 
                placeholder={t('business_name')} 
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-orange-50/50 dark:bg-slate-800 border border-orange-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm dark:text-white outline-none"
              />
              <input 
                type="text" 
                placeholder={t('address')} 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-orange-50/50 dark:bg-slate-800 border border-orange-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm dark:text-white outline-none"
              />
            </div>
          )}
          
          <div className="space-y-4 pt-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('security')}</p>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('password')} 
                className="w-full bg-gray-50 dark:bg-slate-800 rounded-2xl px-6 py-4 text-sm dark:text-white outline-none focus:ring-2 focus:ring-[#ED1C24]/20"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="relative">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('confirm_password')} 
                className="w-full bg-gray-50 dark:bg-slate-800 rounded-2xl px-6 py-4 text-sm dark:text-white outline-none focus:ring-2 focus:ring-[#ED1C24]/20"
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-1 px-1">
               <p className={`text-[9px] flex items-center gap-1 font-bold ${hasEightChars ? 'text-green-500' : 'text-gray-400'}`}>
                 {hasEightChars ? <Check size={10} /> : <X size={10} />} {t('min_8_chars')}
               </p>
               <p className={`text-[9px] flex items-center gap-1 font-bold ${hasUpperCase ? 'text-green-500' : 'text-gray-400'}`}>
                 {hasUpperCase ? <Check size={10} /> : <X size={10} />} {t('uppercase_letter')}
               </p>
               <p className={`text-[9px] flex items-center gap-1 font-bold ${hasNumber ? 'text-green-500' : 'text-gray-400'}`}>
                 {hasNumber ? <Check size={10} /> : <X size={10} />} {t('one_number')}
               </p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-6 p-4 bg-[#ED1C24]/5 dark:bg-[#ED1C24]/10 border border-[#ED1C24]/20 rounded-2xl flex items-center gap-3 text-[#ED1C24] text-[10px] font-bold w-full animate-shake">
            <AlertCircle size={16} />
            {errorMsg}
          </div>
        )}

        <button 
          onClick={handleSignup}
          disabled={!isAllValid || isLoading || !email || !name || !confirmPassword}
          className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl mt-8 active:scale-95 transition-all flex items-center justify-center gap-2 ${isAllValid && confirmPassword ? 'bg-[#ED1C24] text-white shadow-[#ED1C24]/20' : 'bg-gray-100 text-gray-400'}`}
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : t('finish_signup')}
        </button>

        <p className="mt-8 text-[11px] font-bold text-gray-400 uppercase tracking-tighter">
          {t('already_have_account')} <button onClick={onSwitchToLogin} className="text-[#ED1C24]">{t('do_login')}</button>
        </p>
      </div>
    </div>
  );
};

export default SignupScreen;
