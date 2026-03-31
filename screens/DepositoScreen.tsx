
import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Minus, 
  Power, 
  Store, 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  ChevronLeft, 
  Settings, 
  TrendingUp, 
  AlertCircle, 
  Loader2, 
  RefreshCcw,
  MapPin,
  Camera,
  Target,
  Save,
  Bell,
  Navigation,
  Map as MapIcon,
  Info,
  Banknote,
  ChevronRight,
  Calendar,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Database,
  XCircle,
  Printer,
  User,
  Phone,
  Search,
  ShieldCheck,
  Upload,
  Globe,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../i18n/translations';
import { Depot, Order, Product, OrderStatus, OrderType, AppNotification, AppTab } from '../types';
import { supabase } from '../services/supabaseClient';
import { useApp } from '../context/AppContext';
import { useOrders } from '../context/OrderContext';
import { calculateReservationFee } from '../constants';
import { sqliteService } from '../services/sqlite';

interface DepositoScreenProps {
  profile: any;
  onUpdateProfile: (updated: any) => void;
  onBack: () => void;
  onLogout: () => void;
  onNavigateToPortal: () => void;
  onNavigateToProfile: () => void;
  areBlocksDark: boolean;
  isBgDark: boolean;
}

const BOTTLE_TYPES_METADATA = (t: any) => [
  { id: '12kg', label: t('bottle_normal'), image: 'https://gasinsp.pt/wp-content/uploads/2018/09/bottle_site.jpg' },
  { id: 'levita', label: t('bottle_light'), image: 'https://dxm.content-center.totalenergies.com/api/wedia/dam/transform/xysh7dg731tahrciai1e4eisxo/levita-mini.webp?t=resize&width=691&height=387' },
  { id: '5kg', label: t('bottle_small'), image: 'https://www.galaxcommerce.com.br/sistema/upload/3200/produtos/botijAo-de-gAs-p05_2021-12-28_16-36-10_1_418.jpg' },
  { id: '35kg', label: t('bottle_industrial'), image: 'https://www.rcgas.pt/wp-content/uploads/2016/06/PL35kg.jpg' },
];

const dayToKey: Record<string, string> = {
  'Segunda': 'monday',
  'Terça': 'tuesday',
  'Quarta': 'wednesday',
  'Quinta': 'thursday',
  'Sexta': 'friday',
  'Sábado': 'saturday',
  'Domingo': 'sunday'
};

