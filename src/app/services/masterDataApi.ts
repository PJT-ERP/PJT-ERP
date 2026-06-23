import apiClient from "./apiClient";

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
    }
};
