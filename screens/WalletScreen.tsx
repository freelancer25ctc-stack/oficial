
import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusCircle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Eye, 
  EyeOff, 
  Zap,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  X,
  Send,
  Loader2,
  CheckCircle2,
  Copy,
  Check,
  Smartphone,
  Info,
  History,
  Clock,
  AlertCircle,
  FileText,
  Upload,
  Image as ImageIcon,
  Banknote,
  Building2,
  ArrowLeft,
  Trash2
} from 'lucide-react';
import { Transaction, DepositRequest } from '../types';
import { supabase } from '../services/supabaseClient';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { sqliteService } from '../services/sqlite';

interface WalletScreenProps {
  balance: number;
  isBalanceVisible: boolean;
  onToggleBalance: () => void;
  onBack?: () => void;
  areBlocksDark: boolean;
  isBgDark: boolean;
  isStandalone?: boolean;
  profile: any;
  onUpdateProfile: (updated: any) => void;
}

const WalletScreen: React.FC<WalletScreenProps> = ({ 
  balance, 
  isBalanceVisible, 
  onToggleBalance, 
  onBack,
  areBlocksDark, 
  isBgDark, 
  profile,
  onUpdateProfile
}) => {
  const { t } = useLanguage();
  const { notifyAdmins, createNotificationForUser } = useApp();
  const [activeModal, setActiveModal] = useState<'deposit' | 'transfer' | 'success' | 'instructions' | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingRequests, setPendingRequests] = useState<DepositRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearType, setClearType] = useState<'transactions' | 'incomplete' | 'single_deposit' | null>(null);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  
  const [depositAmount, setDepositAmount] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [transferTarget, setTransferTarget] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferError, setTransferError] = useState('');

  const blockClass = areBlocksDark ? "bg-[#1E293B] border-white/5 text-white" : "bg-white border-gray-100 text-[#1A3A5A]";
  const subTextClass = areBlocksDark ? "text-slate-400" : "text-gray-500";

  useEffect(() => {
    fetchTransactions();
    fetchPendingRequests();
  }, [profile]);

  const fetchTransactions = async () => {
    if (!profile) return;
    setIsLoading(true);

    // Load from SQLite cache first
    try {
      const cached = await sqliteService.getAllFromTable('transactions');
      const myCached = cached.filter(t => t.user_id === profile.id);
      if (myCached.length > 0) {
        setTransactions(myCached);
      }
    } catch (e) {
      console.warn("Erro ao ler transações do SQLite:", e);
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTransactions(data);
      // Save to SQLite
      try {
        for (const tx of data) {
          await sqliteService.saveData('transactions', tx.id, tx);
        }
      } catch (e) {
        console.warn("Erro ao salvar transações no SQLite:", e);
      }
    }
    setIsLoading(false);
  };

  const fetchPendingRequests = async () => {
    if (!profile) return;
    
    // Load from SQLite cache first
    try {
      const cached = await sqliteService.getAllFromTable('deposit_requests');
      const myCached = cached.filter(r => r.user_id === profile.id);
      if (myCached.length > 0) {
        setPendingRequests(myCached);
      }
    } catch (e) {
      console.warn("Erro ao ler pedidos de depósito do SQLite:", e);
    }

    const { data, error } = await supabase
      .from('deposit_requests')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPendingRequests(data);
      // Save to SQLite
      try {
        for (const req of data) {
          await sqliteService.saveData('deposit_requests', req.id, req);
        }
      } catch (e) {
        console.warn("Erro ao salvar pedidos de depósito no SQLite:", e);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0 || !profile || !selectedFile) {
        alert(t('fill_amount_proof'));
        return;
    }

    setIsActionLoading(true);

    try {
      const proofUrl = filePreview; 

      const { data, error } = await supabase
        .from('deposit_requests')
        .insert([{
          user_id: profile.id,
          amount: amount,
          status: 'pending',
          proof_url: proofUrl,
          reference_code: Math.floor(100000 + Math.random() * 900000).toString()
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Notificar o usuário sobre a solicitação de depósito
      try {
        await createNotificationForUser(
          profile.id,
          t('deposit_request_sent'),
          t('deposit_request_msg', { amount: amount.toLocaleString() }),
          'wallet'
        );
      } catch (notifErr) {
        console.warn("Error notifying user about deposit:", notifErr);
      }
      
      // Notify admins about the new deposit request
      try {
        await notifyAdmins(
          t('new_deposit_request_admin'),
          t('new_deposit_request_admin_msg', { name: profile.name, amount: amount.toLocaleString() }),
          'system'
        );
      } catch (notifErr) {
        console.warn("Error notifying admins:", notifErr);
      }

      fetchPendingRequests();
      setActiveModal('success');
      setDepositAmount('');
      setSelectedFile(null);
      setFilePreview(null);
    } catch (err: any) {
      alert(t('error_sending_deposit', { message: err.message }));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0 || !profile || !transferTarget) return;
    if (amount > balance) {
      setTransferError(t('insufficient_balance_transfer'));
      return;
    }

    setIsActionLoading(true);
    setTransferError('');

    try {
      const { data: recipient, error: findError } = await supabase
        .from('profiles')
        .select('*')
        .or(`phone.eq.${transferTarget},email.eq.${transferTarget}`)
        .single();

      if (findError || !recipient) {
        setTransferError(t('user_not_found'));
        setIsActionLoading(false);
        return;
      }

      if (recipient.id === profile.id) {
        setTransferError(t('cannot_transfer_self'));
        setIsActionLoading(false);
        return;
      }

      const newSenderBalance = balance - amount;
      await supabase.from('profiles').update({ 
        balance: newSenderBalance 
      }).eq('id', profile.id);

      await supabase.from('transactions').insert([{
        user_id: profile.id,
        type: 'out',
        category: 'transfer',
        amount: amount,
        description: t('transfer_to', { name: recipient.name })
      }]);

      const recipientBalance = Number(recipient.balance || 0);
      const newRecipientBalance = recipientBalance + amount;
      await supabase.from('profiles').update({ 
        balance: newRecipientBalance 
      }).eq('id', recipient.id);

      await supabase.from('transactions').insert([{
        user_id: recipient.id,
        type: 'in',
        category: 'transfer',
        amount: amount,
        description: t('received_from', { name: profile.name })
      }]);

      // 2.1. Criar Notificação para o Destinatário
      try {
        await createNotificationForUser(
          recipient.id,
          t('transfer_received_title'),
          t('transfer_received_msg_notif', { amount: amount.toLocaleString(), name: profile.name }),
          'system'
        );
      } catch (notifErr) {
        console.warn("Error notifying recipient of transfer:", notifErr);
      }

      onUpdateProfile({ ...profile, balance: newSenderBalance });
      setActiveModal('success');
      fetchTransactions();
      setTransferAmount('');
      setTransferTarget('');

    } catch (err) {
      setTransferError(t('error_processing_transfer'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleClearTransactions = async () => {
    if (!profile) return;
    
    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', profile.id);

      if (error) throw error;
      setTransactions([]);
      setShowClearConfirm(false);
      setClearType(null);
    } catch (err: any) {
      console.error("Error clearing transactions:", err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleClearIncomplete = async () => {
    if (!profile) return;
    
    setIsActionLoading(true);
    try {
      // Delete both rejected and approved requests (completed ones)
      const { error } = await supabase
        .from('deposit_requests')
        .delete()
        .eq('user_id', profile.id)
        .in('status', ['approved', 'rejected']);

      if (error) throw error;
      fetchPendingRequests();
      setShowClearConfirm(false);
      setClearType(null);
    } catch (err: any) {
      console.error("Error clearing requests:", err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteDepositRequest = async (id: string, status: string) => {
    if (!profile) return;
    
    if (status === 'pending') {
      // Usar um feedback visual em vez de alert se possível, mas por agora mantemos simples
      return;
    }

    setRequestToDelete(id);
    setClearType('single_deposit');
    setShowClearConfirm(true);
  };

  const confirmDeleteSingleRequest = async () => {
    if (!profile || !requestToDelete) return;

    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from('deposit_requests')
        .delete()
        .eq('id', requestToDelete)
        .eq('user_id', profile.id);

      if (error) throw error;
      fetchPendingRequests();
      setShowClearConfirm(false);
      setClearType(null);
      setRequestToDelete(null);
    } catch (err: any) {
      console.error("Error deleting request:", err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className={`animate-in fade-in duration-500 ${isBgDark ? 'bg-[#0F172A]' : 'bg-[#F3F7FA]'} pb-24 relative`}>
      <div className="flex items-center justify-between mb-6 pt-4">
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
            <h2 className={`text-xl font-black uppercase tracking-[0.2em] ${isBgDark || areBlocksDark ? 'text-white' : 'text-[#1A3A5A]'}`}>
              {t('gas_ja_pay')}
            </h2>
            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{t('digital_wallet')}</p>
          </div>
        </div>
      </div>

      <div className="relative block text-center mb-10">
          <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-10 rounded-full"></div>
          <div className="flex flex-col items-center relative z-10">
            <div className={`px-8 py-6 rounded-[40px] ${areBlocksDark ? 'bg-white/5' : 'bg-white'} border ${areBlocksDark ? 'border-white/10' : 'border-gray-100'} shadow-2xl mb-6 flex flex-col items-center`}>
              <div className="flex items-center gap-3 mb-1">
                <h3 className={`text-5xl font-black tracking-tighter ${isBgDark || areBlocksDark ? 'text-white' : 'text-[#1A3A5A]'}`}>
                  {isBalanceVisible ? balance.toLocaleString('pt-AO') : '••••••'}
                </h3>
                <span className="text-lg font-bold opacity-30 mt-2">Kz</span>
              </div>
              <p className="text-[8px] font-black text-blue-500 uppercase tracking-[0.3em] opacity-60">{t('available_balance_label')}</p>
            </div>
            
            <button 
              onClick={onToggleBalance}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-500/10 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-500/20 transition-all"
            >
              {isBalanceVisible ? <><EyeOff size={12} /> {t('hide_balance')}</> : <><Eye size={12} /> {t('show_balance')}</>}
            </button>
          </div>
      </div>

      <div className="space-y-8 flex-1">
        <div className="grid grid-cols-2 gap-4">
           <button 
            onClick={() => setActiveModal('deposit')}
            className="flex flex-col items-center gap-3 p-6 rounded-[32px] bg-blue-600 text-white shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
           >
              <div className="p-3 bg-white/20 rounded-2xl"><PlusCircle size={24} /></div>
              <span className="text-[10px] font-black uppercase tracking-widest">{t('deposit')}</span>
           </button>
           <button 
            onClick={() => setActiveModal('transfer')}
            className={`${blockClass} flex flex-col items-center gap-3 p-6 rounded-[32px] border shadow-sm active:scale-95 transition-all`}
           >
              <div className="p-3 bg-orange-500/10 text-orange-500 rounded-2xl"><Send size={24} /></div>
              <span className="text-[10px] font-black uppercase tracking-widest">{t('transfer')}</span>
           </button>
        </div>

        <button 
          onClick={() => setActiveModal('instructions')}
          className={`w-full p-6 rounded-[32px] border flex items-center justify-between transition-all active:scale-[0.98] ${blockClass} border-blue-500/20 bg-blue-500/5`}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
              <Info size={24} />
            </div>
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-tight">{t('how_to_deposit')}</p>
              <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest">{t('view_recommendations')}</p>
            </div>
          </div>
          <ArrowRight size={20} className="text-blue-500" />
        </button>

        <div className="space-y-4">
          {pendingRequests.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                 <Clock size={16} className="text-orange-500" />
                 <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${subTextClass}`}>{t('deposit_requests_label')}</h4>
              </div>
              <div className="space-y-2">
                {pendingRequests.map((req) => (
                  <div key={req.id} className={`${blockClass} rounded-[24px] p-4 border flex items-center justify-between transition-all group`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        req.status === 'pending' ? 'bg-orange-500/10 text-orange-500' :
                        req.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-[#ED1C24]/10 text-[#ED1C24]'
                      }`}>
                        <Banknote size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-black">{t('deposit_label', { amount: req.amount.toLocaleString('pt-AO') })}</p>
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">
                          {req.status === 'pending' ? t('status_pending') : req.status === 'approved' ? t('status_approved') : t('status_rejected')} • {new Date(req.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {req.status === 'rejected' && (
                        <span className="text-[8px] font-black text-[#ED1C24] uppercase px-2 py-1 bg-[#ED1C24]/10 rounded-lg">{t('status_rejected')}</span>
                      )}
                      {req.status !== 'pending' && (
                        <button 
                          onClick={() => handleDeleteDepositRequest(req.id, req.status)}
                          className="p-2 text-[#ED1C24] hover:bg-[#ED1C24]/10 rounded-xl transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-2">
               <History size={16} className="text-gray-400" />
               <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${subTextClass}`}>{t('transaction_history')}</h4>
            </div>
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => { setClearType('transactions'); setShowClearConfirm(true); }}
                disabled={isActionLoading}
                className={`flex items-center gap-1 text-[8px] font-black text-[#ED1C24] uppercase tracking-widest hover:underline ${isActionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Trash2 size={12} />
                {t('clear_transactions_history')}
              </button>
              <button 
                type="button"
                onClick={() => { setClearType('incomplete'); setShowClearConfirm(true); }}
                disabled={isActionLoading}
                className={`flex items-center gap-1 text-[8px] font-black text-orange-500 uppercase tracking-widest hover:underline border-l border-gray-200 dark:border-white/10 pl-3 ${isActionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {t('clear_incomplete')}
              </button>
              {isActionLoading && <Loader2 className="animate-spin text-blue-500" size={14} />}
            </div>
          </div>

          <div className="space-y-2 pb-10">
            {transactions.length === 0 ? (
              <div className="text-center py-10 opacity-20">
                 <Zap size={40} className="mx-auto mb-2" />
                 <p className="text-[10px] font-black uppercase">{t('no_transactions')}</p>
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className={`${blockClass} rounded-[24px] p-4 border flex items-center justify-between transition-all hover:border-blue-500/20`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      tx.type === 'in' ? 'bg-green-500/10 text-green-500' : 'bg-[#ED1C24]/10 text-[#ED1C24]'
                    }`}>
                      {tx.category === 'deposit' ? <ArrowDownLeft size={18} /> : 
                       tx.category === 'transfer' ? (tx.type === 'in' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />) : 
                       <ArrowUpRight size={18} />}
                    </div>
                    <div>
                      <p className="text-xs font-black">{tx.description}</p>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">{new Date(tx.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-black ${tx.type === 'in' ? 'text-green-500' : 'text-[#ED1C24]'}`}>
                    {tx.type === 'in' ? '+' : '-'} {tx.amount.toLocaleString('pt-AO')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {activeModal === 'instructions' && (
        <Modal title={t('deposit_guide')} onClose={() => setActiveModal(null)} areBlocksDark={areBlocksDark}>
          <div className="space-y-6 pb-20">
            <div className={`p-6 rounded-[32px] space-y-6 border ${areBlocksDark ? 'bg-slate-800/50 border-white/5' : 'bg-blue-50/50 border-blue-100'}`}>
              <div>
                <h4 className="text-[11px] font-black uppercase text-blue-600 mb-4 flex items-center gap-2">
                  <ShieldCheck size={16} /> {t('important_recommendations')}
                </h4>
                <ul className="space-y-3">
                  {[
                    t('rec_1'),
                    t('rec_2'),
                    t('rec_3'),
                    t('rec_4'),
                    t('rec_5'),
                    t('rec_6'),
                    t('rec_7'),
                    t('rec_8'),
                    t('rec_9')
                  ].map((text, i) => (
                    <li key={i} className="flex gap-3 text-[11px] font-bold text-gray-600 dark:text-slate-300 leading-tight">
                      <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 text-[10px] font-black">
                        {i + 1}
                      </div>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6 border-t border-gray-200 dark:border-white/5 space-y-5">
                 <h4 className="text-[11px] font-black uppercase text-[#1A3A5A] dark:text-white flex items-center gap-2">
                   <Banknote size={16} className="text-green-500" /> {t('bank_coordinates')}
                 </h4>
                 
                 <div className="space-y-4">
                     <div className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                      <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400">
                            <Smartphone size={14} /> {t('unitel_money_express')}
                         </div>
                         <button onClick={() => {
                           navigator.clipboard.writeText('928311914');
                           alert(t('number_copied'));
                         }} className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><Copy size={12} /></button>
                      </div>
                      <p className="text-xl font-black tracking-tight">928 311 914</p>
                    </div>

                    <div className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                       <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400">
                             <Building2 size={14} /> {t('iban_atlantico')}
                          </div>
                          <button onClick={() => {
                            navigator.clipboard.writeText('005500001335816910189');
                            alert(t('iban_copied'));
                          }} className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><Copy size={12} /></button>
                       </div>
                       <p className="text-sm font-black tracking-tight break-all">0055 0000 1335 8169 1018 9</p>
                    </div>

                    <div className="p-4 bg-green-500/5 rounded-2xl border border-green-500/10">
                       <div className="flex items-center gap-2 text-[10px] font-black uppercase text-green-600 mb-1">
                          <CheckCircle2 size={14} /> {t('account_holder')}
                       </div>
                       <p className="text-[11px] font-black uppercase">{t('holder_name')}</p>
                    </div>
                 </div>
              </div>

              <div className="pt-4 text-center">
                 <p className="text-[12px] font-black text-blue-600 italic">{t('charge_account_tip')}</p>
              </div>
            </div>

            <button 
              onClick={() => {
                setActiveModal('deposit');
              }}
              className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-3"
            >
              <PlusCircle size={20} /> {t('go_to_deposit')}
            </button>
          </div>
        </Modal>
      )}

      {activeModal === 'deposit' && (
        <Modal title={t('send_deposit')} onClose={() => { setActiveModal(null); setDepositAmount(''); setSelectedFile(null); setFilePreview(null); }} areBlocksDark={areBlocksDark}>
          <div className="space-y-6 pb-20">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-gray-500 ml-1">{t('deposit_amount')}</label>
              <input 
                type="number" 
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0"
                className={`w-full rounded-2xl px-6 py-4 text-xl font-black outline-none border transition-all ${
                  areBlocksDark ? 'bg-white/5 border-white/5 text-white focus:border-blue-500/50' : 'bg-gray-50 border-gray-100 text-gray-800 focus:border-blue-500/50'
                }`}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-gray-500 ml-1">{t('your_number_auto')}</label>
              <div className={`w-full rounded-2xl px-6 py-4 text-sm font-bold border ${areBlocksDark ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-gray-100 border-gray-100 text-gray-400'}`}>
                {profile.phone || t('na')}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-gray-500 ml-1">{t('upload_proof')}</label>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".jpg,.jpeg,.png,.pdf" 
                onChange={handleFileChange} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className={`w-full py-10 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all ${
                  selectedFile ? 'border-green-500/50 bg-green-500/5' : 'border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/5'
                }`}
              >
                {selectedFile ? (
                  <>
                    {filePreview && selectedFile.type.startsWith('image/') ? (
                      <img src={filePreview} className="w-16 h-16 rounded-lg object-cover mb-1" alt="Preview" />
                    ) : (
                      <div className="p-3 bg-green-500 text-white rounded-xl"><FileText size={24} /></div>
                    )}
                    <span className="text-[10px] font-black text-green-600 uppercase text-center px-4">{t('selected_file')}: {selectedFile.name.slice(0, 15)}...</span>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-blue-500/10 text-blue-500 rounded-2xl"><Upload size={24} /></div>
                    <span className="text-[10px] font-black text-gray-400 uppercase">{t('click_to_attach')}</span>
                  </>
                )}
              </button>
            </div>

            <button 
              onClick={handleSendDeposit}
              disabled={isActionLoading || !depositAmount || !selectedFile}
              className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
            >
              {isActionLoading ? <Loader2 className="animate-spin" /> : t('deposit')}
            </button>

            <div className={`p-6 rounded-[32px] space-y-4 border ${areBlocksDark ? 'bg-slate-800/50 border-white/5' : 'bg-blue-50/50 border-blue-100'}`}>
              <div>
                <h4 className="text-[10px] font-black uppercase text-blue-600 mb-3 flex items-center gap-2">
                  <Info size={14} /> {t('how_to_make_deposit')}
                </h4>
                <ul className="space-y-2">
                  {[
                    t('dep_step_1'),
                    t('dep_step_2'),
                    t('dep_step_3'),
                    t('dep_step_4'),
                    t('dep_step_5'),
                    t('dep_step_6'),
                    t('dep_step_7')
                  ].map((text, i) => (
                    <li key={i} className="flex gap-2 text-[10px] font-medium text-gray-500 dark:text-slate-400 leading-tight">
                      <span className="text-blue-500">•</span> {text}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-white/5 space-y-4">
                 <h4 className="text-[10px] font-black uppercase text-[#1A3A5A] dark:text-white">{t('deposit_coordinates')}</h4>
                 
                 <div className="space-y-3">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2 text-xs font-bold">
                          <Smartphone size={14} className="text-gray-400" />
                          <span className="text-gray-400">{t('express_label')}:</span>
                          <span>928 311 914</span>
                       </div>
                       <button onClick={() => navigator.clipboard.writeText('928311914')} className="text-blue-500"><Copy size={12} /></button>
                    </div>

                    <div className="flex flex-col gap-1">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold">
                             <Building2 size={14} className="text-gray-400" />
                             <span className="text-gray-400">{t('iban_label')}:</span>
                          </div>
                          <button onClick={() => navigator.clipboard.writeText('005500001335816910189')} className="text-blue-500"><Copy size={12} /></button>
                       </div>
                       <p className="text-[11px] font-black tracking-tight bg-gray-100 dark:bg-white/5 p-2 rounded-xl text-center">0055 0000 1335 8169 1018 9</p>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold">
                       <CheckCircle2 size={14} className="text-green-500" />
                       <span className="text-gray-400">{t('name_label')}:</span>
                       <span className="text-[10px]">{t('holder_name')}</span>
                    </div>
                 </div>
              </div>

              <div className="pt-2">
                 <p className="text-[11px] font-black text-center text-blue-600/60 italic">{t('make_deposit_tip')}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {activeModal === 'transfer' && (
        <Modal title={t('transfer_title')} onClose={() => { setActiveModal(null); setTransferError(''); }} areBlocksDark={areBlocksDark}>
           <div className="space-y-6 pb-20">
              <div className="space-y-2">
                 <label className="text-[9px] font-black uppercase text-gray-500 ml-1">{t('recipient')}</label>
                 <div className="relative">
                    <Smartphone size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      value={transferTarget}
                      onChange={(e) => setTransferTarget(e.target.value)}
                      placeholder={t('recipient_placeholder')}
                      className={`w-full rounded-2xl pl-14 pr-6 py-4 text-sm font-bold outline-none border transition-all ${
                        areBlocksDark ? 'bg-white/5 border-white/5 text-white focus:border-orange-500/50' : 'bg-gray-50 border-gray-100 text-gray-700 focus:border-orange-500/50'
                      }`}
                    />
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[9px] font-black uppercase text-gray-500 ml-1">{t('amount_to_send')}</label>
                 <input 
                    type="number" 
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0"
                    className={`w-full rounded-2xl px-6 py-4 text-xl font-black outline-none border transition-all ${
                      areBlocksDark ? 'bg-white/5 border-white/5 text-white focus:border-orange-500/50' : 'bg-gray-50 border-gray-100 text-gray-800 focus:border-orange-500/50'
                    }`}
                 />
              </div>

              {transferError && (
                <div className="p-4 bg-[#ED1C24]/10 border border-[#ED1C24]/20 rounded-2xl flex items-center gap-3">
                   <AlertCircle className="text-[#ED1C24]" size={16} />
                   <p className="text-[10px] text-[#ED1C24] font-black uppercase">{transferError}</p>
                </div>
              )}

              <button 
                onClick={handleTransfer}
                disabled={isActionLoading || !transferTarget || !transferAmount}
                className="w-full bg-orange-600 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-orange-500/20 active:scale-95 flex items-center justify-center gap-3"
              >
                {isActionLoading ? <Loader2 className="animate-spin" /> : <><Send size={18} /> {t('confirm_send')}</>}
              </button>
           </div>
        </Modal>
      )}

      {activeModal === 'success' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-6 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
           <div className={`w-full max-w-sm ${areBlocksDark ? 'bg-[#1E293B]' : 'bg-white'} rounded-[48px] p-10 text-center shadow-2xl relative animate-in zoom-in-95 duration-300`}>
              <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                 <CheckCircle2 size={48} />
              </div>
              <h2 className="text-2xl font-black leading-none mb-2">{t('order_sent')}</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8">{t('deposit_under_review')}</p>
              <button 
                onClick={() => setActiveModal(null)}
                className="w-full py-4 bg-[#1A3A5A] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg"
              >
                 {t('understood')}
              </button>
           </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowClearConfirm(false)}></div>
          <div className={`w-full max-w-sm ${areBlocksDark ? 'bg-[#1E293B]' : 'bg-white'} rounded-[48px] p-10 text-center shadow-2xl relative animate-in zoom-in-95 duration-300 border ${areBlocksDark ? 'border-white/10' : 'border-gray-100'}`}>
            <div className="w-20 h-20 bg-[#ED1C24]/10 text-[#ED1C24] rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={40} />
            </div>
            <h2 className={`text-xl font-black leading-tight mb-4 uppercase tracking-tight ${areBlocksDark ? 'text-white' : 'text-[#1A3A5A]'}`}>
              {clearType === 'transactions' ? t('clear_transactions_history') : 
               clearType === 'incomplete' ? t('clear_incomplete') : 
               t('delete_request')}
            </h2>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-10 leading-relaxed">
              {clearType === 'transactions' ? t('clear_transactions_confirm') : 
               clearType === 'incomplete' ? t('clear_incomplete_confirm') : 
               t('delete_request_confirm')}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => {
                  setShowClearConfirm(false);
                  setClearType(null);
                  setRequestToDelete(null);
                }}
                className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border ${areBlocksDark ? 'border-white/10 text-white' : 'border-gray-100 text-gray-400'}`}
              >
                {t('cancel')}
              </button>
              <button 
                onClick={() => {
                  if (clearType === 'transactions') handleClearTransactions();
                  else if (clearType === 'incomplete') handleClearIncomplete();
                  else if (clearType === 'single_deposit') confirmDeleteSingleRequest();
                }}
                disabled={isActionLoading}
                className="py-4 bg-[#ED1C24] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#ED1C24]/20 flex items-center justify-center gap-2"
              >
                {isActionLoading ? <Loader2 className="animate-spin" size={14} /> : t('clear_btn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Modal = ({ title, children, onClose, areBlocksDark }: any) => (
  <div className="fixed inset-0 z-[150] flex items-end justify-center px-4 pb-4 animate-in fade-in duration-300">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
    <div className={`w-full max-w-md ${areBlocksDark ? 'bg-[#1A2536]' : 'bg-white'} rounded-t-[40px] rounded-b-[20px] p-8 pb-10 shadow-2xl relative animate-in slide-in-from-bottom-full duration-300 flex flex-col max-h-[92vh]`}>
      {/* Handle for Bottom Sheet */}
      <div className="w-12 h-1.5 bg-gray-300 dark:bg-white/10 rounded-full mx-auto mb-6 shrink-0"></div>
      
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h2 className={`text-xl font-black ${areBlocksDark ? 'text-white' : 'text-[#1A3A5A]'}`}>{title}</h2>
          <div className="w-8 h-1 bg-blue-500 rounded-full mt-1"></div>
        </div>
        <button onClick={onClose} className="p-2 bg-gray-500/10 rounded-full text-gray-400 hover:text-[#ED1C24] transition-colors">
          <X size={20} />
        </button>
      </div>
      
      <div className="overflow-y-auto no-scrollbar flex-1 -mx-2 px-2 pb-10">
        {children}
      </div>
    </div>
  </div>
);

export default WalletScreen;