const DepositoScreen: React.FC<DepositoScreenProps> = ({ profile, onUpdateProfile, onBack, onLogout, onNavigateToPortal, onNavigateToProfile, areBlocksDark, isBgDark }) => {
  const { t, language, setLanguage } = useLanguage();
  const { 
    notifications, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    deleteAllNotifications, 
    createNotification,
    createNotificationForUser,
    notifyAdmins,
    playNotificationSound,
    stopNotificationSound,
    isNotificationsOpen,
    setIsNotificationsOpen,
    depositoView,
    setDepositoView,
    setActiveTab
  } = useApp();
  const { orders: allOrders, refreshOrders } = useOrders();
  const [depot, setDepot] = useState<Depot | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [dbTotalRevenue, setDbTotalRevenue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default closed on mobile
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);
  const processedOrdersRef = useRef<Set<string>>(new Set());

  const userDepotId = profile?.depot_id || profile?.depotId;
  const orders = allOrders.filter(o => o.depot_id === userDepotId || o.depotId === userDepotId);

  const pendingReservationsCount = orders.filter(o => 
    ((o as any).order_type === OrderType.PICKUP || o.orderType === OrderType.PICKUP) && 
    o.status === OrderStatus.PENDING
  ).length;

  useEffect(() => {
    if (pendingReservationsCount > 0) {
      playNotificationSound();
    } else {
      stopNotificationSound();
    }
  }, [pendingReservationsCount, playNotificationSound, stopNotificationSound]);

  const isPendingReservationNotification = (notification: AppNotification) => {
    if (notification.type !== 'order') return false;
    const msg = notification.message.toLowerCase();
    const isReservation = msg.includes('reserva') || msg.includes('pickup') || msg.includes('pedido');
    return isReservation && pendingReservationsCount > 0;
  };

  // Close popovers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (languageRef.current && !languageRef.current.contains(event.target as Node)) {
        setIsLanguageOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Estado para dados comerciais
  const [editData, setEditData] = useState({
    name: '',
    phone: '',
    imageUrl: '',
    price: 1200,
    category: 'Económico' as 'Premium' | 'Express' | 'Económico',
    openingHours: '08:00 - 18:00',
    horarioAbertura: '08:00',
    horarioFecho: '18:00',
    diasDeAbertura: 'Segunda',
    diasDeFecho: 'Sexta',
    workingDays: 'Segunda a Sexta',
    pickupTime: '20-40 min'
  });

  // Estado para localização
  const [locationForm, setLocationForm] = useState({
    id: '',
    address_text: '',
    latitude: 0,
    longitude: 0,
    label: 'Depósito'
  });

  useEffect(() => {
    if (!profile) return;
    const userDepotId = profile.depot_id || profile.depotId;
    
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        
        // 1. Try loading from SQLite first for offline support
        if (userDepotId) {
          const cachedDepot = await sqliteService.getData('depots', userDepotId);
          if (cachedDepot) {
            setDepot(cachedDepot);
            setEditData({
              name: cachedDepot.name,
              phone: cachedDepot.phone,
              imageUrl: cachedDepot.imageUrl,
              price: cachedDepot.price,
              category: cachedDepot.category || 'Económico',
              openingHours: cachedDepot.openingHours || '08:00 - 18:00',
              horarioAbertura: cachedDepot.horarioAbertura || '08:00',
              horarioFecho: cachedDepot.horarioFecho || '18:00',
              diasDeAbertura: cachedDepot.diasDeAbertura || 'Segunda',
              diasDeFecho: cachedDepot.diasDeFecho || 'Sexta',
              workingDays: cachedDepot.workingDays || 'Segunda a Sexta',
              pickupTime: cachedDepot.pickupTime || '20-40 min'
            });
            setLocationForm(prev => ({
              ...prev,
              address_text: cachedDepot.address || '',
              latitude: cachedDepot.latitude || 0,
              longitude: cachedDepot.longitude || 0
            }));
          }

          const cachedProducts = await sqliteService.getAllFromTable('products');
          const myCachedProducts = cachedProducts.filter(p => p.depot_id === userDepotId);
          if (myCachedProducts.length > 0) {
            setProducts(myCachedProducts);
          }

          const cachedBilling = await sqliteService.getData('billing', userDepotId);
          if (cachedBilling) {
            setDbTotalRevenue(cachedBilling.amount || 0);
          }
        }

        if (userDepotId) {
          // 2. Dados do Depósito from Supabase
          const { data: depotData } = await supabase.from('depots').select('*').eq('id', userDepotId).single();
          if (depotData) {
            const depotObj: Depot = {
              id: depotData.id,
              name: depotData.name,
              address: depotData.address,
              price: depotData.price,
              stock: depotData.stock,
              isOpen: depotData.is_open,
              latitude: depotData.latitude,
              longitude: depotData.longitude,
              imageUrl: depotData.image_url || '',
              phone: depotData.phone,
              category: depotData.category || 'Económico',
              rating: depotData.rating || 4.5,
              openingHours: depotData.opening_hours || (depotData.horario_abertura && depotData.horario_fecho ? `${depotData.horario_abertura} - ${depotData.horario_fecho}` : '08:00 - 18:00'),
              horarioAbertura: depotData.horario_abertura || '08:00',
              horarioFecho: depotData.horario_fecho || '18:00',
              diasDeAbertura: depotData.dias_de_abertura || 'Segunda',
              diasDeFecho: depotData.dias_de_fecho || 'Sexta',
              workingDays: depotData.working_days || 'Segunda a Sexta',
              pickupTime: depotData.delivery_time || '20-40 min',
              isVerified: !!depotData.is_verified,
              distance: '0km'
            };
            setDepot(depotObj);
            await sqliteService.saveData('depots', depotObj.id, depotObj);

            setEditData({
              name: depotObj.name,
              phone: depotObj.phone,
              imageUrl: depotObj.imageUrl,
              price: depotObj.price,
              category: depotObj.category || 'Económico',
              openingHours: depotObj.openingHours || '08:00 - 18:00',
              horarioAbertura: depotObj.horarioAbertura || '08:00',
              horarioFecho: depotObj.horarioFecho || '18:00',
              diasDeAbertura: depotObj.diasDeAbertura || 'Segunda',
              diasDeFecho: depotObj.diasDeFecho || 'Sexta',
              workingDays: depotObj.workingDays || 'Segunda a Sexta',
              pickupTime: depotObj.pickupTime || '20-40 min'
            });
            // Fallback para localização se não houver na tabela addresses
            setLocationForm(prev => ({
              ...prev,
              address_text: depotObj.address || '',
              latitude: depotObj.latitude || 0,
              longitude: depotObj.longitude || 0
            }));
          }

          // 3. Produtos (Configuração de botijas)
          const { data: productsData } = await supabase.from('products').select('*').eq('depot_id', userDepotId);
          if (productsData) {
            setProducts(productsData);
            for (const p of productsData) {
              await sqliteService.saveData('products', p.id, p);
            }
          }

          // 4. Faturação Total da Tabela Total_Billing (Registo Único por Depósito)
          const { data: billingData } = await supabase
            .from('Total_Billing')
            .select('amount')
            .eq('depot_id', userDepotId)
            .maybeSingle();
          
          if (billingData) {
            setDbTotalRevenue(billingData.amount || 0);
            await sqliteService.saveData('billing', userDepotId, { amount: billingData.amount || 0 });
          } else {
            // Se não existir na tabela, calcula a partir dos pedidos entregues atuais como base inicial
            const initialTotal = (orders as any[] || [])
              .filter(o => o.status === OrderStatus.DELIVERED)
              .reduce((acc, o) => acc + Number(o.total || o.total_price || o.totalPrice || 0), 0);
            
            if (initialTotal > 0) {
              await supabase.from('Total_Billing').insert([{
                depot_id: userDepotId,
                amount: initialTotal
              }]);
              setDbTotalRevenue(initialTotal);
              await sqliteService.saveData('billing', userDepotId, { amount: initialTotal });
            }
          }
        }

        // 5. Endereço
        const { data: addrData } = await supabase.from('addresses').select('*').eq('user_id', profile.id).eq('label', 'Depósito').maybeSingle();
        if (addrData) {
          setLocationForm({
            id: addrData.id,
            address_text: addrData.address_text,
            latitude: addrData.latitude || 0,
            longitude: addrData.longitude || 0,
            label: addrData.label
          });
        }
      } catch (err) {
        console.error("Erro na sincronização:", err);
        alert(t('unexpected_error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [profile]);

  // Efeito para sincronizar o stock total dos produtos com o stock do depósito na tabela 'depots'
  useEffect(() => {
    if (!depot || products.length === 0) return;
    
    const activeProducts = products.filter(p => p.is_active);
    const calculatedTotalStock = activeProducts.reduce((acc, p) => acc + p.stock, 0);
    
    // Só atualizamos se o valor calculado for diferente do valor atual no estado do depósito
    if (calculatedTotalStock !== depot.stock) {
      const syncStock = async () => {
        try {
          const { error } = await supabase
            .from('depots')
            .update({ stock: calculatedTotalStock })
            .eq('id', depot.id);
            
          if (!error) {
            setDepot(prev => prev ? { ...prev, stock: calculatedTotalStock } : null);
            console.log("Stock do depósito sincronizado com sucesso:", calculatedTotalStock);
          }
        } catch (err) {
          console.error("Erro ao sincronizar stock do depósito:", err);
        }
      };
      
      syncStock();
    }
  }, [products, depot?.id, depot?.stock]);

  const handleToggleProduct = async (typeId: string) => {
    if (!depot) return;
    setIsUpdating(true);
    
    const existing = products.find(p => p.bottle_type === typeId);
    
    if (existing) {
      const nextState = !existing.is_active;
      const { error } = await supabase.from('products').update({ is_active: nextState }).eq('id', existing.id);
      if (!error) setProducts(prev => prev.map(p => p.id === existing.id ? { ...p, is_active: nextState } : p));
    } else {
      const { data, error } = await supabase.from('products').insert([{
        depot_id: depot.id,
        bottle_type: typeId,
        price: editData.price, // Preço padrão da loja
        stock: 10, // Stock inicial padrão
        is_active: true
      }]).select().single();
      if (!error && data) setProducts([...products, data]);
    }
    setIsUpdating(false);
  };

  const handleUpdateProductPrice = async (productId: string, newPrice: number) => {
    setIsUpdating(true);
    const { error } = await supabase.from('products').update({ price: newPrice }).eq('id', productId);
    if (!error) setProducts(prev => prev.map(p => p.id === productId ? { ...p, price: newPrice } : p));
    setIsUpdating(false);
  };

  const handleUpdateProductStock = async (productId: string, newStock: number) => {
    setIsUpdating(true);
    const val = Math.max(0, newStock);
    const { error } = await supabase.from('products').update({ stock: val }).eq('id', productId);
    if (!error) setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: val } : p));
    setIsUpdating(false);
  };

  const handleToggleStatus = async () => {
    if (!depot) return;
    setIsUpdating(true);
    const nextStatus = !depot.isOpen;
    const { error } = await supabase.from('depots').update({ is_open: nextStatus }).eq('id', depot.id);
    if (!error) setDepot({ ...depot, isOpen: nextStatus });
    setIsUpdating(false);
  };

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    setIsUpdating(true);
    try {
      // 1. Buscar detalhes do pedido para saber o tipo de botija e quantidade
      const { data: orderData, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      // Evitar processamento duplicado se já estiver no status pretendido
      if (orderData.status === nextStatus) {
        setIsUpdating(false);
        return;
      }

      // 2. Atualizar o status do pedido
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // 2.1. Criar Notificação para o Cliente
      try {
        const statusMessages: Record<string, string> = {
          [OrderStatus.CONFIRMED]: t('order_confirmed_msg' as any) || "O seu pedido foi confirmado pelo depósito.",
          [OrderStatus.OUT_FOR_DELIVERY]: t('order_out_for_delivery_msg' as any) || "A sua botija está pronta para levantamento!",
          [OrderStatus.DELIVERED]: t('order_delivered_msg' as any) || "O seu pedido foi entregue com sucesso.",
          [OrderStatus.CANCELLED]: t('order_cancelled_msg' as any) || "O seu pedido foi cancelado pelo depósito.",
          [OrderStatus.READY_FOR_PICKUP]: t('order_ready_pickup_msg' as any) || "A sua botija está pronta para levantamento!"
        };

        const statusLabels: Record<string, string> = {
          [OrderStatus.CONFIRMED]: t('status_confirmed'),
          [OrderStatus.OUT_FOR_DELIVERY]: t('status_out_for_delivery'),
          [OrderStatus.DELIVERED]: t('status_delivered'),
          [OrderStatus.CANCELLED]: t('status_cancelled'),
          [OrderStatus.READY_FOR_PICKUP]: t('status_ready_for_pickup')
        };

        await createNotificationForUser(
          orderData.user_id,
          (t('order_status_update' as any) || 'Pedido {status}').replace('{status}', statusLabels[nextStatus] || nextStatus),
          statusMessages[nextStatus] || (t('order_status_update' as any) || `O status do seu pedido foi atualizado para {status}.`).replace('{status}', statusLabels[nextStatus] || nextStatus),
          'order'
        );
      } catch (notifErr) {
        console.warn("Erro ao enviar notificação ao cliente:", notifErr);
      }

      // 2.2. Notificar Administradores sobre a mudança de status
      try {
        const statusLabels: Record<string, string> = {
          [OrderStatus.CONFIRMED]: t('status_confirmed'),
          [OrderStatus.OUT_FOR_DELIVERY]: t('status_out_for_delivery'),
          [OrderStatus.DELIVERED]: t('status_delivered'),
          [OrderStatus.CANCELLED]: t('status_cancelled'),
          [OrderStatus.READY_FOR_PICKUP]: t('status_ready_for_pickup')
        };
        
        notifyAdmins(
          'Status de Pedido Alterado',
          `O depósito ${depot?.name || 'Desconhecido'} alterou o status do pedido #${orderId.slice(0, 8)} para ${statusLabels[nextStatus] || nextStatus}.`
        );
      } catch (adminNotifErr) {
        console.warn("Erro ao notificar administradores:", adminNotifErr);
      }

      // 3. Lógica de Stock: Diminuir apenas quando o vendedor CONFIRMA o pedido
      if (nextStatus === OrderStatus.CONFIRMED) {
        let bottleType = orderData.bottle_type;
        const quantity = orderData.quantity || 1;
        const depotId = orderData.depot_id;

        console.log("--- DEBUG STOCK ---");
        console.log("Pedido ID:", orderId);
        console.log("Tipo Botija Original:", bottleType);
        console.log("Quantidade:", quantity);
        console.log("Depósito ID:", depotId);

        // Se o bottleType contiver "(Normal)", "(Leve)", etc, tentamos extrair a chave real
        // Isso ajuda com pedidos antigos que foram salvos com o label em vez da chave
        if (bottleType && bottleType.includes('(')) {
          if (bottleType.includes('12kg')) bottleType = '12kg';
          else if (bottleType.includes('Levita')) bottleType = 'levita';
          else if (bottleType.includes('5kg')) bottleType = '5kg';
          else if (bottleType.includes('35kg')) bottleType = '35kg';
          else if (bottleType.includes('11kg')) bottleType = '11kg';
          console.log("Tipo Botija Mapeado:", bottleType);
        }

        // Buscar o produto correspondente na tabela de produtos
        const { data: productData, error: prodFetchError } = await supabase
          .from('products')
          .select('*')
          .eq('depot_id', depotId)
          .eq('bottle_type', bottleType)
          .maybeSingle(); // Usar maybeSingle para evitar erro se não encontrar

        if (!prodFetchError && productData) {
          const newStock = Math.max(0, productData.stock - quantity);
          console.log(`Atualizando stock de ${productData.stock} para ${newStock}`);
          
          const { error: stockError } = await supabase
            .from('products')
            .update({ stock: newStock })
            .eq('id', productData.id);

          if (!stockError) {
            console.log("Stock atualizado com sucesso no DB");
            // Atualizar estado local dos produtos para refletir no Dashboard imediatamente
            setProducts(prev => prev.map(p => p.id === productData.id ? { ...p, stock: newStock } : p));
          } else {
            console.error("Erro ao atualizar stock no DB:", stockError);
          }
        } else {
          console.warn("Produto não encontrado para baixar stock. Erro:", prodFetchError);
          // Tentar buscar por nome se a chave falhar (último recurso)
          console.log("Tentando busca alternativa por texto...");
          const { data: altProducts } = await supabase.from('products').select('*').eq('depot_id', depotId);
          if (altProducts) {
            console.log("Produtos disponíveis no depósito:", altProducts.map(p => p.bottle_type));
          }
        }
      }

      // 4. Lógica de Reembolso: Se o depósito CANCELAR o pedido
      if (nextStatus === OrderStatus.CANCELLED) {
        const quantity = orderData.quantity || 1;
        const refundAmount = calculateReservationFee(quantity);
        const userId = orderData.user_id;

        if (refundAmount > 0) {
          // Buscar perfil do cliente para obter o saldo atual
          const { data: customerProfile, error: profileFetchError } = await supabase
            .from('profiles')
            .select('balance')
            .eq('id', userId)
            .single();

          if (!profileFetchError && customerProfile) {
            const currentBalance = customerProfile.balance || 0;
            const newBalance = currentBalance + refundAmount;

            // Atualizar saldo do cliente
            const { error: balanceUpdateError } = await supabase
              .from('profiles')
              .update({ balance: newBalance })
              .eq('id', userId);

            if (!balanceUpdateError) {
              // Registrar transação de reembolso para o cliente
              await supabase.from('transactions').insert([{
                user_id: userId,
                type: 'in',
                category: 'refund',
                amount: refundAmount,
                description: `${t('refund_prefix' as any) || 'Reembolso: '} ${orderData.items || 'Pedido Cancelado'} (REF: ${orderId.slice(0, 8)})`
              }]);

              // Notificar o cliente sobre o reembolso
              await createNotificationForUser(
                userId,
                t('success' as any) || 'Reembolso Efetuado',
                `${t('refund_prefix' as any) || 'Reembolso de'} ${refundAmount} Kz creditado na sua carteira devido ao cancelamento do pedido.`,
                'wallet'
              );
            }
          }
        }
      }

      // 5. Lógica de Faturação: Atualizar o Totalizador do Depósito
      if (nextStatus === OrderStatus.DELIVERED) {
        const userDepotId = profile.depot_id || profile.depotId;
        const amountToAdd = Number(orderData.total || orderData.total_price || orderData.totalPrice || (orderData.quantity * (depot?.price || 0)));

        console.log("Tentando atualizar faturação:", { userDepotId, amountToAdd });

        if (amountToAdd > 0 && userDepotId) {
          try {
            // 1. Buscar o total atual
            const { data: currentBilling, error: fetchBillError } = await supabase
              .from('Total_Billing')
              .select('amount, id')
              .eq('depot_id', userDepotId)
              .maybeSingle();

            if (fetchBillError) {
              console.error("Erro ao buscar faturação atual:", fetchBillError);
              throw new Error(`Erro ao buscar faturação: ${fetchBillError.message}`);
            }

            if (currentBilling) {
              // 2. Atualizar somando o novo valor
              const newTotal = (currentBilling.amount || 0) + amountToAdd;
              const { error: updateError } = await supabase
                .from('Total_Billing')
                .update({ amount: newTotal })
                .eq('id', currentBilling.id);

              if (updateError) {
                console.error("Erro ao atualizar total:", updateError);
                throw new Error(`Erro ao atualizar total: ${updateError.message}`);
              }

              setDbTotalRevenue(newTotal);
              console.log("Faturação atualizada com sucesso:", newTotal);
            } else {
              // 3. Se não existir, criar o primeiro registo
              const { error: insertError } = await supabase
                .from('Total_Billing')
                .insert([{
                  depot_id: userDepotId,
                  amount: amountToAdd
                }]);
              
              if (insertError) {
                console.error("Erro ao inserir primeira faturação:", insertError);
                throw new Error(`Erro ao inserir faturação: ${insertError.message}`);
              }

              setDbTotalRevenue(amountToAdd);
              console.log("Primeira faturação registada:", amountToAdd);
            }
          } catch (billErr: any) {
            console.warn("Erro ao atualizar Total_Billing:", billErr);
            alert(`Aviso: O pedido foi finalizado, mas houve um erro ao atualizar a Faturação Total: ${billErr.message}`);
          }
        } else {
          console.warn("Não foi possível calcular o valor para faturação ou ID do depósito ausente.", { amountToAdd, userDepotId });
        }
      }

      await refreshOrders(); // Recarrega a lista de pedidos
    } catch (err: any) {
      console.error("Erro na operação:", err);
      alert(t('error_processing', { message: err.message }));
    } finally {
      setIsUpdating(false);
    }
  };

  const fetchOrders = async () => {
    await refreshOrders();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setEditData(prev => ({ ...prev, imageUrl: base64 }));
        
        // Salvar imediatamente na tabela depots se tivermos o ID
        const depotId = depot?.id || profile?.depot_id || profile?.depotId;
        if (depotId) {
          setIsUpdating(true);
          try {
            const { error: depotError } = await supabase
              .from('depots')
              .update({ image_url: base64 })
              .eq('id', depotId);
            
            if (!depotError) {
              // Sincronizar com o perfil
              await supabase.from('profiles').update({ avatar: base64 }).eq('id', profile.id);
              onUpdateProfile({ ...profile, avatar: base64 });
              setDepot(prev => prev ? { ...prev, imageUrl: base64 } : null);
            } else {
              console.error("Erro ao salvar imagem no depot:", depotError);
            }
          } catch (err) {
            console.error("Erro ao processar upload:", err);
          } finally {
            setIsUpdating(false);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveGeneralInfo = async () => {
    if (!depot || !profile) {
      alert(t('error_depot_profile_not_loaded'));
      return;
    }
    
    const depotId = depot.id || profile.depot_id || profile.depotId;
    if (!depotId) {
      alert(t('error_depot_id_not_found'));
      return;
    }

    setIsUpdating(true);
    
    try {
      // Payload baseado estritamente nas colunas reais da tabela depots fornecidas pelo usuário
      const basePayload: any = {
        name: editData.name, 
        phone: editData.phone, 
        image_url: editData.imageUrl, 
        price: Number(editData.price),
        category: editData.category,
        address: locationForm.address_text,
        latitude: locationForm.latitude,
        longitude: locationForm.longitude,
        horario_abertura: editData.horarioAbertura,
        horario_fecho: editData.horarioFecho,
        dias_de_abertura: editData.diasDeAbertura,
        dias_de_fecho: editData.diasDeFecho
      };
      
      const { error: depotError } = await supabase
        .from('depots')
        .update(basePayload)
        .eq('id', depotId);

      if (depotError) throw depotError;

      // 1.5. Atualizar endereço na tabela 'addresses'
      try {
        if (locationForm.id) {
          await supabase.from('addresses').update({
            address_text: locationForm.address_text,
            latitude: locationForm.latitude,
            longitude: locationForm.longitude
          }).eq('id', locationForm.id);
        } else {
          const { data: newAddr } = await supabase.from('addresses').insert([{
            user_id: profile.id,
            label: 'Depósito',
            address_text: locationForm.address_text,
            latitude: locationForm.latitude,
            longitude: locationForm.longitude,
            is_default: true
          }]).select().single();
          
          if (newAddr) setLocationForm(prev => ({ ...prev, id: newAddr.id }));
        }
      } catch (addrErr) {
        console.warn("Erro ao atualizar tabela addresses:", addrErr);
      }

      // 2. Sincronizar com o avatar do perfil do usuário
      await supabase
        .from('profiles')
        .update({
          avatar: editData.imageUrl,
          name: editData.name
        })
        .eq('id', profile.id);

      // 3. Atualizar estados locais
      const openingHoursStr = `${editData.horarioAbertura} - ${editData.horarioFecho}`;
      const workingDaysStr = `${editData.diasDeAbertura} a ${editData.diasDeFecho}`;
      
      const updatedDepot = { 
        ...depot, 
        ...editData, 
        openingHours: openingHoursStr, 
        workingDays: workingDaysStr,
        address: locationForm.address_text,
        latitude: locationForm.latitude,
        longitude: locationForm.longitude
      };
      setDepot(updatedDepot as Depot);
      
      onUpdateProfile({ 
        ...profile, 
        avatar: editData.imageUrl, 
        name: editData.name 
      });
      
      alert(t('settings_saved_success'));
    } catch (err: any) {
      console.error("FALHA NA GRAVAÇÃO:", err);
      alert(t('save_failed') + ": " + (err.message || "Erro desconhecido"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!profile) return;
    setIsUpdating(true);
    try {
      // 1. Atualizar tabela 'addresses'
      if (locationForm.id) {
        const { error } = await supabase.from('addresses').update({
          address_text: locationForm.address_text, 
          latitude: locationForm.latitude, 
          longitude: locationForm.longitude
        }).eq('id', locationForm.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('addresses').insert([{
          user_id: profile.id, 
          label: 'Depósito', 
          address_text: locationForm.address_text, 
          latitude: locationForm.latitude, 
          longitude: locationForm.longitude, 
          is_default: true
        }]).select().single();
        if (error) throw error;
        if (data) setLocationForm(prev => ({ ...prev, id: data.id }));
      }

      // 2. Atualizar tabela 'depots'
      if (depot) {
        const { error } = await supabase.from('depots').update({ 
          address: locationForm.address_text, 
          latitude: locationForm.latitude, 
          longitude: locationForm.longitude 
        }).eq('id', depot.id);
        if (error) throw error;
        
        setDepot(prev => prev ? { 
          ...prev, 
          address: locationForm.address_text, 
          latitude: locationForm.latitude, 
          longitude: locationForm.longitude 
        } : null);
      }
      
      alert(t('location_saved_success'));
    } catch (err: any) { 
      console.error("Erro ao salvar localização:", err);
      alert(t('save_failed') + ": " + (err.message || "Erro desconhecido"));
    } finally {
      setIsUpdating(false);
    }
  };

  const detectLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocationForm({ ...locationForm, latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      });
    }
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Notificar o depósito sobre a geração do relatório
    if (profile?.id) {
      createNotificationForUser(
        profile.id,
        t('report_generated' as any) || 'Relatório Gerado',
        t('report_generated_msg' as any) || 'O seu relatório de vendas foi gerado com sucesso.',
        'system'
      );
    }

    const locale = language === 'pt' ? 'pt-PT' : language === 'en' ? 'en-US' : 'fr-FR';
    const date = new Date().toLocaleDateString(locale);
    const time = new Date().toLocaleTimeString(locale);

    const reportHtml = `
      <html>
        <head>
          <title>${t('report_title')} - ${depot?.name || t('shop_label')}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 900; color: #ED1C24; text-transform: uppercase; }
            .info { text-align: right; font-size: 12px; color: #666; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 18px; font-weight: 800; text-transform: uppercase; margin-bottom: 15px; color: #1A3A5A; border-left: 4px solid #ED1C24; padding-left: 10px; }
            .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
            .stat-card { padding: 15px; border: 1px solid #eee; border-radius: 10px; }
            .stat-label { font-size: 10px; font-weight: 700; color: #999; text-transform: uppercase; }
            .stat-value { font-size: 20px; font-weight: 900; color: #1A3A5A; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { text-align: left; font-size: 11px; text-transform: uppercase; color: #999; padding: 10px; border-bottom: 1px solid #eee; }
            td { padding: 10px; border-bottom: 1px solid #f9f9f9; font-size: 12px; }
            .status { font-size: 9px; font-weight: 900; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; }
            .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #ccc; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">GÁS JÁ - ${t('report_title').toUpperCase()}</div>
            <div class="info">
              <strong>${depot?.name || t('shop_label')}</strong><br>
              ${t('generated_at').replace('{date}', date).replace('{time}', time)}
            </div>
          </div>

          <div class="section">
            <div class="section-title">${t('general_summary')}</div>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">${t('total_revenue')}</div>
                <div class="stat-value">${totalRevenue.toLocaleString()} Kz</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">${t('delivered_orders')}</div>
                <div class="stat-value">${deliveredCount}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">${t('total_stock')}</div>
                <div class="stat-value">${totalStock} un</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">${t('stock_status')}</div>
            <table>
              <thead>
                <tr>
                  <th>${t('product')}</th>
                  <th>${t('price')}</th>
                  <th>${t('quantity')}</th>
                  <th>${t('status')}</th>
                </tr>
              </thead>
              <tbody>
                ${products.filter(p => p.is_active).map(p => `
                  <tr>
                    <td>${BOTTLE_TYPES_METADATA(t).find(m => m.id === p.bottle_type)?.label}</td>
                    <td>${p.price.toLocaleString()} Kz</td>
                    <td>${p.stock} un</td>
                    <td><span class="status" style="background: ${p.stock < 5 ? '#fee2e2; color: #ef4444;' : '#dcfce7; color: #16a34a;'}">${p.stock < 5 ? t('stock_low') : t('stock_ok_label')}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">${t('recent_orders')}</div>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>${t('client')}</th>
                  <th>${t('order_items')}</th>
                  <th>${t('date')}</th>
                  <th>${t('price')}</th>
                </tr>
              </thead>
              <tbody>
                ${orders.filter(o => o.status === OrderStatus.DELIVERED).slice(0, 10).map(o => `
                  <tr>
                    <td>#${o.id.slice(0, 6).toUpperCase()}</td>
                    <td>${o.userName || 'N/A'}</td>
                    <td>${o.items}</td>
                    <td>${o.created_at ? new Date(o.created_at).toLocaleDateString(locale) : o.date}</td>
                    <td>${o.totalPrice?.toLocaleString() || '0'} Kz</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="footer">
            ${t('internal_use_only').replace('{name}', depot?.name || '')}
          </div>

          <script>
            window.onload = () => { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(reportHtml);
    printWindow.document.close();
  };

  // Mapear ordens para garantir compatibilidade com snake_case do Supabase
  const mappedOrders = orders.map((o: any) => ({
    ...o,
    orderType: o.order_type || o.orderType,
    depotName: o.depot_name || o.depotName,
    userName: o.user_name || o.userName,
    userPhone: o.user_phone || o.userPhone,
    totalPrice: o.total_price || o.totalPrice || o.total || 0,
    date: o.created_at ? new Date(o.created_at).toLocaleDateString(language === 'pt' ? 'pt-BR' : language === 'en' ? 'en-US' : 'fr-FR') : o.date
  }));

  const pendingOrders = mappedOrders.filter(o => 
    [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.READY_FOR_PICKUP].includes(o.status) &&
    o.orderType === OrderType.PICKUP
  );

  const reservationOrders = mappedOrders.filter(o => 
    o.orderType === OrderType.PICKUP
  );

  const filteredReservations = reservationOrders.filter(o => 
    searchQuery === '' || 
    o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.userName && o.userName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalRevenue = dbTotalRevenue > 0 ? dbTotalRevenue : mappedOrders
    .filter(o => o.status === OrderStatus.DELIVERED)
    .reduce((acc, o) => acc + (o.total || 0), 0);

  const pendingCount = mappedOrders.filter(o => [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.READY_FOR_PICKUP].includes(o.status)).length;
  
  const deliveredCount = mappedOrders.filter(o => o.status === OrderStatus.DELIVERED).length;

  const activeProducts = products.filter(p => p.is_active);
  const totalStock = activeProducts.reduce((acc, p) => acc + p.stock, 0);

  // Efeito para verificar notificações de reservas pendentes
  useEffect(() => {
    if (depositoView === 'reservations' && reservationOrders.length > 0 && notifications) {
      const pendingReservations = reservationOrders.filter(o => 
        o.status === OrderStatus.PENDING
      );

      pendingReservations.forEach(async (order) => {
        if (processedOrdersRef.current.has(order.id)) return;
        
        const orderRef = order.id.slice(0, 8).toUpperCase();
        const hasNotification = notifications.some(n => 
          n.type === 'order' && 
          (n.message.includes(orderRef) || n.title.includes(orderRef))
        );

        if (!hasNotification) {
          processedOrdersRef.current.add(order.id);
          try {
            await createNotificationForUser(
              profile.id,
              t('new_reservation_title' as any) || 'Novo Pedido de Reserva',
              (t('new_reservation_msg' as any) || 'Recebeu um novo pedido de reserva #{ref}. Por favor, verifique os detalhes.').replace('{ref}', orderRef),
              'order'
            );
          } catch (err) {
            console.error("Erro ao criar notificação automática:", err);
            processedOrdersRef.current.delete(order.id); // Tentar novamente na próxima vez
          }
        } else {
          processedOrdersRef.current.add(order.id);
        }
      });
    }
  }, [depositoView, reservationOrders, notifications, profile.id, t, createNotificationForUser]);

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-[#0F172A]"><Loader2 className="animate-spin text-[#ED1C24]" size={64} /></div>;

  const blockClass = areBlocksDark ? "bg-[#1E293B] border-white/5 text-white shadow-2xl" : "bg-white border-gray-100 text-[#1A3A5A] shadow-md";
  
  return (
    <div className={`h-screen flex flex-col lg:flex-row transition-all duration-500 overflow-hidden ${isBgDark ? 'bg-[#0F172A]' : 'bg-[#F8FAFC]'}`}>
      
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-[45] animate-in fade-in duration-300" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:relative w-72 lg:w-80 h-full bg-[#1A3A5A] text-white flex flex-col p-6 lg:p-8 z-50 shadow-2xl transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between mb-10 lg:mb-16">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-2xl transform -rotate-3">
               <img src="/assets/splash.png" className="w-8 h-8 object-contain" alt="Logo" />
            </div>
            <h1 className="text-lg font-black uppercase tracking-tight">PORTAL <span className="text-[#ED1C24]">{t('shop_label')}</span></h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-white/10 rounded-xl">
            <ChevronLeft size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 lg:space-y-2">
          <button onClick={() => { setDepositoView('dashboard'); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between px-5 lg:px-6 py-3 lg:py-4 rounded-xl lg:rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${depositoView === 'dashboard' ? 'bg-[#ED1C24] text-white shadow-xl shadow-[#ED1C24]/20' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
            <div className="flex items-center gap-4">
              <LayoutDashboard size={18} /> {t('dashboard')}
            </div>
            {notifications.some(n => !n.read) && (
              <div className="w-2 h-2 rounded-full bg-[#ED1C24] animate-pulse"></div>
            )}
          </button>
          <button onClick={() => { setDepositoView('reservations'); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between px-5 lg:px-6 py-3 lg:py-4 rounded-xl lg:rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${depositoView === 'reservations' ? 'bg-[#ED1C24] text-white shadow-xl shadow-[#ED1C24]/20' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
            <div className="flex items-center gap-4">
              <Calendar size={18} /> {t('reservation_orders')}
            </div>
            {pendingCount > 0 && (
              <div className="w-2 h-2 rounded-full bg-[#ED1C24] animate-pulse"></div>
            )}
          </button>
          <button onClick={() => { setDepositoView('products'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-5 lg:px-6 py-3 lg:py-4 rounded-xl lg:rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${depositoView === 'products' ? 'bg-[#ED1C24] text-white shadow-xl shadow-[#ED1C24]/20' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
            <Package size={18} /> {t('my_products')}
          </button>
          <button onClick={() => { setDepositoView('reports'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-5 lg:px-6 py-3 lg:py-4 rounded-xl lg:rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${depositoView === 'reports' ? 'bg-[#ED1C24] text-white shadow-xl shadow-[#ED1C24]/20' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
            <Database size={18} /> {t('reports')}
          </button>
          <button onClick={() => { setDepositoView('settings'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-5 lg:px-6 py-3 lg:py-4 rounded-xl lg:rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${depositoView === 'settings' ? 'bg-[#ED1C24] text-white shadow-xl shadow-[#ED1C24]/20' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
            <Settings size={18} /> {t('settings')}
          </button>
          <button onClick={() => { setActiveTab(AppTab.NOTIFICATIONS); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between px-5 lg:px-6 py-3 lg:py-4 rounded-xl lg:rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-white/60 hover:text-white hover:bg-white/5`}>
            <div className="flex items-center gap-4">
              <Bell size={18} /> {t('notifications')}
            </div>
            {notifications.some(n => !n.read) && (
              <div className="w-2 h-2 rounded-full bg-[#ED1C24] animate-pulse"></div>
            )}
          </button>
        </nav>

        <div className="mt-auto pt-8 border-t border-white/5 space-y-4">
           <div className="relative" ref={languageRef}>
             <button 
               onClick={() => setIsLanguageOpen(!isLanguageOpen)} 
               className={`w-full flex items-center gap-4 px-6 py-5 rounded-3xl text-xs font-black uppercase tracking-widest transition-all ${isLanguageOpen ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
             >
               <Globe size={20} /> {t('language')} ({language.toUpperCase()})
             </button>
             
             {isLanguageOpen && (
               <div className="absolute bottom-full left-0 mb-4 w-full bg-[#1A3A5A] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-2 duration-300">
                 <div className="p-4 space-y-1">
                   {(['pt', 'en', 'fr'] as Language[]).map((lang) => (
                     <button
                       key={lang}
                       onClick={() => {
                         setLanguage(lang);
                         setIsLanguageOpen(false);
                       }}
                       className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${language === lang ? 'bg-[#ED1C24] text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                     >
                       <span>{lang === 'pt' ? 'Português' : lang === 'en' ? 'English' : 'Français'}</span>
                       {language === lang && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                     </button>
                   ))}
                 </div>
               </div>
             )}
           </div>
           <button onClick={onLogout} className="w-full flex items-center gap-4 px-6 py-5 rounded-3xl text-xs font-black uppercase tracking-widest text-[#ED1C24] bg-[#ED1C24]/5 hover:bg-[#ED1C24] hover:text-white transition-all"><LogOut size={20} /> {t('logout')}</button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        <header className={`${blockClass} h-20 lg:h-24 border-b flex items-center justify-between px-4 lg:px-12 shrink-0 z-40`}>
          <div className="flex items-center gap-3 lg:gap-4">
             <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-black/5 rounded-xl">
               <Menu size={24} />
             </button>
             <div className={`w-2.5 h-2.5 rounded-full ${depot?.isOpen ? 'bg-green-500 animate-pulse' : 'bg-[#ED1C24]'}`}></div>
             <div className="flex items-center gap-1.5">
               <h2 className="text-[10px] lg:text-sm font-black uppercase tracking-widest truncate max-w-[120px] lg:max-w-none">{depot?.name}</h2>
             </div>
          </div>
          <div className="flex items-center gap-3 lg:gap-6">
             <div className="relative" ref={notificationsRef}>
               <button 
                 onClick={() => setActiveTab(AppTab.NOTIFICATIONS)}
                  className={`relative p-2 transition-colors text-gray-400 hover:text-[#ED1C24]`}
               >
                 {pendingReservationsCount > 0 ? (
                   <Bell className="text-[#ED1C24] animate-bounce" size={20} />
                 ) : (
                   <Bell size={20} />
                 )}
                 {(notifications.some(n => !n.read) || pendingReservationsCount > 0) && (
                   <span className="absolute -top-1 -right-1 bg-[#ED1C24] text-white text-[8px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-black border-2 border-[#1A3A5A] animate-pulse">
                     {notifications.filter(n => !n.read || isPendingReservationNotification(n)).length}
                   </span>
                 )}
               </button>
             </div>
             <div className="flex items-center gap-3 lg:gap-4">
                <div className="text-right hidden sm:block"><p className="text-[10px] lg:text-xs font-black">{profile?.name}</p></div>
                <button onClick={onNavigateToProfile} className="active:scale-95 transition-transform">
                  <img src={profile?.avatar || "https://i.pravatar.cc/150?u=depot"} className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl object-cover shadow-lg" alt="" />
                </button>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-12 custom-scrollbar">
          {depositoView === 'dashboard' ? (
            <div className="max-w-7xl mx-auto space-y-6 lg:space-y-12 animate-in fade-in duration-700">
              {/* Top Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
                 <div className={`${blockClass} p-5 lg:p-8 rounded-3xl lg:rounded-[48px] border relative overflow-hidden group`}>
                    <div className="absolute -right-4 -top-4 p-6 lg:p-8 bg-blue-500/5 rounded-full group-hover:scale-110 transition-transform">
                       <TrendingUp size={40} className="text-blue-500/20" />
                    </div>
                    <p className="text-[9px] lg:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('total_revenue')}</p>
                    <h3 className="text-xl lg:text-4xl font-black mb-1">{totalRevenue.toLocaleString()} <span className="text-[10px] lg:text-xs">Kz</span></h3>
                    <p className="text-[9px] lg:text-[10px] font-bold text-green-500 uppercase">{t('completed_sales')}</p>
                 </div>

                 <div className={`${blockClass} p-5 lg:p-8 rounded-3xl lg:rounded-[48px] border relative overflow-hidden group`}>
                    <div className="absolute -right-4 -top-4 p-6 lg:p-8 bg-[#ED1C24]/5 rounded-full group-hover:scale-110 transition-transform">
                       <Clock size={40} className="text-[#ED1C24]/20" />
                    </div>
                    <p className="text-[9px] lg:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('orders')}</p>
                    <h3 className="text-xl lg:text-4xl font-black mb-1">{pendingCount}</h3>
                    <p className="text-[9px] lg:text-[10px] font-bold text-orange-500 uppercase">{t('awaiting_action')}</p>
                 </div>

                 <div className={`${blockClass} p-5 lg:p-8 rounded-3xl lg:rounded-[48px] border relative overflow-hidden group`}>
                    <div className="absolute -right-4 -top-4 p-6 lg:p-8 bg-green-500/5 rounded-full group-hover:scale-110 transition-transform">
                       <Package size={40} className="text-green-500/20" />
                    </div>
                    <p className="text-[9px] lg:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('available_stock')}</p>
                    <h3 className="text-xl lg:text-4xl font-black mb-1">{totalStock}</h3>
                    <p className="text-[9px] lg:text-[10px] font-bold text-blue-500 uppercase">{t('in_types', { count: activeProducts.length })}</p>
                 </div>

                 <div className={`${blockClass} p-5 lg:p-8 rounded-3xl lg:rounded-[48px] border flex flex-col justify-center items-center group cursor-pointer hover:border-[#ED1C24]/30 transition-all`} onClick={handleToggleStatus}>
                    <div className={`w-10 h-10 lg:w-16 lg:h-16 rounded-full flex items-center justify-center mb-2 lg:mb-3 transition-all ${depot?.isOpen ? 'bg-green-600 text-white shadow-xl shadow-green-600/20' : 'bg-[#ED1C24] text-white shadow-xl shadow-[#ED1C24]/20'}`}>
                       <Power size={20} lg:size={24} />
                    </div>
                    <p className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest">{depot?.isOpen ? t('shop_open') : t('shop_closed_label')}</p>
                    <div className="mt-1 lg:mt-2 text-center">
                       <p className="text-[8px] font-bold text-gray-400 uppercase leading-tight">{depot?.openingHours}</p>
                       <p className="text-[7px] font-medium text-gray-400 uppercase tracking-tighter">
                         {depot?.diasDeAbertura && depot?.diasDeFecho 
                           ? `${t(dayToKey[depot.diasDeAbertura] || depot.diasDeAbertura)} ${t('to')} ${t(dayToKey[depot.diasDeFecho] || depot.diasDeFecho)}`
                           : depot?.workingDays}
                       </p>
                    </div>
                    <p className="text-[8px] font-bold text-[#ED1C24] mt-1 lg:mt-2 uppercase">{t('click_to_change')}</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                {/* Lista de Pedidos Rápidos (Levantamentos) */}
                <div className="lg:col-span-2 space-y-4 lg:space-y-6">
                   <div className="flex items-center justify-between">
                      <h3 className="text-xl lg:text-2xl font-black uppercase">{t('urgent_pickups')}</h3>
                      <span className="text-[10px] font-black bg-blue-600 text-white px-3 py-1 rounded-full">{pendingOrders.length}</span>
                   </div>
                   <div className="space-y-3 lg:space-y-4">
                      {pendingOrders.length === 0 ? (
                        <div className={`${blockClass} p-8 lg:p-12 rounded-[32px] lg:rounded-[40px] border border-dashed flex flex-col items-center justify-center opacity-50`}>
                           <Store size={32} className="mb-4 lg:size-10" />
                           <p className="text-xs lg:text-sm font-bold uppercase text-center">{t('no_pending_pickups')}</p>
                        </div>
                      ) : pendingOrders.map(o => (
                        <div key={o.id} className={`${blockClass} p-4 lg:p-6 rounded-[24px] lg:rounded-[32px] border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:scale-[1.01] transition-transform`}>
                           <div className="flex items-center gap-4 lg:gap-5">
                              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-blue-600/10 text-blue-600 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-inner shrink-0"><Store size={20} lg:size={24} /></div>
                              <div>
                                 <p className="text-xs lg:text-sm font-black">{o.items}</p>
                                 <p className="text-[10px] font-black text-[#ED1C24]">{o.totalPrice?.toLocaleString()} Kz</p>
                                 <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-[7px] lg:text-[8px] font-black px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded uppercase">{o.status}</span>
                                    <p className="text-[8px] lg:text-[9px] font-bold text-gray-400">{o.date}</p>
                                 </div>
                              </div>
                           </div>
                           <div className="flex gap-2 w-full sm:w-auto">
                              {o.status === OrderStatus.PENDING && (
                                <button 
                                  onClick={() => handleUpdateOrderStatus(o.id, OrderStatus.CONFIRMED)}
                                  className="flex-1 sm:flex-none px-5 py-3 bg-green-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg shadow-green-600/20"
                                >
                                  Confirmar
                                </button>
                              )}
                              {o.status === OrderStatus.CONFIRMED && (
                                <button 
                                  onClick={() => handleUpdateOrderStatus(o.id, OrderStatus.READY_FOR_PICKUP)}
                                  className="flex-1 sm:flex-none px-5 py-3 bg-orange-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg shadow-orange-600/20"
                                >
                                  Pronto
                                </button>
                              )}
                               {[OrderStatus.OUT_FOR_DELIVERY, OrderStatus.READY_FOR_PICKUP].includes(o.status) && (
                                <button 
                                  onClick={() => handleUpdateOrderStatus(o.id, OrderStatus.DELIVERED)}
                                  className="flex-1 sm:flex-none px-5 py-3 bg-gray-600 text-white rounded-xl font-black text-[9px] uppercase"
                                >
                                  Levantado
                                </button>
                              )}
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                {/* Resumo de Stock Lateral */}
                <div className="space-y-6 lg:space-y-8">
                   <h3 className="text-xl lg:text-2xl font-black uppercase">{t('stock_summary')}</h3>
                   <div className={`${blockClass} p-6 lg:p-8 rounded-[32px] lg:rounded-[40px] border space-y-4 lg:space-y-6`}>
                      {activeProducts.length === 0 ? (
                        <p className="text-xs font-bold text-gray-400 text-center py-8">{t('no_active_products')}</p>
                      ) : activeProducts.map(p => (
                        <div key={p.id} className="flex items-center justify-between group">
                           <div className="flex items-center gap-3 lg:gap-4">
                              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gray-50 dark:bg-slate-800 rounded-lg lg:rounded-xl flex items-center justify-center p-1">
                                 <img src={BOTTLE_TYPES_METADATA(t).find(m => m.id === p.bottle_type)?.image} className="w-full h-full object-contain" alt="" />
                              </div>
                              <div>
                                 <p className="text-[9px] lg:text-[10px] font-black uppercase">{BOTTLE_TYPES_METADATA(t).find(m => m.id === p.bottle_type)?.label}</p>
                                 <p className="text-[7px] lg:text-[8px] font-bold text-gray-400 uppercase">{p.price.toLocaleString()} Kz</p>
                              </div>
                           </div>
                           <div className={`px-2 lg:px-3 py-1 rounded-lg text-[9px] lg:text-[10px] font-black ${p.stock < 5 ? 'bg-[#ED1C24]/10 text-[#ED1C24] animate-pulse' : 'bg-green-500/10 text-green-500'}`}>
                              {p.stock} un
                           </div>
                        </div>
                      ))}
                      <button onClick={() => setDepositoView('products')} className="w-full py-3 lg:py-4 bg-gray-100 dark:bg-slate-800 rounded-xl lg:rounded-2xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest hover:bg-[#ED1C24] hover:text-white transition-all">{t('manage_products')}</button>
                   </div>

                   {/* Card de Performance */}
                   <div className="bg-gradient-to-br from-[#1A3A5A] to-[#0F172A] p-6 lg:p-8 rounded-[32px] lg:rounded-[40px] text-white shadow-2xl relative overflow-hidden">
                      <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><Sparkles size={60} lg:size={80} /></div>
                      <p className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-white/40 mb-3 lg:mb-4">{t('performance')}</p>
                      <div className="flex items-end gap-2 mb-1">
                         <h4 className="text-2xl lg:text-3xl font-black">{deliveredCount}</h4>
                         <p className="text-[8px] lg:text-[10px] font-bold text-white/60 mb-1 uppercase">{t('total_pickups')}</p>
                      </div>
                      <div className="w-full h-1 bg-white/10 rounded-full mt-3 lg:mt-4 overflow-hidden">
                         <div className="h-full bg-[#ED1C24]" style={{ width: '65%' }}></div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          ) : depositoView === 'reservations' ? (
            <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8 animate-in fade-in duration-700">
               <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                  <div>
                     <h2 className="text-xl lg:text-3xl font-black uppercase">{t('reservation_orders')}</h2>
                     <p className="text-[10px] lg:text-xs font-bold text-gray-400 mt-1">{t('manage_reservations_desc')}</p>
                  </div>
                  
                  <div className="w-full lg:w-80 relative">
                     <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <Search size={18} />
                     </div>
                     <input 
                        type="text" 
                        placeholder={t('search_placeholder')} 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`${blockClass} w-full pl-12 pr-4 py-3 lg:py-4 rounded-xl lg:rounded-2xl border-2 outline-none focus:border-[#ED1C24]/50 transition-all text-xs font-bold`}
                     />
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-3 lg:gap-4">
                  {filteredReservations.length === 0 ? (
                    <div className={`${blockClass} p-8 lg:p-10 rounded-2xl lg:rounded-3xl text-center`}>
                       <Calendar size={32} className="mx-auto mb-3 opacity-20 lg:size-10" />
                       <p className="text-xs lg:text-sm font-black opacity-40 uppercase">
                          {searchQuery ? t('no_orders_found') : t('no_reservations_found')}
                       </p>
                       {searchQuery && (
                         <button onClick={() => setSearchQuery('')} className="mt-3 text-[#ED1C24] text-[9px] font-black uppercase tracking-widest">{t('clear_search')}</button>
                       )}
                    </div>
                  ) : filteredReservations.map(o => (
                    <div key={o.id} className={`${blockClass} p-3.5 lg:p-5 rounded-xl lg:rounded-3xl border flex flex-col lg:flex-row lg:items-center justify-between gap-4`}>
                       <div className="flex items-center gap-4 lg:gap-5">
                          <div className="p-2.5 lg:p-3 bg-orange-600/10 text-orange-600 rounded-lg lg:rounded-xl flex flex-col items-center justify-center shrink-0">
                             <Store size={18} lg:size={20} />
                             <span className="text-[6px] lg:text-[7px] font-black mt-0.5">{t('reserva_label')}</span>
                          </div>
                          <div>
                             <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                <p className="text-xs lg:text-sm font-black">{o.items}</p>
                                <span className="text-[9px] lg:text-[10px] font-black text-[#ED1C24] bg-[#ED1C24]/10 px-2 py-0.5 rounded-full">
                                   {o.totalPrice?.toLocaleString()} Kz
                                </span>
                                <span className="text-[7px] bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-black text-gray-500">{t('ref_label')}: {o.id.slice(0, 8).toUpperCase()}</span>
                             </div>
                             
                             <div className="flex flex-wrap gap-x-4 gap-y-1">
                                <p className="text-[10px] lg:text-xs font-bold flex items-center gap-1.5">
                                   <User size={10} className="text-[#ED1C24]" />
                                   {o.userName || t('unknown_client')}
                                </p>
                                <p className="text-[9px] lg:text-[10px] font-bold text-gray-400 flex items-center gap-1.5">
                                   <Phone size={9} />
                                   {o.userPhone || t('no_contact_label')}
                                </p>
                                <p className="text-[9px] lg:text-[10px] font-bold text-gray-400 flex items-center gap-1.5">
                                   <Calendar size={9} />
                                   {o.date}
                                </p>
                             </div>

                             <div className="flex gap-2 mt-2">
                                <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase ${
                                  o.status === OrderStatus.READY_FOR_PICKUP ? 'bg-green-500/10 text-green-600' : 
                                  o.status === OrderStatus.DELIVERED ? 'bg-gray-500/10 text-gray-600' :
                                  'bg-orange-500/10 text-orange-600'
                                }`}>
                                  {o.status === OrderStatus.PENDING ? t('status_pending') : 
                                   o.status === OrderStatus.CONFIRMED ? t('status_confirmed') :
                                   o.status === OrderStatus.READY_FOR_PICKUP ? t('status_ready_for_pickup') :
                                   o.status === OrderStatus.DELIVERED ? t('status_delivered') :
                                   o.status === OrderStatus.CANCELLED ? t('status_cancelled') : o.status}
                                </span>
                             </div>
                          </div>
                       </div>
                       
                       <div className="flex gap-2 w-full lg:w-auto">
                          {o.status === OrderStatus.PENDING && (
                            <button 
                              onClick={() => handleUpdateOrderStatus(o.id, OrderStatus.CONFIRMED)}
                              className="flex-1 lg:flex-none px-5 lg:px-6 py-3 bg-green-600 text-white rounded-lg lg:rounded-xl font-black text-[9px] lg:text-[10px] uppercase shadow-lg shadow-green-600/20"
                            >
                              {t('confirm_btn')}
                            </button>
                          )}
                          {o.status === OrderStatus.CONFIRMED && (
                            <button 
                              onClick={() => handleUpdateOrderStatus(o.id, OrderStatus.READY_FOR_PICKUP)}
                              className="flex-1 lg:flex-none px-5 lg:px-6 py-3 bg-orange-600 text-white rounded-lg lg:rounded-xl font-black text-[9px] lg:text-[10px] uppercase shadow-lg shadow-orange-600/20"
                            >
                              {t('ready_btn')}
                            </button>
                          )}
                          {o.status === OrderStatus.READY_FOR_PICKUP && (
                            <button 
                              onClick={() => handleUpdateOrderStatus(o.id, OrderStatus.DELIVERED)}
                              className="flex-1 lg:flex-none px-5 lg:px-6 py-3 bg-gray-600 text-white rounded-lg lg:rounded-xl font-black text-[9px] lg:text-[10px] uppercase"
                            >
                              {t('finish_btn')}
                            </button>
                          )}
                          {o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED && (
                            <button 
                              onClick={() => handleUpdateOrderStatus(o.id, OrderStatus.CANCELLED)}
                              className="px-3 py-3 bg-[#ED1C24]/10 text-[#ED1C24] rounded-lg lg:rounded-xl font-black text-[10px] uppercase"
                            >
                              <XCircle size={16} />
                            </button>
                          )}
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          ) : depositoView === 'products' ? (
            <div className="max-w-6xl mx-auto animate-in slide-in-from-right duration-500 space-y-8 lg:space-y-12">
                  <div>
                     <h2 className="text-2xl lg:text-4xl font-black uppercase">{t('bottle_management')}</h2>
                     <p className="text-xs lg:text-sm font-bold text-gray-400 mt-2">{t('bottle_management_desc')}</p>
                  </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-8">
                  {BOTTLE_TYPES_METADATA(t).map(meta => {
                    const product = products.find(p => p.bottle_type === meta.id);
                    const isActive = product?.is_active || false;
                    
                    return (
                    <div key={meta.id} className={`${blockClass} p-4 lg:p-8 rounded-3xl lg:rounded-[48px] border transition-all ${isActive ? 'border-blue-500/30 bg-blue-500/5' : 'opacity-60'}`}>
                       <div className="flex items-center gap-3 lg:gap-6 mb-4 lg:mb-8">
                          <img src={meta.image} className="w-12 h-12 lg:w-20 lg:h-20 rounded-xl lg:rounded-3xl object-contain bg-white p-2 shadow-sm" alt="" />
                          <div className="flex-1">
                             <h4 className="text-xs lg:text-xl font-black leading-tight">{meta.label}</h4>
                             <p className="text-[7px] lg:text-[10px] font-bold text-gray-400 uppercase">{t('official_type')}</p>
                          </div>
                          <button 
                            onClick={() => handleToggleProduct(meta.id)}
                            className={`p-2.5 lg:p-4 rounded-lg lg:rounded-2xl transition-all ${isActive ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-400'}`}
                          >
                             {isActive ? <CheckCircle2 size={16} lg:size={24} /> : <Power size={16} lg:size={24} />}
                          </button>
                       </div>
                         
                         {isActive && product && (
                           <div className="space-y-4 lg:space-y-6 animate-in fade-in zoom-in-95">
                              {/* PREÇO */}
                              <div className="space-y-1.5">
                                <label className="text-[8px] lg:text-[9px] font-black uppercase text-blue-500 tracking-widest ml-1">{t('price_kz')}</label>
                                <div className="flex gap-2">
                                   <input 
                                     type="number" 
                                     value={product.price}
                                     onChange={(e) => handleUpdateProductPrice(product.id, parseInt(e.target.value) || 0)}
                                     className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 rounded-xl text-lg font-black outline-none border border-blue-500/20"
                                   />
                                   <div className="p-3 bg-blue-600 text-white rounded-xl flex items-center justify-center shrink-0"><Banknote size={20} /></div>
                                </div>
                              </div>

                              {/* STOCK INDIVIDUAL */}
                              <div className="space-y-1.5">
                                <label className="text-[8px] lg:text-[9px] font-black uppercase text-orange-500 tracking-widest ml-1">{t('stock_label')}</label>
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-[20px] border border-orange-500/20">
                                   <button 
                                      onClick={() => handleUpdateProductStock(product.id, product.stock - 1)}
                                      className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-[#ED1C24] active:scale-90"
                                   >
                                      <Minus size={18} />
                                   </button>
                                   <div className="flex-1 text-center">
                                      <span className="text-xl font-black">{product.stock}</span>
                                      <p className="text-[7px] font-bold uppercase text-gray-400">{t('bottles_label')}</p>
                                   </div>
                                   <button 
                                      onClick={() => handleUpdateProductStock(product.id, product.stock + 1)}
                                      className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-blue-600 active:scale-90"
                                   >
                                      <Plus size={18} />
                                   </button>
                                </div>
                              </div>
                           </div>
                         )}
                      </div>
                    );
                  })}
               </div>
            </div>
           ) : depositoView === 'reports' ? (
            <div className="max-w-7xl mx-auto space-y-8 lg:space-y-12 animate-in fade-in slide-in-from-right duration-700">
               <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div>
                     <h2 className="text-2xl lg:text-4xl font-black uppercase">{t('sales_reports')}</h2>
                     <p className="text-xs lg:text-sm font-bold text-gray-400 mt-2">{t('sales_reports_desc')}</p>
                  </div>
                  <button 
                    onClick={handlePrintReport}
                    className="flex items-center justify-center gap-3 px-8 py-5 bg-[#ED1C24] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[#ED1C24]/20 active:scale-95 transition-all"
                  >
                    <Printer size={20} />
                    {t('print_full_report')}
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className={`${blockClass} p-8 rounded-[40px] border`}>
                     <p className="text-[10px] font-black uppercase text-gray-400 mb-2">{t('total_revenue')}</p>
                     <h3 className="text-3xl font-black text-[#ED1C24]">{totalRevenue.toLocaleString()} Kz</h3>
                     <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                        <p className="text-[10px] font-bold text-gray-400">{t('avg_per_order')}: <span className="text-blue-500">{(totalRevenue / (deliveredCount || 1)).toLocaleString()} Kz</span></p>
                     </div>
                  </div>
                  <div className={`${blockClass} p-8 rounded-[40px] border`}>
                     <p className="text-[10px] font-black uppercase text-gray-400 mb-2">{t('pickup_rate')}</p>
                     <h3 className="text-3xl font-black text-blue-500">{deliveredCount}</h3>
                     <p className="text-[10px] font-bold text-gray-400 mt-2">{t('delivered_orders_success')}</p>
                  </div>
                  <div className={`${blockClass} p-8 rounded-[40px] border`}>
                     <p className="text-[10px] font-black uppercase text-gray-400 mb-2">{t('stock_efficiency')}</p>
                     <h3 className="text-3xl font-black text-green-500">{Math.round((deliveredCount / (totalStock + deliveredCount || 1)) * 100)}%</h3>
                     <p className="text-[10px] font-bold text-gray-400 mt-2">{t('sales_vs_stock_desc')}</p>
                  </div>
               </div>

               <div className={`${blockClass} p-8 lg:p-12 rounded-[48px] border`}>
                  <h4 className="text-sm lg:text-lg font-black uppercase mb-8">{t('sales_distribution_title')}</h4>
                  <div className="space-y-6">
                     {products.filter(p => p.is_active).map(p => {
                        const meta = BOTTLE_TYPES_METADATA(t).find(m => m.id === p.bottle_type);
                        return (
                           <div key={p.id} className="space-y-2">
                              <div className="flex justify-between items-end">
                                 <div className="flex items-center gap-3">
                                    <img src={meta?.image} className="w-8 h-8 object-contain" alt="" />
                                    <span className="text-xs font-black uppercase">{meta?.label}</span>
                                 </div>
                                 <span className="text-[10px] font-bold text-gray-400">{t('units_in_stock', { count: p.stock })}</span>
                              </div>
                              <div className="w-full h-3 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                 <div 
                                    className="h-full bg-[#ED1C24]" 
                                    style={{ width: `${Math.min(100, (p.stock / (totalStock || 1)) * 100)}%` }}
                                 ></div>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            </div>
           ) : (
            <div className="max-w-7xl mx-auto space-y-8 lg:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl lg:text-4xl font-black uppercase">{t('settings')}</h2>
                    <p className="text-xs lg:text-sm font-bold text-gray-400 mt-2">{t('settings_desc')}</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-10">
                  {/* Perfil e Imagem */}
                  <div className="xl:col-span-1 space-y-6 lg:space-y-8">
                    <div className={`${blockClass} p-5 lg:p-10 rounded-3xl lg:rounded-[48px] border shadow-sm flex flex-col items-center text-center`}>
                      <div 
                        className="relative group mb-5 lg:mb-6 cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="w-28 h-28 lg:w-40 lg:h-40 rounded-3xl lg:rounded-[40px] overflow-hidden border-4 border-blue-500/10 shadow-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                          {editData.imageUrl ? (
                            <img 
                              src={editData.imageUrl} 
                              className="w-full h-full object-cover" 
                              alt="Preview" 
                            />
                          ) : (
                            <Store size={40} lg:size={48} className="text-gray-300" />
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center rounded-[32px] lg:rounded-[40px]">
                          <Camera size={24} lg:size={32} className="text-white mb-2" />
                          <span className="text-[8px] lg:text-[10px] font-black text-white uppercase tracking-widest">{t('edit_photo')}</span>
                        </div>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="image/*" 
                          onChange={handleFileChange} 
                        />
                      </div>
                      <h3 className="text-lg lg:text-xl font-black uppercase tracking-tight">{editData.name || t('business_name')}</h3>
                      <p className="text-[9px] lg:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                        {editData.category === 'Económico' ? t('cat_economic') : 
                         editData.category === 'Express' ? t('cat_express') : 
                         editData.category === 'Premium' ? t('cat_premium') : editData.category}
                      </p>
                      
                      <div className="w-full mt-6 lg:mt-8 p-4 bg-blue-500/5 rounded-xl lg:rounded-2xl border border-blue-500/10">
                        <p className="text-[9px] lg:text-[10px] font-bold text-blue-600 uppercase mb-1">{t('pro_tip')}</p>
                        <p className="text-[8px] lg:text-[9px] font-medium text-gray-500 dark:text-slate-400 leading-tight">
                          {t('pro_tip_desc')}
                        </p>
                      </div>
                    </div>

                    <div className={`${blockClass} p-5 lg:p-10 rounded-3xl lg:rounded-[48px] border shadow-sm`}>
                      <h4 className="text-xs lg:text-sm font-black uppercase mb-4 lg:mb-6 flex items-center gap-2">
                        <Info size={16} lg:size={18} className="text-blue-500" /> {t('operational_status')}
                      </h4>
                      <div className="space-y-4 lg:space-y-6">
                        <div className="flex items-center justify-between p-3.5 lg:p-4 bg-gray-500/5 rounded-xl lg:rounded-2xl">
                          <div>
                            <p className="text-[9px] lg:text-[10px] font-black uppercase">{t('shop_open')}</p>
                            <p className="text-[7px] lg:text-[8px] font-bold text-gray-400 uppercase">{t('visible_to_clients')}</p>
                          </div>
                          <button 
                            onClick={handleToggleStatus}
                            className={`w-10 lg:w-12 h-5 lg:h-6 rounded-full relative transition-all ${depot?.isOpen ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-700'}`}
                          >
                            <div className={`absolute top-1 w-3 lg:w-4 h-3 lg:h-4 bg-white rounded-full transition-all ${depot?.isOpen ? 'right-1' : 'left-1'}`}></div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dados Comerciais */}
                  <div className="xl:col-span-2 space-y-6 lg:space-y-8">
                    <div className={`${blockClass} p-5 lg:p-10 rounded-3xl lg:rounded-[48px] border shadow-sm`}>
                      <h4 className="text-xs lg:text-sm font-black uppercase mb-6 lg:mb-8 flex items-center gap-2">
                        <Store size={16} lg:size={18} className="text-[#ED1C24]" /> {t('business_info')}
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-8">
                        <div className="space-y-1.5 lg:space-y-2">
                          <label className="text-[8px] lg:text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">{t('business_name')}</label>
                          <input 
                            type="text" 
                            value={editData.name} 
                            onChange={e => setEditData({...editData, name: e.target.value})} 
                            className={`w-full p-3.5 lg:p-5 rounded-xl lg:rounded-2xl text-xs lg:text-sm font-bold border outline-none transition-all ${areBlocksDark ? 'bg-white/5 border-white/5 focus:border-[#ED1C24]/50' : 'bg-gray-50 border-gray-100 focus:border-[#ED1C24]/50'}`} 
                          />
                        </div>
                        
                        <div className="space-y-1.5 lg:space-y-2">
                          <label className="text-[8px] lg:text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">{t('contact_phone')}</label>
                          <input 
                            type="text" 
                            value={editData.phone} 
                            onChange={e => setEditData({...editData, phone: e.target.value})} 
                            className={`w-full p-3.5 lg:p-5 rounded-xl lg:rounded-2xl text-xs lg:text-sm font-bold border outline-none transition-all ${areBlocksDark ? 'bg-white/5 border-white/5 focus:border-[#ED1C24]/50' : 'bg-gray-50 border-gray-100 focus:border-[#ED1C24]/50'}`} 
                          />
                        </div>

                        <div className="space-y-1.5 lg:space-y-2">
                          <label className="text-[8px] lg:text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">{t('category')}</label>
                          <select 
                            value={editData.category} 
                            onChange={e => setEditData({...editData, category: e.target.value as any})}
                            className={`w-full p-3.5 lg:p-5 rounded-xl lg:rounded-2xl text-xs lg:text-sm font-bold border outline-none transition-all appearance-none ${areBlocksDark ? 'bg-white/5 border-white/5 focus:border-[#ED1C24]/50' : 'bg-gray-50 border-gray-100 focus:border-[#ED1C24]/50'}`}
                          >
                            <option value="Económico">{t('cat_economic')}</option>
                            <option value="Express">{t('cat_express')}</option>
                            <option value="Premium">{t('cat_premium')}</option>
                          </select>
                        </div>

                        <div className="space-y-1.5 lg:space-y-2">
                          <label className="text-[8px] lg:text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">{t('opening_hours')}</label>
                          <div className="flex gap-2">
                            <input 
                              type="time" 
                              value={editData.horarioAbertura} 
                              onChange={e => setEditData({...editData, horarioAbertura: e.target.value})} 
                              className={`flex-1 p-3 lg:p-5 rounded-xl lg:rounded-2xl text-xs lg:text-sm font-bold border outline-none transition-all ${areBlocksDark ? 'bg-white/5 border-white/5 focus:border-[#ED1C24]/50' : 'bg-gray-50 border-gray-100 focus:border-[#ED1C24]/50'}`} 
                            />
                            <div className="flex items-center text-gray-400 font-black text-[10px]">{t('at_time')}</div>
                            <input 
                              type="time" 
                              value={editData.horarioFecho} 
                              onChange={e => setEditData({...editData, horarioFecho: e.target.value})} 
                              className={`flex-1 p-3 lg:p-5 rounded-xl lg:rounded-2xl text-xs lg:text-sm font-bold border outline-none transition-all ${areBlocksDark ? 'bg-white/5 border-white/5 focus:border-[#ED1C24]/50' : 'bg-gray-50 border-gray-100 focus:border-[#ED1C24]/50'}`} 
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5 lg:space-y-2">
                          <label className="text-[8px] lg:text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">{t('working_days')}</label>
                          <div className="flex gap-2">
                            <select 
                              value={editData.diasDeAbertura} 
                              onChange={e => setEditData({...editData, diasDeAbertura: e.target.value})} 
                              className={`flex-1 p-3 lg:p-5 rounded-xl lg:rounded-2xl text-xs lg:text-sm font-bold border outline-none transition-all appearance-none ${areBlocksDark ? 'bg-white/5 border-white/5 focus:border-[#ED1C24]/50' : 'bg-gray-50 border-gray-100 focus:border-[#ED1C24]/50'}`}
                            >
                              {[
                                { key: 'monday', value: 'Segunda' },
                                { key: 'tuesday', value: 'Terça' },
                                { key: 'wednesday', value: 'Quarta' },
                                { key: 'thursday', value: 'Quinta' },
                                { key: 'friday', value: 'Sexta' },
                                { key: 'saturday', value: 'Sábado' },
                                { key: 'sunday', value: 'Domingo' }
                              ].map(day => (
                                <option key={day.key} value={day.value}>{t(day.key)}</option>
                              ))}
                            </select>
                            <div className="flex items-center text-gray-400 font-black text-[10px]">{t('to')}</div>
                            <select 
                              value={editData.diasDeFecho} 
                              onChange={e => setEditData({...editData, diasDeFecho: e.target.value})} 
                              className={`flex-1 p-3 lg:p-5 rounded-xl lg:rounded-2xl text-xs lg:text-sm font-bold border outline-none transition-all appearance-none ${areBlocksDark ? 'bg-white/5 border-white/5 focus:border-[#ED1C24]/50' : 'bg-gray-50 border-gray-100 focus:border-[#ED1C24]/50'}`}
                            >
                              {[
                                { key: 'monday', value: 'Segunda' },
                                { key: 'tuesday', value: 'Terça' },
                                { key: 'wednesday', value: 'Quarta' },
                                { key: 'thursday', value: 'Quinta' },
                                { key: 'friday', value: 'Sexta' },
                                { key: 'saturday', value: 'Sábado' },
                                { key: 'sunday', value: 'Domingo' }
                              ].map(day => (
                                <option key={day.key} value={day.value}>{t(day.key)}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1.5 lg:space-y-2">
                          <label className="text-[8px] lg:text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">{t('pickup_time')}</label>
                          <input 
                            type="text" 
                            value={editData.pickupTime} 
                            onChange={e => setEditData({...editData, pickupTime: e.target.value})} 
                            placeholder="Ex: 20-40 min"
                            className={`w-full p-3.5 lg:p-5 rounded-xl lg:rounded-2xl text-xs lg:text-sm font-bold border outline-none transition-all ${areBlocksDark ? 'bg-white/5 border-white/5 focus:border-[#ED1C24]/50' : 'bg-gray-50 border-gray-100 focus:border-[#ED1C24]/50'}`} 
                          />
                        </div>
                      </div>
                    </div>

                    <div className={`${blockClass} p-6 lg:p-10 rounded-[32px] lg:rounded-[48px] border shadow-sm`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
                        <h4 className="text-xs lg:text-sm font-black uppercase flex items-center gap-2">
                          <MapPin size={16} lg:size={18} className="text-blue-500" /> {t('location')}
                        </h4>
                        <button 
                          onClick={detectLocation}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-500 rounded-lg lg:rounded-xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all"
                        >
                          <Target size={14} /> {t('detect_gps')}
                        </button>
                      </div>
                      
                      <div className="space-y-4 lg:space-y-6">
                        <div className="space-y-1.5 lg:space-y-2">
                          <label className="text-[8px] lg:text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">{t('full_address')}</label>
                          <textarea 
                            value={locationForm.address_text} 
                            onChange={e => setLocationForm({...locationForm, address_text: e.target.value})} 
                            className={`w-full p-4 lg:p-5 rounded-xl lg:rounded-2xl text-xs lg:text-sm font-bold border outline-none transition-all resize-none ${areBlocksDark ? 'bg-white/5 border-white/5 focus:border-blue-500/50' : 'bg-gray-50 border-gray-100 focus:border-blue-500/50'}`} 
                            rows={3} 
                            placeholder={t('full_address_placeholder')}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4 lg:gap-6">
                          <div className="space-y-1.5 lg:space-y-2">
                            <label className="text-[8px] lg:text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">{t('latitude')}</label>
                            <input 
                              type="number" 
                              value={locationForm.latitude} 
                              readOnly
                              className={`w-full p-3 lg:p-4 rounded-lg lg:rounded-xl text-[10px] lg:text-xs font-bold border bg-gray-500/5 border-transparent text-gray-400`} 
                            />
                          </div>
                          <div className="space-y-1.5 lg:space-y-2">
                            <label className="text-[8px] lg:text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">{t('longitude')}</label>
                            <input 
                              type="number" 
                              value={locationForm.longitude} 
                              readOnly
                              className={`w-full p-3 lg:p-4 rounded-lg lg:rounded-xl text-[10px] lg:text-xs font-bold border bg-gray-500/5 border-transparent text-gray-400`} 
                            />
                          </div>
                        </div>

                        <button 
                          onClick={handleSaveLocation}
                          disabled={isUpdating}
                          className="w-full py-4 lg:py-5 bg-gray-500/5 hover:bg-gray-500/10 rounded-xl lg:rounded-2xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          {t('save_location_btn')}
                        </button>
                      </div>
                    </div>
                  </div>
               </div>



               {/* Botão de Guardar Geral no Fundo */}
               <div className="flex justify-center pt-12 pb-16 border-t border-gray-100 dark:border-white/5">
                  <button 
                    type="button"
                    onClick={handleSaveGeneralInfo}
                    disabled={isUpdating}
                    className="w-full max-w-md flex items-center justify-center gap-4 px-12 py-6 bg-[#ED1C24] text-white rounded-[32px] font-black text-xs lg:text-sm uppercase tracking-widest shadow-2xl shadow-[#ED1C24]/30 active:scale-95 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                    {t('save_changes')}
                  </button>
               </div>
            </div>
          )}
        </div>
      </main>

      {isUpdating && <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md flex items-center justify-center"><Loader2 className="animate-spin text-white" size={64} /></div>}
    </div>
  );
};

export default DepositoScreen;
