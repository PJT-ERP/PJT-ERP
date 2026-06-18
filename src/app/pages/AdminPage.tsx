import React, { useState } from "react";
import { Plus, Edit2, Trash2, Users, Building2, CheckCircle, XCircle, Search } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { User, Customer, UserRole } from "../components/data/mockData";

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

const ROLES: UserRole[] = ['Sales', 'Engineering Worker', 'Owner', 'Admin', 'Finance', 'Purchasing'];

function getRoleColors(role: string) {
  switch (role) {
    case 'Owner': return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
    case 'Admin': return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
    case 'Engineering Supervisor':
    case 'Engineering Worker': return { bg: '#F3E8FF', text: '#9333EA', border: '#E9D5FF' };
    case 'Finance': return { bg: '#DCFCE7', text: '#16A34A', border: '#BBF7D0' };
    case 'Purchasing': return { bg: '#CCFBF1', text: '#0D9488', border: '#99F6E4' };
    default: return { bg: '#DBEAFE', text: '#C8102E', border: '#BFDBFE' }; // Sales
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
  const initialRole = isActuallyEngSpv ? 'Engineering Worker' : (user?.role ?? 'Sales');

  const [form, setForm] = useState({
    name: user?.name ?? '',
    username: user?.username ?? '',
    password: user?.password ?? '',
    email: user?.email ?? '',
    role: initialRole as UserRole,
    isActive: user?.isActive ?? true,
    isSupervisor: isActuallyEngSpv,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalRole = (form.role === 'Engineering Worker' && form.isSupervisor) ? 'Engineering Supervisor' : form.role;
    
    const submitData = {
       name: form.name,
       username: form.email,
       password: form.password,
       email: form.email,
       role: finalRole as UserRole,
       isActive: form.isActive
    };

    if (user) {
      updateUser(user.id, submitData);
    } else {
      addUser(submitData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{ fontFamily: S.font }}>
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 450, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${S.border}` }}>
          <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>{user ? 'Edit User' : 'Tambah User Baru'}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px" }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Nama Lengkap *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>{user ? 'Password Baru (opsional)' : 'Password *'}</label>
              <input type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required={!user} placeholder={user ? 'Kosongkan jika tidak diubah' : ''} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Role *</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", outline: "none", boxSizing: "border-box", background: S.white }}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {form.role === 'Engineering Worker' && (
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
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
            <button type="submit" style={{ flex: 1, padding: "10px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Simpan</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CustomerFormModal({ customer, onClose }: { customer?: Customer; onClose: () => void }) {
  const { addCustomer, updateCustomer } = useApp();
  const [form, setForm] = useState({
    code: customer?.code ?? '',
    name: customer?.name ?? '',
    contact: customer?.contact ?? '',
    phone: customer?.phone ?? '',
    address: customer?.address ?? '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customer) {
      updateCustomer(customer.code, form);
    } else {
      addCustomer(form);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{ fontFamily: S.font }}>
      <div style={{ background: S.white, borderRadius: 12, width: "100%", maxWidth: 450, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${S.border}` }}>
          <h2 style={{ color: S.slate, margin: 0, fontSize: "18px" }}>{customer ? 'Edit Customer' : 'Tambah Customer'}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.secondary, fontSize: "20px" }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Kode *</label>
              <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} disabled={!!customer} required style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", outline: "none", boxSizing: "border-box", background: customer ? S.bg : S.white }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Kontak PIC *</label>
              <input type="text" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} required style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Nama Perusahaan *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Nomor Telepon</label>
            <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", color: S.slate, fontWeight: 500, marginBottom: 6 }}>Alamat</label>
            <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${S.border}`, borderRadius: 8, fontSize: "13.5px", outline: "none", boxSizing: "border-box", resize: "none" }} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", background: S.white, border: `1px solid ${S.border}`, color: S.slate, borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Batal</button>
            <button type="submit" style={{ flex: 1, padding: "10px", background: S.cyan, border: "none", color: "#fff", borderRadius: 8, fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}>Simpan</button>
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
  const { users, customers, deleteUser, currentUser } = useApp();
  const [tab, setTab] = useState<'users' | 'customers'>('users');
  const [showUserForm, setShowUserForm] = useState(false);
  const [showCustForm, setShowCustForm] = useState(false);
  const [editUser, setEditUser] = useState<User | undefined>(undefined);
  const [editCustomer, setEditCustomer] = useState<Customer | undefined>(undefined);
  const [userSearch, setUserSearch] = useState('');
  const [custSearch, setCustSearch] = useState('');
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

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
                <div>
                  <button onClick={() => { setEditCustomer(c); setShowCustForm(true); }} style={{ padding: 6, background: "none", border: "none", color: S.secondary, cursor: "pointer", borderRadius: 4 }} onMouseEnter={e => e.currentTarget.style.background = S.bg} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <Edit2 size={14} />
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
    </div>
  );
}
