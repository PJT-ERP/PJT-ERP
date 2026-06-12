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

export const masterDataApi = {
    listSuppliers: async (): Promise<SupplierDto[]> => {
        const response = await apiClient.get<SupplierDto[]>("/api/v1/master-data/suppliers");
        return response.data;
    }
};
