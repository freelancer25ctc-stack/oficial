
import React, { useState, useEffect } from 'react';
import { 
  User, 
  ChevronRight, 
  MapPin, 
  Camera,
  Wallet,
  ShieldCheck,
  Bell,
  X,
  Check,
  Globe,
  BadgeCheck,
  HelpCircle,
  Plus,
  Home as HomeIcon,
  Briefcase,
  Lock,
  Info,
  Phone,
  Mail,
  Fingerprint,
  FileText,
  Languages,
  Loader2,
  AlertCircle,
  LayoutDashboard,
  Moon,
  Sun,
  Trash2,
  Settings,
  LogOut,
  PlusCircle,
  Map as MapIcon,
  Share2,
  UserX,
  Flame
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { UserType, Address } from '../types';

import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../i18n/translations';

interface ProfileScreenProps {
  onLogout: () => void;
  onNavigateToWallet: () => void;
  onNavigateToAdmin?: () => void;
  onNavigateToDeposito?: () => void;
  onBack?: () => void;
  areBlocksDark: boolean;
  isBgDark: boolean;
  profile: any;
  onUpdateProfile: (updated: any) => void;
  stats?: {
    totalOrders: number;
    bottlesPurchased: number;
    reviewsMade: number;
    favoritesCount?: number;
  };
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ 
  onLogout, 
  onNavigateToWallet, 
  onNavigateToAdmin,
  onNavigateToDeposito,
  areBlocksDark, 
  isBgDark, 
  profile,
  onUpdateProfile,
  stats: initialStats
}) => {
  const { isDark: appIsDark, themePreference, setThemePreference, isBalanceVisible } = useApp();
  const { language, setLanguage, t } = useLanguage();
  const [activeModal, setActiveModal] = useState<'info' | 'addresses' | 'security' | 'prefs' | 'help' | 'about' | 'avatar' | 'language' | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [stats, setStats] = useState(initialStats || { totalOrders: 0, bottlesPurchased: 0, reviewsMade: 0, favoritesCount: 0 });
  
  // Endereços Reais
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: '', text: '', latitude: null as number | null, longitude: null as number | null });

  // Estados para preferências
  const [notifsEnabled, setNotifsEnabled] = useState(true);
  const [biometryEnabled, setBiometryEnabled] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const hasEightChars = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isPasswordValid = hasEightChars && hasUpperCase && hasNumber;

  useEffect(() => {
    if (profile) {
      setEditForm({ name: profile.name || '', phone: profile.phone || '' });
      fetchStats();
    }
  }, [profile]);

  const fetchStats = async () => {
    if (!profile) return;
    try {
      // Buscar total de pedidos
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id);

      // Buscar total de botijas (soma das quantidades)
      const { data: ordersData } = await supabase
        .from('orders')
        .select('quantity')
        .eq('user_id', profile.id)
        .eq('status', 'Entregue'); // This 'Entregue' is a database value, but let's assume it's consistent.
      
      const totalBottles = ordersData?.reduce((acc, curr) => acc + (curr.quantity || 1), 0) || 0;

      setStats({
        totalOrders: ordersCount || 0,
        bottlesPurchased: totalBottles,
        reviewsMade: 0,
        favoritesCount: profile.favorites?.length || 0
      });
    } catch (err) {
      console.error(t('error_loading_stats'), err);
    }
  };

  const handleAvatarClick = () => {
    // Simulação de upload de foto
    setIsUploading(true);
    setTimeout(async () => {
      const newAvatar = `https://i.pravatar.cc/150?u=${profile.id}&t=${Date.now()}`;
      const { error } = await supabase
        .from('profiles')
        .update({ avatar: newAvatar })
        .eq('id', profile.id);
      
      if (!error) {
        onUpdateProfile({ ...profile, avatar: newAvatar });
      }
      setIsUploading(false);
    }, 1500);
  };

  useEffect(() => {
    if (activeModal === 'addresses' && profile) {
      fetchAddresses();
    }
  }, [activeModal, profile]);

  const fetchAddresses = async () => {
    setIsLoadingAddresses(true);
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAddresses(data);
    }
    setIsLoadingAddresses(false);
  };

  const handleAddAddress = async () => {
    if (!newAddress.label || !newAddress.text || !profile) return;
    setIsSaving(true);

    const { data, error } = await supabase
      .from('addresses')
      .insert([{
        user_id: profile.id,
        label: newAddress.label,
        address_text: newAddress.text,
        latitude: newAddress.latitude,
        longitude: newAddress.longitude,
        is_default: addresses.length === 0
      }])
      .select();

    if (!error && data) {
      setAddresses([data[0], ...addresses]);
      setNewAddress({ label: '', text: '', latitude: null, longitude: null });
      setShowAddressForm(false);
    }
    setIsSaving(false);
  };

  const handleDeleteAddress = async (id: string) => {
    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', id);

    if (!error) {
      setAddresses(addresses.filter(a => a.id !== id));
    }
  };

  const blockClass = areBlocksDark ? "bg-[#1E293B] border-white/5 text-white" : "bg-white border-gray-100 text-[#1A3A5A]";
  
  const handleSaveInfo = async () => {
    if (!profile) return;
    setIsSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({ name: editForm.name, phone: editForm.phone })
      .eq('id', profile.id);

    if (!error) {
      onUpdateProfile({ ...profile, name: editForm.name, phone: editForm.phone });
      setActiveModal(null);
    }
    setIsSaving(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAvatar = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      let finalUrl = avatarUrl;

      // Se houver um ficheiro selecionado, convertemos para Base64
      if (selectedFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });
        finalUrl = await base64Promise;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ avatar: finalUrl })
        .eq('id', profile.id);

      if (!error) {
        onUpdateProfile({ ...profile, avatar: finalUrl });
        setActiveModal(null);
        setSelectedFile(null);
      }
    } catch (err) {
      console.error(t('error_saving_avatar'), err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!isPasswordValid) {
      alert(t('password_requirements_error'));
      return;
    }

    if (newPassword !== confirmPassword) {
      alert(t('passwords_dont_match'));
      return;
    }
    
    setIsUpdatingPassword(true);
    try {
      // Note: Supabase auth.updateUser only requires the new password
      // if the user is already logged in.
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      alert(t('password_updated_success'));
      setNewPassword('');
      setCurrentPassword('');
      setConfirmPassword('');
      setActiveModal(null);
    } catch (err: any) {
      console.error(t('error_updating_password'), err);
      alert(t('error_processing', { message: err.message || t('try_again_later') }));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleClearCache = () => {
    try {
      const keysToKeep = ['gasja_remembered_email', 'app_language', 'supabase.auth.token'];
      const keysToRemove = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !keysToKeep.some(k => key.includes(k))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      alert(t('cache_cleared_success'));
      window.location.reload();
    } catch (e) {
      console.error(t('error_clearing_cache'), e);
    }
  };

  const handleShareApp = async () => {
    const shareData = {
      title: 'Gás Já',
      text: t('share_text'),
      url: window.location.origin
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert(t('app_link_copied'));
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(t('error_sharing'), err);
      }
    }
  };

  if (!profile) return (
    <div className="flex flex-col items-center justify-center h-full py-20">
      <Loader2 className="animate-spin text-[#ED1C24]" size={40} />
      <p className="mt-4 text-gray-400 font-bold uppercase text-[10px]">{t('loading')}</p>
    </div>
  );

  const isAdmin = profile.userType?.toString().toUpperCase() === 'ADMIN';
  const isDeposito = profile.userType?.toString().toUpperCase() === 'DEPOSITO';

  const ProfileMenuItem = ({ icon, title, subtitle, onClick, color = "blue", badge = null }: any) => (
    <button onClick={onClick} className="w-full p-5 flex items-center justify-between hover:bg-white/5 active:bg-white/10 transition-all group">
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded-2xl ${
          color === "blue" ? "bg-blue-500/10 text-blue-500" : 
          color === "green" ? "bg-green-500/10 text-green-500" :
          color === "orange" ? "bg-orange-500/10 text-orange-500" :
          color === "purple" ? "bg-purple-500/10 text-purple-500" :
          "bg-gray-500/10 text-gray-500"
        }`}>
          {icon}
        </div>
        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className="block text-sm font-bold">{title}</span>
            {badge && <span className="bg-[#ED1C24] text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase">{badge}</span>}
          </div>
          <span className="text-[10px] text-gray-400 font-medium">{subtitle}</span>
        </div>
      </div>
      <ChevronRight size={18} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
    </button>
  );

  return (
    <div className="animate-in fade-in duration-500 pb-32">
      {/* Cabeçalho do Perfil */}
      <div className="relative flex flex-col items-center mt-6 mb-10">
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-10 rounded-full animate-pulse"></div>
          <div className="relative">
            <img 
              src={profile.avatar || `https://i.pravatar.cc/150?u=${profile.id}`} 
              className={`w-28 h-28 rounded-[40px] object-cover shadow-2xl relative z-10 ${isUploading ? 'opacity-50' : ''}`} 
              alt="Profile" 
            />
            {isUploading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center">
                <Loader2 className="animate-spin text-white" size={32} />
              </div>
            )}
          </div>
          <button 
            onClick={() => {
              setAvatarUrl(profile.avatar || '');
              setActiveModal('avatar');
            }}
            disabled={isUploading}
            className="absolute -bottom-1 -right-1 bg-[#ED1C24] text-white p-2.5 rounded-2xl border-4 border-white dark:border-slate-900 shadow-xl z-20 active:scale-90 transition-transform disabled:opacity-50"
          >
            <Camera size={16} />
          </button>
        </div>
        <div className="text-center z-10">
          <div className="flex items-center justify-center gap-2">
            <h2 className={`text-2xl font-black ${isBgDark || areBlocksDark ? 'text-white' : 'text-[#1A3A5A]'}`}>
              {profile.name}
            </h2>
          </div>
          <div className="bg-blue-500/10 px-3 py-1 rounded-full mt-2 inline-flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
            <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">
              {isAdmin ? t('admin_general') : isDeposito ? t('depot_seller') : t('client_member')}
            </span>
          </div>
        </div>
      </div>

      {/* Seller Stats for Depots */}
      {isDeposito && (
        <div className="grid grid-cols-2 gap-4 mb-10 px-2">
          <div className={`${blockClass} p-6 rounded-[32px] border text-center shadow-sm relative overflow-hidden group`}>
             <div className="absolute -right-2 -top-2 p-4 bg-green-500/5 rounded-full group-hover:scale-110 transition-transform">
                <Flame size={24} className="text-green-500/20" />
             </div>
             <p className="text-xl font-black text-green-500">4.9</p>
             <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">{t('shop_rating')}</p>
          </div>
          <div className={`${blockClass} p-6 rounded-[32px] border text-center shadow-sm relative overflow-hidden group`}>
             <div className="absolute -right-2 -top-2 p-4 bg-blue-500/5 rounded-full group-hover:scale-110 transition-transform">
                <LayoutDashboard size={24} className="text-blue-500/20" />
             </div>
             <p className="text-xl font-black text-blue-500">{t('active_label')}</p>
             <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">{t('seller_status')}</p>
          </div>
        </div>
      )}

      {/* Stats Quick View */}
      {(!isAdmin && !isDeposito) && (
        <div className="grid grid-cols-3 gap-3 mb-10 px-1">
          {[
            { label: t('stats_orders'), val: stats?.totalOrders || 0, color: 'text-blue-500' },
            { label: t('stats_bottles'), val: stats?.bottlesPurchased || 0, color: 'text-green-500' },
            { label: t('stats_favorites'), val: stats?.favoritesCount || 0, color: 'text-[#ED1C24]' }
          ].map((stat, i) => (
            <div key={i} className={`${blockClass} p-4 rounded-3xl border text-center shadow-sm`}>
              <p className={`text-xl font-black ${stat.color}`}>{stat.val}</p>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Menu Options */}
      <div className="space-y-8">
        {/* Gestão Master (Admin Only) */}
        {isAdmin && (
          <section>
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">{t('master_management')}</h3>
              <div className="w-8 h-[1px] bg-orange-200 dark:bg-orange-500/20"></div>
            </div>
            <div className={`${blockClass} rounded-[32px] border border-orange-500/20 shadow-sm overflow-hidden`}>
              <ProfileMenuItem 
                icon={<LayoutDashboard size={18} />}
                title={t('admin_panel')}
                subtitle={t('ecosystem_control')}
                onClick={onNavigateToAdmin}
                color="orange"
                badge="Master"
              />
            </div>
          </section>
        )}

        {/* Conta & Finanças */}
        <section>
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('account_finances')}</h3>
            <div className="w-8 h-[1px] bg-gray-200 dark:bg-slate-800"></div>
          </div>
          <div className={`${blockClass} rounded-[32px] border shadow-sm divide-y ${areBlocksDark ? 'divide-white/5' : 'divide-gray-50'} overflow-hidden`}>
            {isDeposito && (
              <ProfileMenuItem 
                icon={<LayoutDashboard size={18} />}
                title={t('manage_depot')}
                subtitle={t('manage_depot_desc')}
                onClick={onNavigateToDeposito}
                color="orange"
              />
            )}
            {(!isAdmin && !isDeposito) && (
              <ProfileMenuItem 
                icon={<Wallet size={18} />}
                title={t('wallet_balance_pay')}
                subtitle={isBalanceVisible ? t('available_balance', { amount: (profile.balance || 0).toLocaleString('pt-AO') }) : '•••••• Kz'}
                onClick={onNavigateToWallet}
                color="green"
              />
            )}
            <ProfileMenuItem 
              icon={<User size={18} />}
              title={t('profile_contacts')}
              subtitle={profile.phone || t('edit_personal_info')}
              onClick={() => setActiveModal('info')}
              color="blue"
            />
            {(!isAdmin && !isDeposito) && (
              <ProfileMenuItem 
                icon={<MapPin size={18} />}
                title={t('my_addresses')}
                subtitle={t('manage_saved_locations')}
                onClick={() => setActiveModal('addresses')}
                color="purple"
              />
            )}
          </div>
        </section>

        {/* Segurança & Preferências */}
        <section>
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('security_app')}</h3>
            <div className="w-8 h-[1px] bg-gray-200 dark:bg-slate-800"></div>
          </div>
          <div className={`${blockClass} rounded-[32px] border shadow-sm divide-y ${areBlocksDark ? 'divide-white/5' : 'divide-gray-50'} overflow-hidden`}>
            <ProfileMenuItem 
              icon={<Lock size={18} />}
              title={t('password_security')}
              subtitle={t('protect_account')}
              onClick={() => setActiveModal('security')}
              color="orange"
            />
            <ProfileMenuItem 
              icon={<Settings size={18} />}
              title={t('preferences')}
              subtitle={t('notifs_appearance')}
              onClick={() => setActiveModal('prefs')}
              color="blue"
            />
            <ProfileMenuItem 
              icon={<Trash2 size={18} />}
              title={t('clear_cache')}
              subtitle={t('clear_cache_desc')}
              onClick={handleClearCache}
              color="orange"
            />
            <ProfileMenuItem 
              icon={<Share2 size={18} />}
              title={t('share_app')}
              subtitle={t('invite_friends')}
              onClick={handleShareApp}
              color="purple"
            />
          </div>
        </section>

        {/* Suporte */}
        <section>
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t('help_support')}</h3>
            <div className="w-8 h-[1px] bg-gray-200 dark:bg-slate-800"></div>
          </div>
          <div className={`${blockClass} rounded-[32px] border shadow-sm divide-y ${areBlocksDark ? 'divide-white/5' : 'divide-gray-50'} overflow-hidden`}>
            <ProfileMenuItem 
              icon={<HelpCircle size={18} />}
              title={t('help_center')}
              subtitle={t('faqs')}
              onClick={() => setActiveModal('help')}
              color="purple"
            />
            <ProfileMenuItem 
              icon={<Info size={18} />}
              title={t('about_gas_ja')}
              subtitle={t('version_legal')}
              onClick={() => setActiveModal('about')}
              color="gray"
            />
          </div>
        </section>
      </div>

      <div className="mt-12 px-2 space-y-4">
        <button onClick={onLogout} className="w-full bg-[#ED1C24]/10 text-[#ED1C24] py-5 rounded-3xl font-black text-xs uppercase border border-[#ED1C24]/20 tracking-widest hover:bg-[#ED1C24] hover:text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 group">
          <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
          {t('logout_account')}
        </button>
        
        <p className="text-center text-[8px] font-bold text-gray-400 uppercase tracking-[0.5em] mt-4">Gás Já Marketplace v1.0.0.0</p>
      </div>

      {/* --- MODAIS --- */}

      {/* Perfil & Info */}
      {activeModal === 'info' && (
        <Modal title={t('edit_profile')} onClose={() => setActiveModal(null)} areBlocksDark={areBlocksDark}>
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-gray-500 ml-1">{t('name')}</label>
              <input 
                type="text" 
                value={editForm.name} 
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                className={`w-full rounded-2xl px-5 py-4 text-sm outline-none border transition-all ${
                  areBlocksDark ? 'bg-white/5 border-white/5 text-white focus:border-[#ED1C24]/50' : 'bg-gray-50 border-gray-100 focus:border-[#ED1C24]/50'
                }`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-gray-500 ml-1">{t('phone')}</label>
              <input 
                type="tel" 
                value={editForm.phone} 
                onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                className={`w-full rounded-2xl px-5 py-4 text-sm outline-none border transition-all ${
                  areBlocksDark ? 'bg-white/5 border-white/5 text-white focus:border-[#ED1C24]/50' : 'bg-gray-50 border-gray-100 focus:border-[#ED1C24]/50'
                }`}
              />
            </div>
            <button onClick={handleSaveInfo} disabled={isSaving} className="w-full bg-[#ED1C24] text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest mt-4 shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : t('save_changes')}
            </button>
          </div>
        </Modal>
      )}

      {/* Endereços Reais */}
      {activeModal === 'addresses' && (
        <Modal title={t('my_addresses')} onClose={() => { setActiveModal(null); setShowAddressForm(false); }} areBlocksDark={areBlocksDark}>
          <div className="space-y-6">
            {showAddressForm ? (
              <div className="space-y-4 animate-in zoom-in-95 duration-300">
                <div className="space-y-2">
                   <label className="text-[9px] font-black uppercase text-gray-500 ml-1">{t('address_label_placeholder')}</label>
                   <input 
                     type="text" 
                     value={newAddress.label}
                     onChange={(e) => setNewAddress({...newAddress, label: e.target.value})}
                     className={`w-full rounded-2xl px-5 py-3 text-sm outline-none border ${areBlocksDark ? 'bg-white/5 border-white/5' : 'bg-gray-50'}`}
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[9px] font-black uppercase text-gray-500 ml-1">{t('full_address')}</label>
                   <div className="relative">
                     <input 
                       type="text"
                       value={newAddress.text}
                       onChange={(e) => setNewAddress({...newAddress, text: e.target.value})}
                       className={`w-full rounded-2xl px-5 py-3 text-sm outline-none border pr-12 ${areBlocksDark ? 'bg-white/5 border-white/5' : 'bg-gray-50'}`}
                     />
                     <button 
                       onClick={async () => {
                         if (navigator.geolocation) {
                           navigator.geolocation.getCurrentPosition(async (pos) => {
                             const { latitude, longitude } = pos.coords;
                             setNewAddress(prev => ({ ...prev, latitude, longitude }));
                             alert(`GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                           });
                         }
                       }}
                       className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl shadow-lg active:scale-90 transition-transform ${newAddress.latitude ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}
                       title={t('detect_gps')}
                     >
                       <MapPin size={16} />
                     </button>
                   </div>
                   {newAddress.latitude && (
                     <p className="text-[8px] font-bold text-green-500 uppercase ml-1">GPS OK: {newAddress.latitude.toFixed(4)}, {newAddress.longitude?.toFixed(4)}</p>
                   )}
                </div>
                <div className="flex gap-3">
                   <button onClick={() => setShowAddressForm(false)} className="flex-1 py-4 bg-gray-500/10 text-gray-500 rounded-2xl text-[10px] font-black uppercase">{t('cancel_btn')}</button>
                   <button onClick={handleAddAddress} disabled={isSaving} className="flex-2 py-4 bg-[#ED1C24] text-white rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2">
                     {isSaving ? <Loader2 size={14} className="animate-spin" /> : t('save_location')}
                   </button>
                </div>
              </div>
            ) : (
              <>
                {isLoadingAddresses ? (
                  <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>
                ) : addresses.length === 0 ? (
                  <div className="text-center py-10 opacity-30">
                     <MapIcon size={48} className="mx-auto mb-4" />
                     <p className="text-[10px] font-black uppercase">{t('no_addresses_saved')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {addresses.map((addr) => (
                      <div key={addr.id} className={`p-5 rounded-3xl border flex items-center justify-between ${areBlocksDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-[#ED1C24]/10 text-[#ED1C24] rounded-2xl">
                            {addr.label.toLowerCase().includes('trabalho') ? <Briefcase size={20} /> : <HomeIcon size={20} />}
                          </div>
                          <div>
                            <p className="text-sm font-black">{addr.label}, {addr.address_text}</p>
                            {addr.latitude && addr.longitude && (
                              <p className="text-[10px] text-blue-500 font-bold uppercase tracking-tighter">GPS: {addr.latitude.toFixed(4)}, {addr.longitude.toFixed(4)}</p>
                            )}
                          </div>
                        </div>
                        <button onClick={() => handleDeleteAddress(addr.id)} className="p-2 text-[#ED1C24]/50 hover:text-[#ED1C24] transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button 
                  onClick={() => setShowAddressForm(true)}
                  className="w-full py-5 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-3xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#ED1C24] hover:border-[#ED1C24]/30 transition-all"
                >
                  <PlusCircle size={20} /> {t('new_address')}
                </button>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Segurança */}
      {activeModal === 'security' && (
        <Modal title={t('security_title')} onClose={() => { 
          setActiveModal(null); 
          setNewPassword(''); 
          setCurrentPassword('');
          setConfirmPassword('');
        }} areBlocksDark={areBlocksDark}>
          <div className="space-y-6">
            <div className={`p-5 rounded-3xl border ${areBlocksDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
              <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4 flex items-center gap-2">
                <Lock size={14} className="text-orange-500" /> {t('change_password')}
              </h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-gray-500 ml-1">{t('current_password')}</label>
                  <input 
                    type="password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={`w-full p-4 rounded-2xl text-sm outline-none border transition-all ${
                      areBlocksDark ? 'bg-slate-900 border-white/5 text-white focus:border-orange-500/50' : 'bg-white border-gray-100 focus:border-orange-500/50'
                    }`} 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-gray-500 ml-1">{t('new_password_label')}</label>
                  <input 
                    type="password" 
                    placeholder={t('min_8_chars')} 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full p-4 rounded-2xl text-sm outline-none border transition-all ${
                      areBlocksDark ? 'bg-slate-900 border-white/5 text-white focus:border-orange-500/50' : 'bg-white border-gray-100 focus:border-orange-500/50'
                    }`} 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-gray-500 ml-1">{t('confirm_password_label')}</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full p-4 rounded-2xl text-sm outline-none border transition-all ${
                      areBlocksDark ? 'bg-slate-900 border-white/5 text-white focus:border-orange-500/50' : 'bg-white border-gray-100 focus:border-orange-500/50'
                    }`} 
                  />
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
                   {newPassword && confirmPassword && (
                     <p className={`text-[9px] flex items-center gap-1 font-bold ${newPassword === confirmPassword ? 'text-green-500' : 'text-[#ED1C24]'}`}>
                       {newPassword === confirmPassword ? <Check size={10} /> : <X size={10} />} {t('passwords_match_info')}
                     </p>
                   )}
                </div>

                <button 
                  onClick={handleUpdatePassword}
                  disabled={isUpdatingPassword || !isPasswordValid || newPassword !== confirmPassword}
                  className="w-full py-4 bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"
                >
                  {isUpdatingPassword ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  {t('update_security')}
                </button>
              </div>
            </div>

            <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex gap-3">
              <Info size={18} className="text-blue-500 shrink-0" />
              <p className="text-[9px] font-medium text-gray-500 dark:text-slate-400 leading-relaxed">
                {t('password_strength_info')}
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Preferências */}
      {activeModal === 'prefs' && (
        <Modal title={t('settings_title')} onClose={() => setActiveModal(null)} areBlocksDark={areBlocksDark}>
          <div className="space-y-4">
             <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-500/5">
                <div className="flex items-center gap-3">
                  <Bell size={18} className="text-orange-500" />
                  <span className="text-sm font-bold">{t('push_notifications')}</span>
                </div>
                <Toggle active={notifsEnabled} onClick={() => setNotifsEnabled(!notifsEnabled)} />
             </div>
             <div onClick={() => setActiveModal('language')} className="flex items-center justify-between p-4 rounded-2xl bg-gray-500/5 cursor-pointer hover:bg-gray-500/10 transition-colors">
                <div className="flex items-center gap-3">
                  <Languages size={18} className="text-blue-500" />
                  <span className="text-sm font-bold">{t('language')}</span>
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase">
                  {t(`language_${language}` as any)}
                </span>
             </div>
             <div className="p-4 rounded-2xl bg-gray-500/5">
                <div className="flex items-center gap-3 mb-4">
                  <Moon size={18} className="text-indigo-500" />
                  <span className="text-sm font-bold">{t('appearance')}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'light', label: t('light_mode'), icon: <Sun size={14} /> },
                    { id: 'dark', label: t('dark_mode'), icon: <Moon size={14} /> },
                    { id: 'system', label: t('system_mode'), icon: <Settings size={14} /> }
                  ].map((pref) => (
                    <button
                      key={pref.id}
                      onClick={() => setThemePreference(pref.id as any)}
                      className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all ${
                        themePreference === pref.id 
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' 
                          : areBlocksDark ? 'bg-white/5 border-white/5 text-white/60' : 'bg-white border-gray-100 text-gray-400'
                      }`}
                    >
                      {pref.icon}
                      <span className="text-[9px] font-black uppercase tracking-widest">{pref.label}</span>
                    </button>
                  ))}
                </div>
             </div>
          </div>
        </Modal>
      )}

      {/* Avatar Modal */}
      {activeModal === 'avatar' && (
        <Modal title={t('profile_photo')} onClose={() => { setActiveModal(null); setSelectedFile(null); }} areBlocksDark={areBlocksDark}>
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="relative group">
                <img 
                  src={avatarUrl || `https://i.pravatar.cc/150?u=${profile.id}`} 
                  className="w-32 h-32 rounded-[40px] object-cover shadow-xl"
                  alt="Preview"
                />
                <div className="absolute inset-0 bg-black/40 rounded-[40px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="text-white" size={24} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-gray-500 ml-1">{t('upload_from_device')}</label>
                <label className={`flex items-center justify-center gap-3 w-full rounded-2xl px-5 py-4 border-2 border-dashed transition-all cursor-pointer ${
                  areBlocksDark ? 'bg-white/5 border-white/10 text-white hover:border-[#ED1C24]/50' : 'bg-gray-50 border-gray-200 hover:border-[#ED1C24]/50'
                }`}>
                  <Plus size={20} className="text-[#ED1C24]" />
                  <span className="text-xs font-bold">{selectedFile ? selectedFile.name : t('choose_photo')}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              </div>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100 dark:border-white/5"></div></div>
                <div className="relative flex justify-center text-[8px] font-black uppercase tracking-widest text-gray-400 bg-transparent px-2">{t('or_use_url')}</div>
              </div>

              <div className="space-y-2">
                <input 
                  type="text" 
                  placeholder="https://exemplo.com/foto.jpg"
                  value={avatarUrl.startsWith('data:') ? '' : avatarUrl}
                  onChange={(e) => {
                    setAvatarUrl(e.target.value);
                    setSelectedFile(null);
                  }}
                  className={`w-full rounded-2xl px-5 py-4 text-sm outline-none border transition-all ${
                    areBlocksDark ? 'bg-white/5 border-white/5 text-white focus:border-[#ED1C24]/50' : 'bg-gray-50 border-gray-100 focus:border-[#ED1C24]/50'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  setAvatarUrl(`https://i.pravatar.cc/150?u=${Math.random()}`);
                  setSelectedFile(null);
                }}
                className="py-4 bg-blue-500/10 text-blue-500 rounded-2xl text-[10px] font-black uppercase"
              >
                {t('random_btn')}
              </button>
              <button 
                onClick={handleSaveAvatar}
                disabled={isSaving}
                className="py-4 bg-[#ED1C24] text-white rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : t('confirm_btn')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Ajuda */}
      {activeModal === 'help' && (
        <Modal title={t('help_center_title')} onClose={() => setActiveModal(null)} areBlocksDark={areBlocksDark}>
          <div className="space-y-4">
            {[
              { q: t('faq_q1'), a: t('faq_a1') },
              { q: t('faq_q2'), a: t('faq_a2') },
              { q: t('faq_q3'), a: t('faq_a3') },
              { q: t('faq_q4'), a: t('faq_a4') }
            ].map((item, i) => (
              <div key={i} className={`p-4 rounded-2xl border ${areBlocksDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                <p className="text-xs font-black uppercase text-[#ED1C24] mb-1">{item.q}</p>
                <p className={`text-[11px] font-medium leading-relaxed ${areBlocksDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.a}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}
      {/* Modal de Idioma */}
      {activeModal === 'language' && (
        <Modal title={t('language')} onClose={() => setActiveModal('prefs')} areBlocksDark={areBlocksDark}>
          <div className="space-y-3">
            {[
              { id: 'pt', label: t('language_pt'), flag: '🇦🇴' },
              { id: 'en', label: t('language_en'), flag: '🇺🇸' },
              { id: 'fr', label: t('language_fr'), flag: '🇫🇷' }
            ].map((lang) => (
              <button 
                key={lang.id}
                onClick={() => {
                  setLanguage(lang.id as Language);
                  setActiveModal('prefs');
                }}
                className={`w-full p-5 rounded-3xl border flex items-center justify-between transition-all ${
                  language === lang.id 
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' 
                    : areBlocksDark ? 'bg-white/5 border-white/5 text-white' : 'bg-gray-50 border-gray-100 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="text-sm font-bold">{lang.label}</span>
                </div>
                {language === lang.id && <Check size={18} />}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* Sobre o Gás Já */}
      {activeModal === 'about' && (
        <Modal title={t('about_title')} onClose={() => setActiveModal(null)} areBlocksDark={areBlocksDark}>
          <div className="space-y-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-[#ED1C24] rounded-[24px] flex items-center justify-center shadow-lg shadow-[#ED1C24]/20">
                <Flame size={40} className="text-white" />
              </div>
            </div>
            <div>
              <h3 className={`text-lg font-black ${areBlocksDark ? 'text-white' : 'text-[#1A3A5A]'}`}>Gás Já</h3>
              <p className="text-[10px] font-black text-[#ED1C24] uppercase tracking-widest">{t('version_label')} 1.0.0.0 (Build 2026)</p>
            </div>
            <p className={`text-xs font-medium leading-relaxed ${areBlocksDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {t('about_description')}
            </p>
            <div className={`p-4 rounded-2xl border ${areBlocksDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'} text-left`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-gray-400 uppercase">{t('developer_label')}</span>
                <span className={`text-[10px] font-bold ${areBlocksDark ? 'text-white' : 'text-gray-700'}`}>Equipa 021|Elevate</span>
              </div>
            </div>
            <p className="text-[9px] text-gray-400 font-medium">{t('all_rights_reserved')}</p>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Componentes Auxiliares
const Modal = ({ title, children, onClose, areBlocksDark }: any) => (
  <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-4 animate-in fade-in duration-300">
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>
    <div className={`w-full max-w-md ${areBlocksDark ? 'bg-[#1A2536]' : 'bg-white'} rounded-[40px] p-8 shadow-2xl relative animate-in slide-in-from-bottom-8 duration-300`}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className={`text-xl font-black ${areBlocksDark ? 'text-white' : 'text-[#1A3A5A]'}`}>{title}</h2>
          <div className="w-8 h-1 bg-[#ED1C24] rounded-full mt-1"></div>
        </div>
        <button onClick={onClose} className="p-2 bg-gray-500/10 rounded-full text-gray-400 hover:text-[#ED1C24] transition-colors">
          <X size={20} />
        </button>
      </div>
      <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
        {children}
      </div>
    </div>
  </div>
);

const Toggle = ({ active, onClick }: { active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-12 h-6 rounded-full relative transition-colors ${active ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-700'}`}
  >
    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${active ? 'left-7' : 'left-1'}`}></div>
  </button>
);

export default ProfileScreen;
