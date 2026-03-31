
import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  X, 
  Wallet, 
  Loader2, 
  Check, 
  Eye, 
  RefreshCcw,
  AlertCircle,
  Database,
  FileText,
  Search,
  Trash2,
  Download
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { DepositRequest } from '../types';
import { supabase } from '../services/supabaseClient';
import { useApp } from '../context/AppContext';

interface BalanceRequestScreenProps {
  onBack: () => void;
  areBlocksDark: boolean;
  isBgDark: boolean;
}

const BalanceRequestScreen: React.FC<BalanceRequestScreenProps> = ({ onBack, areBlocksDark, isBgDark }) => {
  const { t, language } = useLanguage();
  const { notifyAdmins } = useApp();
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewingProof, setViewingProof] = useState<DepositRequest | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [approvalAmount, setApprovalAmount] = useState<string>('');

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('balance_requests_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposit_requests' }, () => fetchRequests())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // 1. Buscar Perfis para associar nomes
      const { data: pData } = await supabase.from('profiles').select('id, name, phone');
      setProfiles(pData || []);

      // 2. Buscar Solicitações
      const { data, error } = await supabase
        .from('deposit_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDepositRequests(data || []);
    } catch (err: any) {
      console.error("Erro ao carregar pedidos:", err);
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (request: DepositRequest) => {
    if (isActionLoading) return;
    
    const amountToCredit = Number(approvalAmount);
    if (isNaN(amountToCredit) || amountToCredit <= 0) {
      alert(t('invalid_amount_alert'));
      return;
    }

    setIsActionLoading(true);
    try {
      // 1. Chamar a função RPC para fazer TUDO (Saldo + Histórico) diretamente no banco
      const { error: rpcError } = await supabase.rpc('credit_balance', {
        uid: request.user_id,
        amount: amountToCredit,
        ref_code: request.reference_code || 'S/REF'
      });
      
      if (rpcError) {
        console.error("Erro no RPC:", rpcError);
        // Fallback manual caso o RPC falhe
        const { data: userProfile } = await supabase.from('profiles').select('balance').eq('id', request.user_id).single();
        const newBalance = Number(userProfile?.balance || 0) + amountToCredit;
        await supabase.from('profiles').update({ balance: newBalance }).eq('id', request.user_id);
        
        await supabase.from('transactions').insert([{
          user_id: request.user_id,
          type: 'in',
          category: 'deposit',
          amount: amountToCredit,
          description: `Depósito Aprovado (Ref: ${request.reference_code})`
        }]);
      }

      // 2. Atualizar o estado do pedido para 'approved'
      const { error: rError } = await supabase
        .from('deposit_requests')
        .update({ 
          status: 'approved',
          amount: amountToCredit 
        })
        .eq('id', request.id);
      
      if (rError) throw rError;

      // 2.1. Atualizar Tabela de Faturação (Billing) - Lógica Incremental (Apenas Entrada)
      try {
        // 1. Obter o valor atual da faturação
        const { data: billingData } = await supabase
          .from('billing')
          .select('amount')
          .eq('id', 'total_revenue')
          .single();
        
        const currentTotal = billingData ? Number(billingData.amount) : 0;
        
        // 2. Somar o novo valor ao total existente (Apenas Entrada)
        const newTotal = currentTotal + amountToCredit;
        
        // 3. Atualizar a tabela billing
        await supabase.from('billing').upsert({ 
          id: 'total_revenue', 
          amount: newTotal, 
          updated_at: new Date().toISOString() 
        });
      } catch (billErr) {
        console.warn("Erro ao atualizar faturação incremental:", billErr);
      }

      // 3. Notificar outros administradores
      const user = profiles.find(p => p.id === request.user_id);
      notifyAdmins(
        'Depósito Aprovado',
        `O administrador aprovou um depósito de ${amountToCredit.toLocaleString()} Kz para ${user?.name || 'Usuário'}.`
      );

      setViewingProof(null);
      alert(t('credit_success_alert', { amount: amountToCredit.toLocaleString() }));
      fetchRequests();
    } catch (err: any) {
      console.error("Erro ao processar aprovação:", err);
      alert(t('approval_failed') + err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!confirm(t('reject_confirm'))) return;
    setIsActionLoading(true);
    try {
      const { error } = await supabase.from('deposit_requests').update({ status: 'rejected' }).eq('id', requestId);
      if (error) throw error;

      // Notificar outros administradores
      const request = depositRequests.find(r => r.id === requestId);
      const user = profiles.find(p => p.id === request?.user_id);
      notifyAdmins(
        'Depósito Rejeitado',
        `O administrador rejeitou uma solicitação de depósito de ${user?.name || 'Usuário'}.`
      );

      setViewingProof(null);
      fetchRequests();
    } catch (err: any) {
      alert(t('error') + ": " + err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredRequests = depositRequests.filter(req => {
    const user = profiles.find(p => p.id === req.user_id);
    const search = searchTerm.toLowerCase();
    return (
      user?.name?.toLowerCase().includes(search) ||
      req.reference_code?.toLowerCase().includes(search) ||
      req.amount.toString().includes(search)
    );
  });

  const blockClass = areBlocksDark ? "bg-[#1E293B] border-white/5 text-white" : "bg-white border-gray-100 text-[#1A3A5A]";

  return (
    <div className={`min-h-screen flex flex-col ${isBgDark ? 'bg-[#0F172A]' : 'bg-[#F8FAFC]'} animate-in fade-in duration-500`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 p-6 flex items-center justify-between border-b ${areBlocksDark ? 'bg-[#1E293B]/80 border-white/5 backdrop-blur-md' : 'bg-white/80 border-gray-100 backdrop-blur-md'}`}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-gray-500/10 rounded-2xl hover:bg-[#ED1C24]/10 hover:text-[#ED1C24] transition-all">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight">{t('balance_requests_title')}</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('proof_validation')}</p>
          </div>
        </div>
        <button onClick={fetchRequests} className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg active:scale-95 transition-all">
          <RefreshCcw size={20} className={isLoading ? "animate-spin" : ""} />
        </button>
      </header>

      <main className="p-6 flex-1 max-w-7xl mx-auto w-full">
        {/* Search Bar */}
        <div className="mb-8 relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder={t('search_balance_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-14 pr-6 py-5 rounded-[32px] border outline-none transition-all ${
              areBlocksDark ? 'bg-[#1E293B] border-white/5 text-white focus:border-[#ED1C24]/50' : 'bg-white border-gray-100 focus:border-[#ED1C24]/50'
            }`}
          />
        </div>

        {errorMsg && (
          <div className="mb-8 p-6 bg-[#ED1C24]/10 border border-[#ED1C24]/20 rounded-[32px] flex items-center gap-4 text-[#ED1C24]">
             <AlertCircle size={24} />
             <p className="text-xs font-bold">{errorMsg}</p>
          </div>
        )}

        <div className={`${blockClass} rounded-[40px] border shadow-xl overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-500/5 text-[10px] font-black uppercase text-gray-400">
                <tr>
                  <th className="px-8 py-6">{t('user')}</th>
                  <th className="px-8 py-6">{t('value')}</th>
                  <th className="px-8 py-6">{t('reference')}</th>
                  <th className="px-8 py-6">{t('date')}</th>
                  <th className="px-8 py-6">{t('status')}</th>
                  <th className="px-8 py-6 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-500/10">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-32 text-center">
                      <Loader2 size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('syncing_db')}</p>
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-32 text-center">
                      <Database size={48} className="mx-auto mb-4 opacity-10" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('no_requests_found')}</p>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => {
                    const user = profiles.find(p => p.id === req.user_id);
                    return (
                      <tr key={req.id} className="hover:bg-gray-500/5 transition-colors">
                        <td className="px-8 py-6">
                          <p className="text-sm font-black">{user?.name || t('unknown_user')}</p>
                          <p className="text-[10px] font-bold text-gray-400">{user?.phone || t('no_contact')}</p>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-lg font-black text-blue-600">{Number(req.amount).toLocaleString()} Kz</span>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-[10px] font-mono font-bold bg-gray-500/10 px-2 py-1 rounded-lg">#{req.reference_code || '---'}</span>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-[10px] font-bold text-gray-400">{new Date(req.created_at).toLocaleString(language === 'pt' ? 'pt-AO' : language === 'fr' ? 'fr-FR' : 'en-US')}</p>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`text-[8px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${
                            req.status === 'pending' ? 'bg-orange-500/10 text-orange-500' :
                            req.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-[#ED1C24]/10 text-[#ED1C24]'
                          }`}>
                            {req.status === 'pending' ? t('status_pending') : req.status === 'approved' ? t('status_approved') : t('status_rejected')}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {req.status === 'pending' && (
                              <button 
                                onClick={() => {
                                  setViewingProof(req);
                                  setApprovalAmount(req.amount.toString());
                                }}
                                className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg hover:scale-110 active:scale-90 transition-all"
                                title={t('view_details')}
                              >
                                <Eye size={18} />
                              </button>
                            )}
                            {req.status !== 'pending' && (
                              <button 
                                onClick={async () => {
                                  if (confirm(t('delete_order_desc' as any) || 'Tem certeza que deseja apagar este registo?')) {
                                    const { error } = await supabase.from('deposit_requests').delete().eq('id', req.id);
                                    if (!error) fetchRequests();
                                  }
                                }}
                                className="p-3 text-gray-300 hover:text-[#ED1C24] transition-colors"
                                title={t('delete')}
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal de Prova */}
      {viewingProof && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-6 py-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setViewingProof(null)}></div>
          <div className={`w-full max-w-2xl ${blockClass} rounded-[48px] p-10 shadow-2xl relative border border-white/10 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto no-scrollbar`}>
            <header className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">{t('validate_proof')}</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Ref: #{viewingProof.reference_code}</p>
              </div>
              <button onClick={() => setViewingProof(null)} className="p-3 bg-gray-500/10 rounded-full hover:text-[#ED1C24] transition-colors">
                <X size={24} />
              </button>
            </header>

            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-blue-600/5 rounded-[32px] border border-blue-600/10">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-3">{t('requested_value')}</p>
                  <p className="text-3xl font-black text-blue-600">{Number(viewingProof.amount).toLocaleString()} Kz</p>
                </div>
                
                <div className="p-6 bg-[#ED1C24]/5 rounded-[32px] border border-[#ED1C24]/10">
                  <p className="text-[10px] font-black text-[#ED1C24] uppercase mb-3">{t('credit_value')}</p>
                  <div className="relative">
                    <input 
                      type="number"
                      value={approvalAmount}
                      onChange={(e) => setApprovalAmount(e.target.value)}
                      className={`w-full bg-transparent border-b-2 border-[#ED1C24]/20 focus:border-[#ED1C24] outline-none py-1 text-2xl font-black ${areBlocksDark ? 'text-white' : 'text-[#1A3A5A]'}`}
                    />
                    <span className="absolute right-0 bottom-2 text-xs font-black opacity-30">Kz</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-gray-500/5 rounded-[32px] border border-gray-500/10">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">{t('request_date')}</p>
                  <p className="text-sm font-black">{new Date(viewingProof.created_at).toLocaleDateString(language === 'pt' ? 'pt-AO' : language === 'fr' ? 'fr-FR' : 'en-US')}</p>
                </div>
                <div className="p-6 bg-gray-500/5 rounded-[32px] border border-gray-500/10">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-1">{t('reference')}</p>
                  <p className="text-sm font-black">#{viewingProof.reference_code}</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{t('proof_image')}</p>
                <div className="w-full aspect-video bg-black rounded-[40px] overflow-hidden border border-white/5 relative flex items-center justify-center shadow-inner group">
                  {viewingProof.proof_url ? (
                    <>
                      <img src={viewingProof.proof_url} className="w-full h-full object-contain" alt="Comprovativo" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <button 
                           onClick={() => {
                             const link = document.createElement('a');
                             link.href = viewingProof.proof_url!;
                             link.download = `comprovativo_${viewingProof.reference_code}.jpg`;
                             link.target = '_blank';
                             document.body.appendChild(link);
                             link.click();
                             document.body.removeChild(link);
                           }}
                           className="p-4 bg-white text-gray-900 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all"
                         >
                           <Download size={16} /> Baixar Foto
                         </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-gray-600">
                      <FileText size={64} className="mx-auto mb-4 opacity-10" />
                      <p className="text-xs font-black uppercase tracking-widest">{t('no_image_available')}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <button 
                  onClick={() => handleReject(viewingProof.id)} 
                  disabled={isActionLoading}
                  className="py-6 bg-[#ED1C24]/10 text-[#ED1C24] rounded-[32px] font-black text-xs uppercase tracking-widest hover:bg-[#ED1C24] hover:text-white transition-all active:scale-95"
                >
                  {t('reject_request')}
                </button>
                <button 
                  onClick={() => handleApprove(viewingProof)} 
                  disabled={isActionLoading}
                  className="py-6 bg-green-600 text-white rounded-[32px] font-black text-xs uppercase tracking-widest shadow-xl shadow-green-600/20 hover:bg-green-700 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  {isActionLoading ? <Loader2 className="animate-spin" size={20} /> : <><Check size={20} /> {t('approve_credit')}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BalanceRequestScreen;
