import React, { useState } from "react";
import { Plus, Edit2, Trash2, Users, Building2, CheckCircle, XCircle, Search, X } from "lucide-react";
import { useApp } from "../../components/context/AppContext";
import { useCustomersQuery, useCreateCustomerMutation, useUpdateCustomerMutation, useDeleteCustomerMutation } from "../../services/queries";
import { User, Customer, UserRole } from "../../components/data/mockData";

const S = {
  font: "Inter, sans-serif",
  navy: "#1F1F1F",
  cyan: "#C8102E",
  slate: "#111827",
  secondary: "#64748B",
  border: "#E2E8F0",
  bg: "#F8FAFC",
  white: "#FFFFFF",
  cardBorder: "#E2E8F0",
};

const ROLES: UserRole[] = ['Sales', 'Engineering', 'Admin', 'Finance', 'Purchasing', 'QC'];

function getRoleColors(role: string) {
  switch (role) {
    case 'Owner': return { bg: '#FFEDD5', text: '#C2410C', border: '#FED7AA' };
    case 'Admin': return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
    case 'Engineering Supervisor': return { bg: '#F3E8FF', text: '#9333EA', border: '#E9D5FF' }; // Purple
    case 'Engineering': return { bg: '#FFE4E6', text: '#E11D48', border: '#FECDD3' }; // Rose / Red
    case 'Finance': return { bg: '#DCFCE7', text: '#16A34A', border: '#BBF7D0' };
    case 'Purchasing': return { bg: '#CCFBF1', text: '#0D9488', border: '#99F6E4' };
    case 'QC': return { bg: '#FEF9C3', text: '#A16207', border: '#FEF08A' }; // Yellow
    default: return { bg: '#DBEAFE', text: '#1D4ED8', border: '#BFDBFE' }; // Sales
  }
}

function RoleBadge({ role }: { role: string }) {
  const cfg = getRoleColors(role);
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 4, border: `1px solid ${cfg.border}`, background: cfg.bg, color: cfg.text, fontSize: "11px", fontWeight: 500, whiteSpace: "nowrap" }}>
        {role}
      </span>
    </div>
  );
}

