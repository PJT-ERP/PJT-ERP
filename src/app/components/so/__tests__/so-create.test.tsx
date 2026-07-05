import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SOCreate } from '../so-create';
import { useApp } from '../../context/AppContext';

vi.mock('../../context/AppContext', () => ({ useApp: vi.fn() }));

vi.mock('../../../services/salesApi', () => ({
  salesApi: {
    listCustomers: vi.fn().mockResolvedValue([]),
    listProducts: vi.fn().mockResolvedValue([]),
    listSalesOrders: vi.fn().mockResolvedValue([]),
    getNextCustomerCode: vi.fn().mockResolvedValue({ code: 'CUST-020' }),
    createCustomer: vi.fn().mockResolvedValue({ id: 'cust-1', code: 'CUST-020' }),
    createProduct: vi.fn().mockResolvedValue({ id: 'prod-1' }),
    createSalesOrder: vi.fn().mockResolvedValue({ id: 'so-1', soNumber: 'SO-2026-076' }),
  },
}));

const mockProductCatalog = [
  {
    id: 'prod-1', label: 'PART-001 - Shaft D20', partNumber: 'PART-001', unit: 'pcs',
    materialSpec: 'S45C Carbon Steel, D20mm x 150mm',
    bomItems: [
      { inventoryItemId: 'inv-1', inventoryItemCode: 'MAT-001', inventoryItemName: 'S45C Round Bar D20', quantity: 1, unit: 'batang' },
    ],
  },
];

describe('SOCreate Component', () => {
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useApp).mockReturnValue({
      customers: [{ code: 'CUST-001', name: 'PT Maju Jaya', contactPerson: 'Budi', phone: '0812', email: 'budi@maju.com', address: 'Jakarta', contact: 'budi@maju.com' }],
      productCatalog: mockProductCatalog,
      salesOrders: [],
      currentUser: { id: 'u1', role: 'Sales', name: 'Sales Staff' },
      users: [],
      updateSalesOrder: vi.fn(),
      refreshBackendData: vi.fn().mockResolvedValue(undefined),
      purchasingRequests: [],
    } as any);
  });

  it('renders order type selection cards', () => {
    render(<SOCreate onNavigate={onNavigate} />);
    expect(screen.getByText('Pesanan Baru (New Order)')).toBeInTheDocument();
    expect(screen.getByText('Repeat Order')).toBeInTheDocument();
  });

  it('navigates to new order form', async () => {
    render(<SOCreate onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Pesanan Baru (New Order)'));
    await waitFor(() => expect(screen.getByText('Submit Sales Order')).toBeInTheDocument());
  });

  it('shows customer info and detail order sections', async () => {
    render(<SOCreate onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Pesanan Baru (New Order)'));
    await waitFor(() => {
      expect(screen.getByText('Informasi Pelanggan')).toBeInTheDocument();
      expect(screen.getByText('Detail Order')).toBeInTheDocument();
    });
  });

  it('allows switching to Pelanggan Terdaftar tab', async () => {
    render(<SOCreate onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Pesanan Baru (New Order)'));
    await waitFor(() => fireEvent.click(screen.getByText('Pelanggan Terdaftar')));
    await waitFor(() => expect(screen.getByPlaceholderText('Cari nama, kode, atau PIC pelanggan...')).toBeInTheDocument());
  });

  it('shows Terdaftar / Custom product type toggle', async () => {
    render(<SOCreate onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Pesanan Baru (New Order)'));
    await waitFor(() => {
      expect(screen.getByText('Terdaftar')).toBeInTheDocument();
      expect(screen.getByText('Custom')).toBeInTheDocument();
    });
  });

  it('shows Add Product button in product list', async () => {
    render(<SOCreate onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Pesanan Baru (New Order)'));
    await waitFor(() => expect(screen.getByText('Tambah Produk')).toBeInTheDocument());
  });

  it('shows Penetapan Harga section in new order form', async () => {
    render(<SOCreate onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Pesanan Baru (New Order)'));
    await waitFor(() => expect(screen.getByText('Penetapan Harga')).toBeInTheDocument());
  });
});
