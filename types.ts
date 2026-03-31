
export enum AppTab {
  HOME = 'home',
  MAP = 'map',
  ORDERS = 'orders',
  PROFILE = 'profile',
  DEPOT_DETAILS = 'depot_details',
  LOGIN = 'login',
  SIGNUP = 'signup',
  SEARCH = 'search',
  WALLET = 'wallet',
  ADMIN = 'admin',
  DEPOSITO = 'deposito',
  BALANCE_REQUESTS = 'balance_requests',
  POSTS = 'posts',
  FAVORITES = 'favorites',
  ORDER_TRACKING = 'order_tracking',
  NOTIFICATIONS = 'notifications',
  PASSWORD_RECOVERY = 'password_recovery',
  RESET_PASSWORD = 'reset_password'
}

export enum UserType {
  CLIENTE = 'CLIENTE',
  ADMIN = 'ADMIN',
  DEPOSITO = 'DEPOSITO'
}

export enum OrderType {
  RESERVATION = 'Reserva (Levantamento)',
  PICKUP = 'Reservar (Levantamento)'
}

export interface Review {
  id: string;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  address_text: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
  created_at?: string;
}

export interface Depot {
  id: string;
  name: string;
  rating: number;
  reviewCount?: number;
  reviews?: Review[];
  distance: string;
  price: number;
  dieselPrice?: string;
  petrolPrice?: string;
  imageUrl: string;
  address: string;
  pickupTime: string;
  stock: number;
  isVerified?: boolean;
  category?: 'Premium' | 'Express' | 'Económico';
  isOpen?: boolean;
  openingHours: string;
  horarioAbertura?: string;
  horarioFecho?: string;
  diasDeAbertura?: string;
  diasDeFecho?: string;
  workingDays?: string;
  phone: string;
  latitude: number;
  longitude: number;
}

export interface Product {
  id: string;
  depot_id: string;
  bottle_type: string;
  price: number;
  stock: number;
  is_active: boolean;
  created_at?: string;
}

export enum OrderStatus {
  PENDING = 'Pendente',
  CONFIRMED = 'Confirmado',
  OUT_FOR_DELIVERY = 'Pronto para Levantamento',
  DELIVERED = 'Levantado',
  CANCELLED = 'Cancelado',
  READY_FOR_PICKUP = 'Pronto para Levantar'
}

export interface Order {
  id: string;
  user_id?: string;
  depot_id?: string;
  depotId?: string;
  depotName: string;
  status: OrderStatus;
  date: string;
  total: number;
  discount?: number;
  items: string;
  trackingProgress: number;
  orderType: OrderType;
  isRated?: boolean;
  userRating?: number;
  bottleType?: string;
  quantity?: number;
  createdAt?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string;
  userType: UserType;
  companyId?: string;
  balance?: number;
  avatar?: string;
  favorites?: string[];
  depotId?: string;
  depot_id?: string;
  is_active?: boolean;
  is_verified?: boolean;
  created_at?: string;
  theme_preference?: 'light' | 'dark' | 'system';
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'in' | 'out';
  category: 'deposit' | 'payment' | 'transfer' | 'refund';
  amount: number;
  description: string;
  created_at: string;
}

export interface DepositRequest {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  reference_code?: string;
  proof_url?: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'promo' | 'order' | 'system' | 'wallet';
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  button_text: string;
  image_url?: string;
  icon_name?: string;
  gradient_from: string;
  gradient_to: string;
  is_active: boolean;
  order_index: number;
  button_link?: string;
  created_at?: string;
}
