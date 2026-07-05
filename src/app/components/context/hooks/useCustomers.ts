import { useRef, useState } from "react";
import { Customer } from "../../data/mockData";
import { salesApi } from "../../../services/salesApi";

export function useCustomers(
  refreshBackendData: () => Promise<void>,
) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [backendCustomerIdsByCode, setBackendCustomerIdsByCode] = useState<Record<string, string>>({});
  const pendingCustomersByCode = useRef<Record<string, Customer>>({});

  const addCustomer = (customer: Customer) => {
    pendingCustomersByCode.current[customer.code] = customer;
    setCustomers(prev => [...prev, customer]);

    salesApi.createCustomer({
      code: customer.code,
      name: customer.name,
      address: customer.address,
      contactPerson: customer.contactPerson || customer.contact,
      email: customer.email,
      phone: customer.phone,
    }).then(created => {
      setBackendCustomerIdsByCode(prev => ({ ...prev, [created.code]: created.id }));
    }).catch(err => {
      console.warn("Gagal simpan pelanggan ke backend", err);
      refreshBackendData();
    });
  };

  const updateCustomer = (code: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.code === code ? { ...c, ...updates } : c));
    salesApi.updateCustomer(code, {
      name: updates.name || "",
      address: updates.address,
      contactPerson: updates.contactPerson || updates.contact,
      email: updates.email,
      phone: updates.phone,
      isActive: true
    }).catch(err => {
      console.warn("Gagal update pelanggan ke backend", err);
      refreshBackendData();
    });
  };

  const deleteCustomerMaster = (code: string) => {
    setCustomers(prev => prev.filter(c => c.code !== code));
    salesApi.deleteCustomer(code).catch(err => {
      console.warn("Gagal menghapus pelanggan dari backend", err);
      refreshBackendData();
    });
  };

  return {
    customers,
    setCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomerMaster,
    backendCustomerIdsByCode,
    setBackendCustomerIdsByCode,
    pendingCustomersByCode,
  };
}
