import { useState } from "react";
import { Plus, Edit2, Trash2, Users, Building2, CheckCircle, XCircle, Search } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { User, Customer, UserRole } from "../components/data/mockData";

const ROLES: UserRole[] = ['Sales', 'Engineering', 'Owner', 'Admin', 'Finance', 'Purchasing'];
const ROLE_COLORS: Record<UserRole, string> = {
  Sales: 'bg-blue-100 text-blue-700',
  Engineering: 'bg-purple-100 text-purple-700',
  Owner: 'bg-amber-100 text-amber-700',
  Admin: 'bg-gray-100 text-gray-700',
  Finance: 'bg-green-100 text-green-700',
  Purchasing: 'bg-teal-100 text-teal-700',
};

function UserFormModal({ user, onClose }: { user?: User; onClose: () => void }) {
  const { addUser, updateUser, currentUser } = useApp();
  const [form, setForm] = useState({
    name: user?.name ?? '',
    username: user?.username ?? '',
    password: user?.password ?? '',
    email: user?.email ?? '',
    role: user?.role ?? 'Sales' as UserRole,
    isActive: user?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      updateUser(user.id, form);
    } else {
      addUser(form);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-gray-900">{user ? 'Edit User' : 'Tambah User Baru'}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Nama Lengkap *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9191E]/30 focus:border-[#C9191E]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Username *</label>
              <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9191E]/30 focus:border-[#C9191E]" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Password *</label>
              <input type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9191E]/30 focus:border-[#C9191E]" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Email *</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9191E]/30 focus:border-[#C9191E]" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Role *</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9191E]/30 focus:border-[#C9191E]">
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded" />
            <label htmlFor="isActive" className="text-sm text-gray-700">Akun Aktif</label>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">Batal</button>
            <button type="submit" className="flex-1 py-2.5 bg-[#C9191E] text-white text-sm rounded-lg hover:bg-[#a01419]">Simpan</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CustomerFormModal({ customer, onClose }: { customer?: Customer; onClose: () => void }) {
  const { addCustomer, updateCustomer, customers } = useApp();
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-gray-900">{customer ? 'Edit Customer' : 'Tambah Customer'}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Kode *</label>
              <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} disabled={!!customer} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9191E]/30 focus:border-[#C9191E] disabled:bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Kontak PIC *</label>
              <input type="text" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9191E]/30 focus:border-[#C9191E]" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Nama Perusahaan *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9191E]/30 focus:border-[#C9191E]" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Nomor Telepon</label>
            <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9191E]/30 focus:border-[#C9191E]" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Alamat</label>
            <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9191E]/30 focus:border-[#C9191E] resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">Batal</button>
            <button type="submit" className="flex-1 py-2.5 bg-[#C9191E] text-white text-sm rounded-lg hover:bg-[#a01419]">Simpan</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminPage() {
  const { users, customers, deleteUser, updateUser, currentUser } = useApp();
  const [tab, setTab] = useState<'users' | 'customers'>('users');
  const [showUserForm, setShowUserForm] = useState(false);
  const [showCustForm, setShowCustForm] = useState(false);
  const [editUser, setEditUser] = useState<User | undefined>(undefined);
  const [editCustomer, setEditCustomer] = useState<Customer | undefined>(undefined);
  const [userSearch, setUserSearch] = useState('');
  const [custSearch, setCustSearch] = useState('');

  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase();
    return !userSearch || u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const filteredCustomers = customers.filter(c => {
    const q = custSearch.toLowerCase();
    return !custSearch || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.contact.toLowerCase().includes(q);
  });

  const handleDeleteUser = (id: string) => {
    if (id === currentUser?.id) return;
    if (confirm('Yakin ingin menghapus user ini?')) deleteUser(id);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-gray-900">Manajemen Akun & Data Master</h1>
        <p className="text-sm text-gray-500">Kelola akun user dan data master customer</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        <button
          onClick={() => setTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${tab === 'users' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Users size={15} /> User ({users.length})
        </button>
        <button
          onClick={() => setTab('customers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${tab === 'customers' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Building2 size={15} /> Customer ({customers.length})
        </button>
      </div>

      {tab === 'users' && (
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)}
                placeholder="Cari nama, username, email, role..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C9191E]/20 focus:border-[#C9191E]" />
            </div>
            <button
              onClick={() => { setEditUser(undefined); setShowUserForm(true); }}
              className="flex items-center gap-2 px-3 py-2 bg-[#C9191E] text-white text-sm rounded-lg hover:bg-[#a01419] shrink-0"
            >
              <Plus size={15} /> Tambah User
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Nama</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Username</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Email</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Role</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-xs text-gray-600">{u.name.charAt(0)}</div>
                        <span className="text-gray-900">{u.name}</span>
                        {u.id === currentUser?.id && <span className="text-xs text-[#C9191E] bg-red-50 px-1.5 rounded">Anda</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{u.username}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${ROLE_COLORS[u.role]}`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      {u.isActive
                        ? <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle size={13} /> Aktif</span>
                        : <span className="flex items-center gap-1 text-gray-400 text-xs"><XCircle size={13} /> Nonaktif</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => { setEditUser(u); setShowUserForm(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Edit2 size={14} />
                        </button>
                        {u.id !== currentUser?.id && (
                          <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'customers' && (
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={custSearch} onChange={e => setCustSearch(e.target.value)}
                placeholder="Cari nama, kode, atau PIC..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C9191E]/20 focus:border-[#C9191E]" />
            </div>
            <button
              onClick={() => { setEditCustomer(undefined); setShowCustForm(true); }}
              className="flex items-center gap-2 px-3 py-2 bg-[#C9191E] text-white text-sm rounded-lg hover:bg-[#a01419] shrink-0"
            >
              <Plus size={15} /> Tambah Customer
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Kode</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Nama Perusahaan</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">PIC</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Telepon</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Alamat</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCustomers.map(c => (
                  <tr key={c.code} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-900">{c.code}</td>
                    <td className="px-4 py-3 text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{c.contact}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{c.phone}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{c.address}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setEditCustomer(c); setShowCustForm(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showUserForm && <UserFormModal user={editUser} onClose={() => { setShowUserForm(false); setEditUser(undefined); }} />}
      {showCustForm && <CustomerFormModal customer={editCustomer} onClose={() => { setShowCustForm(false); setEditCustomer(undefined); }} />}
    </div>
  );
}