function UserFormModal({ user, onClose }: { user?: User; onClose: () => void }) {
  const { addUser, updateUser } = useApp();
  const isActuallyEngSpv = user?.role === 'Engineering Supervisor';
  const initialRole = isActuallyEngSpv ? 'Engineering' : (user?.role ?? 'Sales');

  const [form, setForm] = useState({
    name: user?.name ?? '',
    username: user?.username ?? '',
    password: user?.password ?? '',
    email: user?.email ?? '',
    role: initialRole as UserRole,
    isActive: user?.isActive ?? true,
    isSupervisor: isActuallyEngSpv,
  });

  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmitting(true);
    const finalRole = (form.role === 'Engineering' && form.isSupervisor) ? 'Engineering Supervisor' : form.role;

    const submitData = {
      name: form.name,
      username: form.email,
      password: form.password,
      email: form.email,
      role: finalRole as UserRole,
      isActive: form.isActive
    };

    let success = false;
    if (user) {
      success = await updateUser(user.id, submitData);
    } else {
      success = await addUser(submitData);
    }
    
    setIsSubmitting(false);
    if (success) {
      onClose();
    } else {
      setErrorMsg("Gagal menyimpan data user. Pastikan email belum digunakan oleh user lain dan koneksi stabil.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{ fontFamily: S.font }}>
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 450, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${S.border}` }}>
          <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>{user ? 'Edit User' : 'Tambah User Baru'}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px" }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {errorMsg && (
            <div style={{ padding: "10px", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, color: "#DC2626", fontSize: "13px" }}>
              {errorMsg}
            </div>
          )}
          <div>
            <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Nama Lengkap <span className="text-[#C8102E]">*</span></label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Email / Username <span className="text-[#C8102E]">*</span></label>
              <input type="email" autoComplete="off" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Password {user ? '' : '*'}</label>
              <input type="password" autoComplete="new-password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required={!user} placeholder={user ? "Kosongkan jika tidak diubah" : "Password baru"} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", outline: "none", boxSizing: "border-box" }} />
              {user && <span style={{ fontSize: "11px", color: S.secondary, marginTop: 4, display: "block" }}>Disembunyikan karena alasan keamanan.</span>}
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Role <span className="text-[#C8102E]">*</span></label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", outline: "none", boxSizing: "border-box", background: S.white }}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {form.role === 'Engineering' && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F3E8FF", border: "1px solid #E9D5FF", borderRadius: 8, padding: "10px 12px" }}>
              <input type="checkbox" id="isSupervisor" checked={form.isSupervisor} onChange={e => setForm(f => ({ ...f, isSupervisor: e.target.checked }))} style={{ accentColor: "#9333EA" }} />
              <label htmlFor="isSupervisor" style={{ fontSize: "13px", color: "#6B21A8", cursor: "pointer" }}>
                Supervisor <span style={{ fontSize: "12px", color: "#9333EA" }}>— dapat mengakses Inspeksi QC</span>
              </label>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
            <label htmlFor="isActive" style={{ fontSize: "13.5px", color: S.slate, cursor: "pointer" }}>Akun Aktif</label>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" disabled={isSubmitting} onClick={onClose} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
            <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: "10px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer", opacity: isSubmitting ? 0.7 : 1 }}>{isSubmitting ? "Menyimpan..." : "Simpan"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CustomerFormModal({ customer, onClose }: { customer?: Customer; onClose: () => void }) {
  const { data: customers = [] } = useCustomersQuery();
  const { mutateAsync: addCustomer } = useCreateCustomerMutation();
  const { mutateAsync: updateCustomer } = useUpdateCustomerMutation();
  
  const generateCode = () => {
    const maxNum = customers.reduce((max, c) => {
      const match = c.code.match(/\d+/);
      const num = match ? parseInt(match[0], 10) : 0;
      return num < 9000 ? Math.max(max, num) : max;
    }, 0);
    return `CUST-${String(maxNum + 1).padStart(3, "0")}`;
  };
  const nextCode = customer?.code || generateCode();

  const [form, setForm] = useState({
    code: nextCode,
    name: customer?.name ?? '',
    contact: customer?.contact ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
    address: customer?.address ?? '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customer) {
      updateCustomer({ code: customer.code, data: { ...form, contactPerson: form.contact } });
    } else {
      addCustomer({ ...form, contactPerson: form.contact });
    }
    onClose();
  };

  const labelStyle = { display: "block", fontSize: "11.5px", fontWeight: 500, color: "#475569", marginBottom: 4, fontFamily: S.font };
  const inputStyle = { width: "100%", boxSizing: "border-box" as const, background: "#FAFAFA", border: `1px solid ${S.border}`, borderRadius: 4, padding: "7px 10px", fontSize: "12.5px", color: S.slate, fontFamily: S.font, outline: "none", transition: "border-color 0.12s, background 0.12s" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)" }} onClick={onClose} />

      <div style={{ position: "relative", zIndex: 1, background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", borderRadius: 8, border: `1px solid ${S.border}`, width: "100%", maxWidth: 520, margin: "0 16px", fontFamily: S.font }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(200,16,46,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={14} style={{ color: S.cyan }} />
            </div>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: S.slate }}>
              {customer ? "Edit Pelanggan" : "Tambah Pelanggan"}
            </p>
          </div>
          <button onClick={onClose}
            style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, border: `1px solid ${S.border}`, background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", color: S.secondary, cursor: "pointer", transition: "all 0.1s" }}
            onMouseEnter={e => { (e.currentTarget).style.background = "#FEF2F2"; (e.currentTarget).style.color = "#EF4444"; (e.currentTarget).style.borderColor = "#FCA5A5"; }}
            onMouseLeave={e => { (e.currentTarget).style.background = S.white; (e.currentTarget).style.color = S.secondary; (e.currentTarget).style.borderColor = S.border; }}
          >
            <X size={13} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Kode</label>
                <input style={{...inputStyle, background: S.bg, cursor: "not-allowed", color: S.secondary}} type="text" value={form.code} disabled={true} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Perusahaan <span style={{ color: "#EF4444", marginLeft: 2 }}>*</span></label>
                <input style={inputStyle} type="text" placeholder="PT / CV ..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required onFocus={e => { e.currentTarget.style.borderColor = S.cyan; e.currentTarget.style.background = S.white; }} onBlur={e => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.background = "#FAFAFA"; }} />
              </div>
              <div>
                <label style={labelStyle}>Nama Kontak (PIC) <span style={{ color: "#EF4444", marginLeft: 2 }}>*</span></label>
                <input style={inputStyle} type="text" placeholder="Nama kontak" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} required onFocus={e => { e.currentTarget.style.borderColor = S.cyan; e.currentTarget.style.background = S.white; }} onBlur={e => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.background = "#FAFAFA"; }} />
              </div>
              <div>
                <label style={labelStyle}>No. Telepon <span style={{ color: "#EF4444", marginLeft: 2 }}>*</span></label>
                <input style={inputStyle} type="tel" placeholder="08xxxxxxxxxx" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/[^\d+-]/g, '') }))} required onFocus={e => { e.currentTarget.style.borderColor = S.cyan; e.currentTarget.style.background = S.white; }} onBlur={e => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.background = "#FAFAFA"; }} />
              </div>
              <div>
                <label style={labelStyle}>Email <span style={{ color: "#EF4444", marginLeft: 2 }}>*</span></label>
                <input style={inputStyle} type="email" placeholder="email@perusahaan.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required onFocus={e => { e.currentTarget.style.borderColor = S.cyan; e.currentTarget.style.background = S.white; }} onBlur={e => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.background = "#FAFAFA"; }} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Alamat Lengkap <span style={{ color: "#EF4444", marginLeft: 2 }}>*</span></label>
              <input style={inputStyle} type="text" placeholder="Jl. ... No. ..., Kecamatan, Kota" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} required onFocus={e => { e.currentTarget.style.borderColor = S.cyan; e.currentTarget.style.background = S.white; }} onBlur={e => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.background = "#FAFAFA"; }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, padding: "12px 20px", borderTop: `1px solid ${S.border}`, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose}
              style={{ padding: "7px 16px", borderRadius: 4, border: `1px solid ${S.border}`, background: S.white, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12), 0 4px 10px -4px rgba(0,0,0,0.08)", color: S.secondary, fontSize: "12.5px", cursor: "pointer", fontFamily: S.font, transition: "background 0.1s" }}
              onMouseEnter={e => (e.currentTarget.style.background = S.bg)}
              onMouseLeave={e => (e.currentTarget.style.background = S.white)}
            >Batal</button>
            <button type="submit"
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 18px", borderRadius: 4, border: "none", background: S.cyan, color: "#fff", fontSize: "12.5px", fontWeight: 500, cursor: "pointer", fontFamily: S.font, transition: "opacity 0.1s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              <CheckCircle size={13} />
              {customer ? "Simpan Perubahan" : "Simpan Pelanggan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: { isOpen: boolean, title: string, message: string, onConfirm: () => void, onCancel: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{ fontFamily: S.font }}>
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", padding: 24, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
        <h3 style={{ margin: "0 0 8px", color: S.slate, fontSize: "18px", fontWeight: 600 }}>{title}</h3>
        <p style={{ margin: "0 0 24px", color: S.secondary, fontSize: "14px", lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button onClick={onCancel} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${S.border}`, background: S.white, color: S.slate, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
          <button onClick={onConfirm} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: S.cyan, color: S.white, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Hapus</button>
        </div>
      </div>
    </div>
  );
}

export function AdminPage() {
  const { users, currentUser, deleteUser } = useApp();
  const { data: customers = [] } = useCustomersQuery();
  const { mutate: deleteCustomerMaster } = useDeleteCustomerMutation();
  const [tab, setTab] = useState<'users' | 'customers'>('users');
  const [showUserForm, setShowUserForm] = useState(false);
  const [showCustForm, setShowCustForm] = useState(false);
  const [editUser, setEditUser] = useState<User | undefined>(undefined);
  const [editCustomer, setEditCustomer] = useState<Customer | undefined>(undefined);
  const [userSearch, setUserSearch] = useState('');
  const [custSearch, setCustSearch] = useState('');
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);

  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase();
    return !userSearch || u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const filteredCustomers = customers.filter(c => {
    const q = custSearch.toLowerCase();
    return !custSearch || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.contact.toLowerCase().includes(q);
  });

  const handleDeleteUserClick = (id: string) => {
    if (id === currentUser?.id) return;
    setUserToDelete(id);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUser(userToDelete);
      setUserToDelete(null);
    }
  };

  const handleDeleteCustomerClick = (code: string) => {
    setCustomerToDelete(code);
  };

  const confirmDeleteCustomer = () => {
    if (customerToDelete) {
      deleteCustomerMaster(customerToDelete);
      setCustomerToDelete(null);
    }
  };

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px", fontFamily: S.font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ color: S.slate, margin: 0 }}>Manajemen Akun & Data Master</h1>
          <p style={{ color: S.secondary, fontSize: "13px", marginTop: 2 }}>
            Kelola akun user dan data master customer
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: S.bg, padding: 4, borderRadius: 8, width: "fit-content" }}>
        <button onClick={() => setTab('users')}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 6, fontSize: "13.5px", fontWeight: 500, cursor: "pointer", transition: "all 0.1s", border: "none",
            background: tab === 'users' ? S.white : "transparent",
            color: tab === 'users' ? S.slate : S.secondary,
            boxShadow: tab === 'users' ? "0 1px 2px rgba(0,0,0,0.05)" : "none"
          }}>
          <Users size={16} /> User ({users.length})
        </button>
        <button onClick={() => setTab('customers')}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 6, fontSize: "13.5px", fontWeight: 500, cursor: "pointer", transition: "all 0.1s", border: "none",
            background: tab === 'customers' ? S.white : "transparent",
            color: tab === 'customers' ? S.slate : S.secondary,
            boxShadow: tab === 'customers' ? "0 1px 2px rgba(0,0,0,0.05)" : "none"
          }}>
          <Building2 size={16} /> Customer ({customers.length})
        </button>
      </div>

      {tab === 'users' && (
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${S.border}`, display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: S.secondary }} />
              <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Cari user..."
                style={{ width: "100%", padding: "8px 12px 8px 32px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", fontFamily: S.font, outline: "none", boxSizing: "border-box" }} />
            </div>
            <button onClick={() => { setEditUser(undefined); setShowUserForm(true); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: S.cyan, color: "#fff", border: "none", borderRadius: 6, fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
              <Plus size={14} /> Tambah User
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "200px 120px 180px 1fr 100px 80px", padding: "8px 18px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
            {["Nama", "Username", "Email", "Role", "Status", "Aksi"].map((h) => (
              <span key={h} style={{ color: "#94A3B8", fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
            ))}
          </div>

          {filteredUsers.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: S.secondary, fontSize: "13.5px" }}>Tidak ada user yang ditemukan.</div>
          ) : (
            filteredUsers.map((u, idx) => (
              <div key={u.id} style={{
                display: "grid", gridTemplateColumns: "200px 120px 180px 1fr 100px 80px", padding: "10px 18px", alignItems: "center",
                borderBottom: idx < filteredUsers.length - 1 ? `1px solid ${S.border}` : "none", transition: "background 0.1s"
              }} onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center", color: S.secondary, fontSize: "12px", fontWeight: 600, flexShrink: 0 }}>
                    {u.name.charAt(0)}
                  </div>
                  <span style={{ color: S.slate, fontSize: "13px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</span>
                  {u.id === currentUser?.id && <span style={{ fontSize: "10px", background: "#FEF2F2", color: "#DC2626", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>Anda</span>}
                </div>
                <span style={{ color: S.slate, fontSize: "13px", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10 }}>{u.username}</span>
                <span style={{ color: S.secondary, fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10 }}>{u.email}</span>
                <div>
                  <RoleBadge role={u.role} />
                </div>
                <div>
                  {u.isActive
                    ? <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#16A34A", fontSize: "12px", fontWeight: 500 }}><CheckCircle size={14} /> Aktif</span>
                    : <span style={{ display: "flex", alignItems: "center", gap: 4, color: S.secondary, fontSize: "12px", fontWeight: 500 }}><XCircle size={14} /> Nonaktif</span>}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => { setEditUser(u); setShowUserForm(true); }} style={{ padding: 6, background: "none", border: "none", color: S.secondary, cursor: "pointer", borderRadius: 4 }} onMouseEnter={e => e.currentTarget.style.background = S.bg} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <Edit2 size={14} />
                  </button>
                  {u.id !== currentUser?.id && (
                    <button onClick={() => handleDeleteUserClick(u.id)} style={{ padding: 6, background: "none", border: "none", color: "#DC2626", cursor: "pointer", borderRadius: 4 }} onMouseEnter={e => e.currentTarget.style.background = "#FEF2F2"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'customers' && (
        <div style={{ background: S.white, border: `1px solid ${S.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${S.border}`, display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: S.secondary }} />
              <input type="text" value={custSearch} onChange={e => setCustSearch(e.target.value)} placeholder="Cari customer..."
                style={{ width: "100%", padding: "8px 12px 8px 32px", border: `1px solid ${S.border}`, borderRadius: 6, fontSize: "13px", fontFamily: S.font, outline: "none", boxSizing: "border-box" }} />
            </div>
            <button onClick={() => { setEditCustomer(undefined); setShowCustForm(true); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: S.cyan, color: "#fff", border: "none", borderRadius: 6, fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
              <Plus size={14} /> Tambah Customer
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "120px 200px 150px 150px 1fr 80px", padding: "8px 18px", background: "#F8FAFC", borderBottom: `1px solid ${S.border}` }}>
            {["Kode", "Nama Perusahaan", "PIC", "Telepon", "Alamat", "Aksi"].map((h) => (
              <span key={h} style={{ color: "#94A3B8", fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</span>
            ))}
          </div>

          {filteredCustomers.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: S.secondary, fontSize: "13.5px" }}>Tidak ada customer yang ditemukan.</div>
          ) : (
            filteredCustomers.map((c, idx) => (
              <div key={c.code} style={{
                display: "grid", gridTemplateColumns: "120px 200px 150px 150px 1fr 80px", padding: "10px 18px", alignItems: "center",
                borderBottom: idx < filteredCustomers.length - 1 ? `1px solid ${S.border}` : "none", transition: "background 0.1s"
              }} onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <span style={{ color: S.slate, fontSize: "13px", fontFamily: "monospace", fontWeight: 500 }}>{c.code}</span>
                <span style={{ color: S.slate, fontSize: "13px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10 }}>{c.name}</span>
                <span style={{ color: S.secondary, fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10 }}>{c.contact}</span>
                <span style={{ color: S.secondary, fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10 }}>{c.phone}</span>
                <span style={{ color: S.secondary, fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10 }}>{c.address}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setEditCustomer(c); setShowCustForm(true); }} style={{ padding: 6, background: "none", border: "none", color: S.secondary, cursor: "pointer", borderRadius: 4 }} onMouseEnter={e => e.currentTarget.style.background = S.bg} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDeleteCustomerClick(c.code)} style={{ padding: 6, background: "none", border: "none", color: "#EF4444", cursor: "pointer", borderRadius: 4 }} onMouseEnter={e => e.currentTarget.style.background = "#FEF2F2"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showUserForm && <UserFormModal user={editUser} onClose={() => { setShowUserForm(false); setEditUser(undefined); }} />}
      {showCustForm && <CustomerFormModal customer={editCustomer} onClose={() => { setShowCustForm(false); setEditCustomer(undefined); }} />}

      <ConfirmModal
        isOpen={!!userToDelete}
        title="Hapus User"
        message="Yakin ingin menghapus user ini? Tindakan ini tidak dapat dibatalkan."
        onConfirm={confirmDeleteUser}
        onCancel={() => setUserToDelete(null)}
      />
      <ConfirmModal
        isOpen={!!customerToDelete}
        title="Hapus Customer"
        message="Yakin ingin menghapus customer ini? Tindakan ini tidak dapat dibatalkan dan dapat memengaruhi data pesanan."
        onConfirm={confirmDeleteCustomer}
        onCancel={() => setCustomerToDelete(null)}
      />
    </div>
  );
}
