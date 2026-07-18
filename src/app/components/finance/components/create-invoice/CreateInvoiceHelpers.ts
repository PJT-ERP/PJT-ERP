export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export const UNITS = ['Pcs', 'Unit', 'Ton', 'Kg', 'M', 'M2', 'M3', 'Set', 'Lot', 'LS'];
export const PAYMENT_TERMS = ['7 Hari', '14 Hari', '30 Hari', '45 Hari', '60 Hari', 'COD'];
export const PAYMENT_TYPES = ['Full Payment', 'Down Payment (DP)'];

let idCounter = 1;
export const newItem = (): LineItem => ({
  id: String(idCounter++),
  description: '',
  quantity: 1,
  unit: 'Pcs',
  unitPrice: 0,
});
