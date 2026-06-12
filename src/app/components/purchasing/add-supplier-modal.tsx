import { useState } from "react";
import { masterDataApi } from "../../services/masterDataApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface AddSupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddSupplierModal({ open, onOpenChange, onSuccess }: AddSupplierModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "PT",
    category: "",
    city: "",
    province: "",
    address: "",
    bankName: "",
    bankAccount: "",
    bankBranch: "",
    npwp: "",
    paymentTerms: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await masterDataApi.createSupplier({
        code: formData.code,
        name: formData.name,
        type: formData.type,
        category: formData.category,
        city: formData.city,
        province: formData.province,
        address: formData.address,
        status: "Active",
        bankName: formData.bankName,
        bankAccount: formData.bankAccount,
        bankBranch: formData.bankBranch,
        npwp: formData.npwp,
        paymentTerms: formData.paymentTerms,
        since: new Date().getFullYear().toString(),
        rating: 4.0,
        contacts: formData.contactName ? [{
          name: formData.contactName,
          phone: formData.contactPhone,
          email: formData.contactEmail,
          isPrimary: true
        }] : []
      });
      onSuccess();
      onOpenChange(false);
      setFormData({
        code: "", name: "", type: "PT", category: "", city: "", province: "", address: "",
        bankName: "", bankAccount: "", bankBranch: "", npwp: "", paymentTerms: "",
        contactName: "", contactPhone: "", contactEmail: ""
      });
    } catch (err) {
      console.error(err);
      alert("Failed to create supplier");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Supplier Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kode Supplier *</Label>
              <Input id="code" name="code" value={formData.code} onChange={handleChange} required placeholder="Contoh: SUP-030" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nama Perusahaan *</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required placeholder="Contoh: PT Sumber Baru" />
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
              <Label htmlFor="category">Kategori *</Label>
              <Input id="category" name="category" value={formData.category} onChange={handleChange} required placeholder="Contoh: Besi & Baja" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Alamat</Label>
            <Input id="address" name="address" value={formData.address} onChange={handleChange} placeholder="Alamat lengkap" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Kota</Label>
              <Input id="city" name="city" value={formData.city} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="province">Provinsi</Label>
              <Input id="province" name="province" value={formData.province} onChange={handleChange} />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold mb-3">Informasi Bank & Pajak</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Nama Bank</Label>
                <Input id="bankName" name="bankName" value={formData.bankName} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAccount">No Rekening</Label>
                <Input id="bankAccount" name="bankAccount" value={formData.bankAccount} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="npwp">NPWP</Label>
                <Input id="npwp" name="npwp" value={formData.npwp} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Termin Pembayaran</Label>
                <Input id="paymentTerms" name="paymentTerms" value={formData.paymentTerms} onChange={handleChange} placeholder="Contoh: Net 30" />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold mb-3">Kontak Utama</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName">Nama Kontak</Label>
                <Input id="contactName" name="contactName" value={formData.contactName} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">No. HP / Telepon</Label>
                <Input id="contactPhone" name="contactPhone" value={formData.contactPhone} onChange={handleChange} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="contactEmail">Email</Label>
                <Input id="contactEmail" name="contactEmail" type="email" value={formData.contactEmail} onChange={handleChange} />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading} className="bg-[#1e3a5f] hover:opacity-90 text-white">
              {loading ? "Menyimpan..." : "Simpan Supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
