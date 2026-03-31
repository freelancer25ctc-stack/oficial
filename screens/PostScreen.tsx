
import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Image as ImageIcon, 
  Type, 
  Palette, 
  Eye,
  Loader2,
  AlertCircle,
  Check,
  Flame,
  Ticket,
  Truck,
  ShieldCheck,
  Wallet,
  Users,
  Zap
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Banner } from '../types';

interface PostScreenProps {
  onBack: () => void;
  areBlocksDark: boolean;
  isBgDark: boolean;
}

const ICON_OPTIONS = [
  { name: 'Flame', icon: <Flame size={18} /> },
  { name: 'Ticket', icon: <Ticket size={18} /> },
  { name: 'Truck', icon: <Truck size={18} /> },
  { name: 'ShieldCheck', icon: <ShieldCheck size={18} /> },
  { name: 'Wallet', icon: <Wallet size={18} /> },
  { name: 'Users', icon: <Users size={18} /> },
  { name: 'Zap', icon: <Zap size={18} /> }
];

const GRADIENT_OPTIONS = [
  { from: '#1A3A5A', to: '#2C527A', label: 'Azul Noite' },
  { from: '#ED1C24', to: '#E54B4B', label: 'Vermelho Gás' },
  { from: '#10B981', to: '#059669', label: 'Verde Sucesso' },
  { from: '#4F46E5', to: '#4338CA', label: 'Indigo Royal' },
  { from: '#7C3AED', to: '#6D28D9', label: 'Roxo Vip' },
  { from: '#F59E0B', to: '#D97706', label: 'Laranja Promo' },
  { from: '#3B82F6', to: '#2563EB', label: 'Azul Sky' }
];

