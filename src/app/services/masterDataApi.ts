import apiClient from "./apiClient";

export interface CustomerDto {
    id: string;
    code: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    status: string;
    createdAtUtc: string;
    updatedAtUtc: string;
}

export interface ProductDto {
    id: string;
    partNumber: string;
    description: string;
    unit: string;
    bomItems: Array<{
        id: string;
        inventoryItemId: string;
        inventoryItemCode: string;
        inventoryItemName: string;
        quantity: number;
        unit: string;
    }>;
}

export interface InventoryItemDto {
    id: string;
    code: string;
    name: string;
    category: string;
    unit: string;
    currentStock: number;
    minStock: number;
    maxStock: number;
    reorderPoint: number;
    location: string;
    supplierName: string;
    unitPrice: number;
    createdAtUtc: string;
    updatedAtUtc: string;
}

export interface CreateInventoryItemRequest {
    code: string;
    name: string;
    category: string;
    unit: string;
    currentStock: number;
    minStock: number;
    maxStock: number;
    reorderPoint: number;
    location: string;
    supplierName: string;
    unitPrice: number;
}

export interface SupplierDto {
    id: string;
    code: string;
    name: string;
    type: string;
    category: string;
    city?: string;
    province?: string;
    address?: string;
    status: string;
    bankName?: string;
    bankAccount?: string;
    bankBranch?: string;
    npwp?: string;
    paymentTerms?: string;
    since?: string;
    rating: number;
    contacts: SupplierContactDto[];
    createdAtUtc: string;
    updatedAtUtc: string;
}

export interface SupplierContactDto {
    id: string;
    name: string;
    role?: string;
    phone?: string;
    email?: string;
    isPrimary: boolean;
}

export interface CreateSupplierRequest {
    code: string;
    name: string;
    type: string;
    category: string;
    city?: string;
    province?: string;
    address?: string;
    status: string;
    bankName?: string;
    bankAccount?: string;
    bankBranch?: string;
    npwp?: string;
    paymentTerms?: string;
    since?: string;
    rating: number;
    contacts: CreateSupplierContactRequest[];
}

export type UpdateSupplierRequest = Omit<CreateSupplierRequest, "code">;

export interface CreateSupplierContactRequest {
    name: string;
    role?: string;
    phone?: string;
    email?: string;
    isPrimary: boolean;
}

export const masterDataApi = {
    listSuppliers: async (): Promise<SupplierDto[]> => {
        const response = await apiClient.get<SupplierDto[]>("/api/v1/master-data/suppliers");
        return response.data;
    },
    getNextSupplierCode: async (): Promise<{ code: string }> => {
        const response = await apiClient.get<{ code: string }>("/api/v1/master-data/suppliers/next-code");
        return response.data;
    },
    createSupplier: async (request: CreateSupplierRequest): Promise<SupplierDto> => {
        const response = await apiClient.post<SupplierDto>("/api/v1/master-data/suppliers", request);
        return response.data;
    },
    updateSupplier: async (code: string, request: UpdateSupplierRequest): Promise<SupplierDto> => {
        const response = await apiClient.put<SupplierDto>(`/api/v1/master-data/suppliers/${code}`, request);
        return response.data;
    },
    deleteSupplier: async (code: string): Promise<void> => {
        await apiClient.delete(`/api/v1/master-data/suppliers/${code}`);
    },
    listInventory: async (): Promise<InventoryItemDto[]> => {
        const response = await apiClient.get<InventoryItemDto[]>("/api/v1/master-data/inventory");
        return response.data;
    },
    createInventoryItem: async (request: CreateInventoryItemRequest): Promise<InventoryItemDto> => {
        const response = await apiClient.post<InventoryItemDto>("/api/v1/master-data/inventory", request);
        return response.data;
    },
    updateInventoryItem: async (id: string, request: CreateInventoryItemRequest): Promise<InventoryItemDto> => {
        const response = await apiClient.put<InventoryItemDto>(`/api/v1/master-data/inventory/${id}`, request);
        return response.data;
    },
    deleteInventoryItem: async (id: string): Promise<void> => {
        await apiClient.delete(`/api/v1/master-data/inventory/${id}`);
    },
    updateProductBom: async (id: string, request: { bomItems: { inventoryItemId: string; quantity: number }[] }): Promise<void> => {
        await apiClient.put(`/api/v1/master-data/products/${id}/bom`, request);
    },
    listProducts: async (): Promise<Array<{
        id: string;
        partNumber: string;
        description: string;
        unit: string;
        bomItems: Array<{
            id: string;
            inventoryItemId: string;
            inventoryItemCode: string;
            inventoryItemName: string;
            quantity: number;
            unit: string;
        }>;
    }>> => {
        const response = await apiClient.get('/api/v1/master-data/products');
        return response.data;
    },

    getCustomer: async (id: string): Promise<CustomerDto> => {
        const response = await apiClient.get<CustomerDto>(`/api/v1/master-data/customers/${id}`);
        return response.data;
    },

    getProduct: async (id: string): Promise<ProductDto> => {
        const response = await apiClient.get<ProductDto>(`/api/v1/master-data/products/${id}`);
        return response.data;
    },

    deductBomMaterials: async (request: { salesOrderId: string, items: { inventoryItemId: string, quantity: number }[] }): Promise<void> => {
        await apiClient.post('/api/v1/master-data/inventory/deduct-bom', request);
    },
};
