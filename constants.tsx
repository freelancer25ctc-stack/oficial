
import { Depot } from './types';

// Removido MOCK_DEPOTS - O aplicativo agora consome dados exclusivamente do Supabase.
export const MOCK_DEPOTS: Depot[] = [];
export const RESERVATION_FEE = 250;

export const calculateReservationFee = (quantity: number): number => {
  const baseTotal = quantity * RESERVATION_FEE;
  if (quantity > 2) {
    // 8% de desconto para mais de 2 botijas
    return Math.round(baseTotal * 0.92);
  }
  return baseTotal;
};