const PostScreen: React.FC<PostScreenProps> = ({ onBack, areBlocksDark, isBgDark }) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Partial<Banner> | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setEditingBanner(prev => prev ? { ...prev, image_url: base64String } : null);
        setIsUploading(false);
        alert('Imagem processada com sucesso!');
      };
      reader.onerror = () => {
        throw new Error('Erro ao ler o ficheiro.');
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error("Erro ao processar imagem:", error);
      alert('Erro ao processar imagem: ' + (error.message || 'Erro desconhecido.'));
      setIsUploading(false);
    }
  };

  const fetchBanners = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('order_index', { ascending: true });
    
    if (!error && data) {
      setBanners(data);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!editingBanner?.title) return;
    setIsSaving(true);

    const bannerData: any = {
      title: editingBanner.title,
      subtitle: editingBanner.subtitle || '',
      button_text: editingBanner.button_text || 'Pedir agora',
      image_url: editingBanner.image_url || null,
      icon_name: editingBanner.icon_name || 'Flame',
      gradient_from: editingBanner.gradient_from || '#1A3A5A',
      gradient_to: editingBanner.gradient_to || '#2C527A',
      is_active: editingBanner.is_active ?? true,
      order_index: editingBanner.order_index || 0,
      button_link: editingBanner.button_link || null
    };

    try {
      console.log("Tentando salvar banner:", bannerData);
      
      let result;
      if (editingBanner.id) {
        result = await supabase
          .from('banners')
          .update(bannerData)
          .eq('id', editingBanner.id);
      } else {
        result = await supabase
          .from('banners')
          .insert([bannerData]);
      }
      
      if (result.error) {
        console.error("Erro detalhado do Supabase:", result.error);
        throw new Error(`${result.error.message} (Código: ${result.error.code})`);
      }
      
      await fetchBanners();
      setShowForm(false);
      setEditingBanner(null);
      alert("Banner salvo com sucesso!");
    } catch (err: any) {
      console.error("Erro capturado:", err);
      alert("Erro ao salvar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja eliminar este banner?")) return;
    
    const { error } = await supabase
      .from('banners')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setBanners(prev => prev.filter(b => b.id !== id));
    } else {
      alert("Erro ao eliminar: " + error.message);
    }
  };

  const blockClass = areBlocksDark ? "bg-[#1E293B] border-white/5 text-white" : "bg-white border-gray-100 text-[#1A3A5A]";

  return (
    <div className={`min-h-screen flex flex-col transition-all duration-500 ${isBgDark ? 'bg-[#0F172A]' : 'bg-[#F8FAFC]'}`}>
      <header className="px-6 py-8 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-white/10 rounded-2xl shadow-sm active:scale-95 transition-all">
            <ChevronLeft size={20} className={isBgDark ? 'text-white' : 'text-[#1A3A5A]'} />
          </button>
          <div>
            <h2 className={`text-2xl font-black uppercase ${isBgDark ? 'text-white' : 'text-[#1A3A5A]'}`}>Gestão de Banners</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Postagens da Página Inicial</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setEditingBanner({
              title: '',
              subtitle: '',
              button_text: 'Pedir agora',
              icon_name: 'Flame',
              gradient_from: '#1A3A5A',
              gradient_to: '#2C527A',
              is_active: true,
              order_index: banners.length
            });
            setShowForm(true);
          }}
          className="p-4 bg-[#ED1C24] text-white rounded-2xl shadow-lg shadow-[#ED1C24]/20 active:scale-95 transition-all flex items-center gap-2"
        >
          <Plus size={20} />
          <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Novo Banner</span>
        </button>
      </header>

      <main className="flex-1 px-6 pb-20">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-40">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p className="text-[10px] font-black uppercase tracking-widest">Carregando Banners...</p>
          </div>
        ) : banners.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center">
            <ImageIcon size={64} className="mb-4" />
            <p className="text-sm font-black uppercase">Nenhum banner publicado</p>
            <p className="text-xs font-bold mt-2">Clique no botão "+" para criar a sua primeira publicidade.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {banners.map((banner) => (
              <div key={banner.id} className={`${blockClass} rounded-[32px] border overflow-hidden shadow-sm group`}>
                {/* Preview do Banner */}
                <div 
                  className={`h-32 px-8 flex flex-col justify-center text-white relative overflow-hidden`} 
                  style={{ 
                    background: banner.image_url 
                      ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url(${banner.image_url}) center/cover no-repeat` 
                      : `linear-gradient(to bottom right, ${banner.gradient_from}, ${banner.gradient_to})` 
                  }}
                >
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 scale-150">
                    {ICON_OPTIONS.find(i => i.name === banner.icon_name)?.icon || <Flame size={48} />}
                  </div>
                  <div className="relative z-10">
                    <h4 className="text-lg font-black uppercase leading-tight mb-1">{banner.title}</h4>
                    <p className="text-[10px] font-bold text-white/80 line-clamp-1">{banner.subtitle}</p>
                  </div>
                </div>
                
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${banner.is_active ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Ordem: {banner.order_index}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setEditingBanner(banner);
                        setShowForm(true);
                      }}
                      className="p-3 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(banner.id)}
                      className="p-3 bg-[#ED1C24]/10 text-[#ED1C24] rounded-xl hover:bg-[#ED1C24] hover:text-white transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal de Edição/Criação */}
      {showForm && editingBanner && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)}></div>
          <div className={`${blockClass} w-full max-w-xl rounded-[40px] p-8 shadow-2xl relative animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto no-scrollbar`}>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black uppercase tracking-tight">
                {editingBanner.id ? 'Editar Banner' : 'Novo Banner'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-2 bg-gray-500/10 rounded-full text-gray-400 hover:text-[#ED1C24] transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Live Preview */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-gray-500 ml-1">Pré-visualização em Tempo Real</label>
                <div 
                  className="h-32 w-full rounded-[32px] flex flex-col justify-center px-8 text-white relative overflow-hidden shadow-md border border-white/10"
                  style={{ 
                    background: editingBanner.image_url 
                      ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url(${editingBanner.image_url}) center/cover no-repeat` 
                      : `linear-gradient(to bottom right, ${editingBanner.gradient_from}, ${editingBanner.gradient_to})` 
                  }}
                >
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 scale-150">
                    {ICON_OPTIONS.find(i => i.name === editingBanner.icon_name)?.icon || <Flame size={48} />}
                  </div>
                  <div className="relative z-10">
                    <h4 className="text-lg font-black uppercase leading-tight mb-1">{editingBanner.title || 'Título do Banner'}</h4>
                    <p className="text-[10px] font-bold text-white/80 line-clamp-1">{editingBanner.subtitle || 'Subtítulo ou descrição da publicidade'}</p>
                    <div className="mt-2 inline-block px-3 py-1 bg-white text-gray-900 text-[8px] font-black uppercase rounded-lg">
                      {editingBanner.button_text || 'Pedir agora'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload de Imagem */}
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-gray-500 ml-1">Imagem de Fundo (Opcional)</label>
                <div className="flex items-center gap-4">
                  <div className={`relative w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${areBlocksDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                    {editingBanner.image_url ? (
                      <>
                        <img src={editingBanner.image_url} className="w-full h-full object-cover" alt="Preview" />
                        <button 
                          onClick={() => setEditingBanner({...editingBanner, image_url: undefined})}
                          className="absolute top-1 right-1 p-1 bg-[#ED1C24] text-white rounded-full shadow-lg"
                        >
                          <X size={10} />
                        </button>
                      </>
                    ) : (
                      <ImageIcon className="text-gray-300" size={24} />
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="animate-spin text-white" size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 mb-3">Carregue uma imagem ou cole um link direto abaixo.</p>
                    <div className="flex flex-col gap-3">
                      <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer active:scale-95 transition-all">
                        <Plus size={14} /> Escolher Ficheiro
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                      </label>
                      
                      <div className="relative">
                        <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                        <input 
                          type="text"
                          placeholder="Ou cole a URL da imagem aqui..."
                          value={editingBanner.image_url || ''}
                          onChange={(e) => setEditingBanner({...editingBanner, image_url: e.target.value})}
                          className={`w-full pl-9 pr-3 py-2 rounded-xl text-[10px] outline-none border transition-all ${areBlocksDark ? 'bg-white/5 border-white/10 focus:border-blue-500/50' : 'bg-gray-50 border-gray-200 focus:border-blue-500/50'}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Título e Subtítulo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-gray-500 ml-1">Título Principal</label>
                  <div className="relative">
                    <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="text" 
                      value={editingBanner.title}
                      onChange={(e) => setEditingBanner({...editingBanner, title: e.target.value})}
                      placeholder="Ex: Gás acabou?"
                      className={`w-full pl-12 pr-4 py-4 rounded-2xl text-sm outline-none border transition-all ${areBlocksDark ? 'bg-white/5 border-white/5 focus:border-[#ED1C24]/50' : 'bg-gray-50 border-gray-100 focus:border-[#ED1C24]/50'}`}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-gray-500 ml-1">Texto do Botão</label>
                  <input 
                    type="text" 
                    value={editingBanner.button_text}
                    onChange={(e) => setEditingBanner({...editingBanner, button_text: e.target.value})}
                    placeholder="Ex: Pedir agora"
                    className={`w-full px-5 py-4 rounded-2xl text-sm outline-none border transition-all ${areBlocksDark ? 'bg-white/5 border-white/5 focus:border-[#ED1C24]/50' : 'bg-gray-50 border-gray-100 focus:border-[#ED1C24]/50'}`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-gray-500 ml-1">Link do Botão (Opcional)</label>
                <input 
                  type="text" 
                  value={editingBanner.button_link || ''}
                  onChange={(e) => setEditingBanner({...editingBanner, button_link: e.target.value})}
                  placeholder="Ex: https://..."
                  className={`w-full px-5 py-4 rounded-2xl text-sm outline-none border transition-all ${areBlocksDark ? 'bg-white/5 border-white/5 focus:border-[#ED1C24]/50' : 'bg-gray-50 border-gray-100 focus:border-[#ED1C24]/50'}`}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-gray-500 ml-1">Subtítulo / Descrição</label>
                <textarea 
                  value={editingBanner.subtitle}
                  onChange={(e) => setEditingBanner({...editingBanner, subtitle: e.target.value})}
                  placeholder="Descreva a promoção ou aviso..."
                  className={`w-full px-5 py-4 rounded-2xl text-sm outline-none border h-24 transition-all ${areBlocksDark ? 'bg-white/5 border-white/5 focus:border-[#ED1C24]/50' : 'bg-gray-50 border-gray-100 focus:border-[#ED1C24]/50'}`}
                />
              </div>

              {/* Ícone */}
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase text-gray-500 ml-1">Ícone Ilustrativo</label>
                <div className="flex flex-wrap gap-3">
                  {ICON_OPTIONS.map((opt) => (
                    <button 
                      key={opt.name}
                      onClick={() => setEditingBanner({...editingBanner, icon_name: opt.name})}
                      className={`p-4 rounded-2xl border-2 transition-all ${editingBanner.icon_name === opt.name ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-gray-500/5 border-transparent text-gray-400'}`}
                    >
                      {opt.icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gradiente */}
              <div className="space-y-3">
                <label className="text-[9px] font-black uppercase text-gray-500 ml-1">Estilo Visual (Gradiente)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {GRADIENT_OPTIONS.map((opt) => (
                    <button 
                      key={opt.label}
                      onClick={() => setEditingBanner({...editingBanner, gradient_from: opt.from, gradient_to: opt.to})}
                      className={`h-12 rounded-xl border-2 transition-all relative overflow-hidden ${editingBanner.gradient_from === opt.from ? 'border-blue-600 shadow-md' : 'border-transparent'}`}
                      style={{ backgroundImage: `linear-gradient(to bottom right, ${opt.from}, ${opt.to})` }}
                    >
                      {editingBanner.gradient_from === opt.from && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Check size={16} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-500/5 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Eye size={18} className="text-blue-500" />
                  <span className="text-sm font-bold">Banner Ativo</span>
                </div>
                <button 
                  onClick={() => setEditingBanner({...editingBanner, is_active: !editingBanner.is_active})}
                  className={`w-12 h-6 rounded-full relative transition-colors ${editingBanner.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${editingBanner.is_active ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>

              <button 
                onClick={handleSave}
                disabled={isSaving || !editingBanner.title}
                className="w-full py-5 bg-[#ED1C24] text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[#ED1C24]/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {editingBanner.id ? 'Guardar Alterações' : 'Publicar Banner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostScreen;
