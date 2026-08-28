import { useEffect, useState } from "react";
import { masterDataApi, SupplierDto } from "../../services/masterDataApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface AddSupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  supplier?: SupplierDto | null;
}

const emptyForm = {
  code: "",
  name: "",
  type: "PT",
  category: "",
  city: "",
  province: "",
  address: "",
  status: "Active",
  bankName: "",
  bankAccount: "",
  bankBranch: "",
  npwp: "",
  paymentTerms: "",
  contactName: "",
  contactRole: "",
  contactPhone: "",
  contactEmail: "",
};

export function AddSupplierModal({ open, onOpenChange, onSuccess, supplier }: AddSupplierModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const isEditMode = Boolean(supplier);

  useEffect(() => {
    if (!open) return;
    setErrorMessage("");

    if (!supplier) {
      setFormData({
        ...emptyForm,
        code: "Memuat..."
      });
      masterDataApi.getNextSupplierCode().then(res => {
        setFormData(f => ({ ...f, code: res.code }));
      }).catch(() => {
        setFormData(f => ({ ...f, code: "Otomatis" }));
      });
      return;
    }

    const primaryContact = supplier.contacts?.find(contact => contact.isPrimary) || supplier.contacts?.[0];
    setFormData({
      code: supplier.code || "",
      name: supplier.name || "",
      type: supplier.type || "PT",
      category: supplier.category || "",
      city: supplier.city || "",
      province: supplier.province || "",
      address: supplier.address || "",
      status: supplier.status || "Active",
      bankName: supplier.bankName || "",
      bankAccount: supplier.bankAccount || "",
      bankBranch: supplier.bankBranch || "",
      npwp: supplier.npwp || "",
      paymentTerms: supplier.paymentTerms || "",
      contactName: primaryContact?.name || "",
      contactRole: primaryContact?.role || "",
      contactPhone: primaryContact?.phone || "",
      contactEmail: primaryContact?.email || "",
    });
  }, [open, supplier]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setErrorMessage("");
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        category: formData.category,
        city: formData.city,
        province: formData.province,
        address: formData.address,
        status: formData.status,
        bankName: formData.bankName,
        bankAccount: formData.bankAccount,
        bankBranch: formData.bankBranch,
        npwp: formData.npwp,
        paymentTerms: formData.paymentTerms,
        since: supplier?.since || new Date().getFullYear().toString(),
        rating: supplier?.rating ?? 0,
        contacts: formData.contactName ? [{
          name: formData.contactName,
          role: formData.contactRole,
          phone: formData.contactPhone,
          email: formData.contactEmail,
          isPrimary: true
        }] : []
      };

      if (isEditMode && supplier) {
        await masterDataApi.updateSupplier(supplier.code, payload);
      } else {
        await masterDataApi.createSupplier({
          code: formData.code,
          ...payload,
        });
      }
      onSuccess();
      onOpenChange(false);
      setFormData(emptyForm);
    } catch (err: any) {
      console.error(err);
      const status = err?.response?.status;
      const backendMessage = err?.response?.data?.message || err?.response?.data?.title || err?.message;
      if (status === 404 || status === 405) {
        setErrorMessage("Endpoint edit supplier belum aktif di backend yang sedang berjalan. Rebuild/restart MasterData API lalu coba lagi.");
      } else if (status === 409) {
        setErrorMessage("Kode atau data supplier bentrok dengan data yang sudah ada.");
      } else if (status >= 500) {
        setErrorMessage("Server gagal menyimpan supplier. Cek log MasterData API untuk detail error.");
      } else {
        setErrorMessage(backendMessage || (isEditMode ? "Gagal mengubah supplier. Periksa data lalu coba lagi." : "Gagal membuat supplier. Periksa data lalu coba lagi."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Supplier" : "Tambah Supplier Baru"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4" autoComplete="off">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kode Supplier <span className="text-[#C8102E]">*</span></Label>
              <Input id="code" name="code" value={formData.code} onChange={handleChange} disabled placeholder="Auto-generated" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nama Perusahaan <span className="text-[#C8102E]">*</span></Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required placeholder="Contoh: PT Sumber Baru" maxLength={160} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipe Badan Usaha</Label>
              <select 
                id="type" name="type" value={formData.type} onChange={handleChange}
                className="w-full rounded border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100" style={{ borderColor: "#e2e8f0", fontSize: 13 }}
              >
                <option value="PT">PT</option>
                <option value="CV">CV</option>
                <option value="UD">UD</option>
                <option value="Perseorangan">Perseorangan</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Kategori <span className="text-[#C8102E]">*</span></Label>
              <Input id="category" name="category" value={formData.category} onChange={handleChange} required placeholder="Contoh: Besi & Baja" maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status" name="status" value={formData.status} onChange={handleChange}
                className="w-full rounded border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100" style={{ borderColor: "#e2e8f0", fontSize: 13 }}
              >
                <option value="Active">Active</option>
                <option value="On Hold">On Hold</option>
                <option value="Inactive">Inactive</option>
                <option value="Blacklisted">Blacklisted</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Alamat</Label>
            <Input id="address" name="address" value={formData.address} onChange={handleChange} placeholder="Alamat lengkap" maxLength={400} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Kota</Label>
              <Input id="city" name="city" value={formData.city} onChange={handleChange} maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="province">Provinsi</Label>
              <Input id="province" name="province" value={formData.province} onChange={handleChange} maxLength={120} />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold mb-3">Informasi Bank & Pajak</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Nama Bank</Label>
                <Input id="bankName" name="bankName" value={formData.bankName} onChange={handleChange} maxLength={120} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAccount">No Rekening</Label>
                <Input id="bankAccount" name="bankAccount" value={formData.bankAccount} onChange={handleChange} maxLength={80} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="npwp">NPWP</Label>
                <Input id="npwp" name="npwp" value={formData.npwp} onChange={handleChange} maxLength={80} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Termin Pembayaran</Label>
                <Input id="paymentTerms" name="paymentTerms" value={formData.paymentTerms} onChange={handleChange} placeholder="Contoh: Net 30" maxLength={80} />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold mb-3">Kontak Utama</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName">Nama Kontak</Label>
                <Input id="contactName" name="contactName" value={formData.contactName} onChange={handleChange} maxLength={120} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactRole">Jabatan</Label>
                <Input id="contactRole" name="contactRole" value={formData.contactRole} onChange={handleChange} maxLength={120} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">No. HP / Telepon</Label>
                <Input id="contactPhone" name="contactPhone" value={formData.contactPhone} onChange={handleChange} maxLength={40} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="contactEmail">Email</Label>
                <Input id="contactEmail" name="contactEmail" type="email" value={formData.contactEmail} onChange={handleChange} maxLength={160} />
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading} className="bg-[#1e3a5f] hover:opacity-90 text-white">
              {loading ? "Menyimpan..." : isEditMode ? "Simpan Perubahan" : "Simpan Supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
