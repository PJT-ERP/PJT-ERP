import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ProtectedRoute } from '../../../components/layout/ProtectedRoute';
import { EngineeringTasksPage } from '../tasks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EngineeringTaskDetailPage } from '../task-detail';
import { ProductionMaterialRequestPage } from '../../Production/material-request';
import { useApp } from "../../../components/context/AppContext";

vi.mock('../../../components/context/AppContext', () => ({
  useApp: vi.fn(),
}));

vi.mock('../../../services/queries', () => ({
  useProductsQuery: vi.fn().mockReturnValue({ data: [] }),
  useCustomersQuery: vi.fn().mockReturnValue({ data: [] }),
  usePurchasingRequestsQuery: vi.fn().mockReturnValue({ data: [] }),
  useSalesOrdersQuery: vi.fn().mockReturnValue({ data: [{ id: 'SO-123', status: 'Pending Design', backendId: '123' }] }),
}));

vi.mock('../../../services/masterDataApi', () => ({
  masterDataApi: {
    listInventory: vi.fn().mockResolvedValue([]),
    createPurchaseRequest: vi.fn(),
  }
}));

vi.mock('../../../services/salesApi', () => ({
  salesApi: {
    listSalesOrders: vi.fn().mockResolvedValue([
      { 
        id: 'SO-123', 
        soNumber: 'SO-123',
        description: 'Test Order', 
        status: 'Design',
        backendDesignStatus: 'Design',
        designAssignedTo: 'reg-eng-1',
        designLink: '',
        rejectionReason: '',
        items: []
      }
    ]),
    updateSalesOrderDesignStatus: vi.fn().mockResolvedValue({}),
    submitSalesOrderDesign: vi.fn().mockResolvedValue({}),
  }
}));

vi.mock('../../../components/layout/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar" />
}));

const renderWithProtection = (ui: React.ReactElement, role: string, initialRoute: string) => {
  vi.mocked(useApp).mockReturnValue({
    currentUser: { role },
    salesOrders: [{ id: 'SO-123', description: 'Test Order' }],
    customers: [],
    users: [],
    purchasingRequests: [],
  } as any);

  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/erp/engineer-tasks" element={
            <ProtectedRoute allowedRoles={['Admin', 'Owner', 'Engineering Supervisor']}>
              <EngineeringTasksPage />
            </ProtectedRoute>
          } />
          <Route path="/erp/engineer-tasks/:id" element={
            <ProtectedRoute allowedRoles={['Engineering', 'Admin', 'Owner', 'Engineering Supervisor']}>
              <EngineeringTaskDetailPage />
            </ProtectedRoute>
          } />
          <Route path="/erp/production/mr/:id" element={
            <ProtectedRoute allowedRoles={['Admin', 'Owner', 'Engineering Supervisor']}>
              <ProductionMaterialRequestPage />
            </ProtectedRoute>
          } />
          <Route path="/erp" element={<div>Access Denied</div>} />
          <Route path="/unauthorized" element={<div>Access Denied</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Engineering Roles & Routing (New Flow)', () => {
  describe('Regular Engineer', () => {
    it('is blocked from accessing Engineering Tasks (Tugas Desain)', () => {
      renderWithProtection(<EngineeringTasksPage />, 'Engineering', '/erp/engineer-tasks');
      expect(screen.queryByText('Daftar Tugas Desain')).not.toBeInTheDocument();
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    it('is blocked from accessing Material Request page', () => {
      renderWithProtection(<ProductionMaterialRequestPage />, 'Engineering', '/erp/production/mr/SO-123');
      expect(screen.queryByText('Ajukan Material Request')).not.toBeInTheDocument();
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    it('is allowed to access Task Detail page (via QR) but strictly in read-only mode', async () => {
      renderWithProtection(<EngineeringTaskDetailPage />, 'Engineering', '/erp/engineer-tasks/SO-123');
      
      // Page should render successfully
      expect(await screen.findByText('Instruksi / Referensi dari Sales')).toBeInTheDocument();
      expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
      
      // Action buttons should NOT be present (Form is read-only)
      expect(screen.queryByText('Submit & Forward')).not.toBeInTheDocument();
      expect(screen.queryByText('Tambah Material')).not.toBeInTheDocument();
    });
  });

  describe('Engineering Supervisor', () => {
    it('is allowed to access Engineering Tasks (Tugas Desain)', () => {
      renderWithProtection(<EngineeringTasksPage />, 'Engineering Supervisor', '/erp/engineer-tasks');
      expect(screen.getByText('Daftar Tugas Desain')).toBeInTheDocument();
      expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
    });

    it('is allowed to access Material Request page', () => {
      renderWithProtection(<ProductionMaterialRequestPage />, 'Engineering Supervisor', '/erp/production/mr/SO-123');
      expect(screen.getByText('Ajukan Material Request', { selector: 'button' })).toBeInTheDocument();
      expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
    });
  });
});
