import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Factory, Lock, User as UserIcon, ArrowRight } from "lucide-react";
import { useApp } from "../components/context/AppContext";

export function Login() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [role, setRole] = useState("so");
  const [username, setUsername] = useState("sales01");
  const [password, setPassword] = useState("sales123");
  const [helperMessage, setHelperMessage] = useState("");

  // Auto-fill for demo purposes
  useEffect(() => {
    switch (role) {
      case "finance": setUsername("finance01"); setPassword("fin123"); break;
      case "purchasing": setUsername("purchasing01"); setPassword("purchase123"); break;
      case "so": setUsername("sales01"); setPassword("sales123"); break;
      case "engineer": setUsername("eng01"); setPassword("eng123"); break;
      case "engineering_supervisor": setUsername("eng_spv"); setPassword("spv123"); break;
      case "owner": setUsername("owner"); setPassword("owner123"); break;
      case "admin": setUsername("admin01"); setPassword("admin123"); break;
    }
  }, [role]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(username, password);
    
    if (success) {
      switch (role) {
        case "finance": navigate("/erp/finance"); break;
        case "purchasing": navigate("/erp/purchasing"); break;
        case "so": navigate("/erp/so"); break;
        case "engineer": navigate("/erp/engineer"); break;
        case "engineering_supervisor": navigate("/erp/engineer"); break;
        case "owner": navigate("/erp/dashboard"); break;
        case "admin": navigate("/erp/admin"); break;
        default: navigate("/erp/so");
      }
    } else {
      setHelperMessage("Invalid username or password.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="max-w-md w-full bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#C8102E] rounded-xl flex items-center justify-center mx-auto mb-4">
            <Factory className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#111827] mb-2">Welcome Back</h1>
          <p className="text-[#64748B] text-sm">Sign in to the Manufacturing ERP System</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1.5">Login As (Demo Auto-fill)</label>
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] focus:border-transparent transition-all"
            >
              <option value="so">Sales Order (SO)</option>
              <option value="finance">Finance</option>
              <option value="purchasing">Purchasing</option>
              <option value="engineer">Engineer</option>
              <option value="engineering_supervisor">Engineering Supervisor</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1.5">Username</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C8102E] focus:border-transparent transition-all"
              />
            </div>
          </div>

          {helperMessage && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800">
              {helperMessage}
            </div>
          )}

          <button 
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-[#1F1F1F] hover:bg-[#111827] text-white py-3 rounded-xl font-medium transition-colors"
          >
            Sign In to System
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
}
