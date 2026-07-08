import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { Factory, Lock, User as UserIcon, ArrowRight } from "lucide-react";
import { useApp } from "../components/context/AppContext";
import { authApi } from "../services/authApi";

export function Login() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { login, currentUser } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [helperMessage, setHelperMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fromLocation = (state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from;

  useEffect(() => {
    if (currentUser) {
      if (fromLocation?.pathname && fromLocation.pathname !== "/login") {
        navigate(`${fromLocation.pathname}${fromLocation.search ?? ""}${fromLocation.hash ?? ""}`, { replace: true });
      } else {
        const storedUser = authApi.getCurrentUser();
        navigate(getDefaultRouteForBackendRole(storedUser?.roles?.[0]), { replace: true });
      }
    }
  }, [currentUser, navigate, fromLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setHelperMessage("");
    setIsSubmitting(true);

    try {
      const success = await login(email.trim(), password);

      if (!success) {
        setHelperMessage("Login gagal. Periksa email dan password, lalu coba lagi.");
        setIsSubmitting(false);
      }
      // If success, the useEffect above will handle the navigation 
      // once the context is fully updated.
    } catch {
      setHelperMessage("Login gagal karena server tidak dapat dihubungi. Coba beberapa saat lagi.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="max-w-md w-full bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 flex items-center justify-center mx-auto mb-5 p-2">
            <img src="/pjt-logo-new.png" alt="PT Pratama Jaya" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-[#111827] mb-2">Welcome Back</h1>
          <p className="text-[#64748B] text-sm">Sign in to the Manufacturing ERP System</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1.5">Email</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
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
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-[#1F1F1F] hover:bg-[#111827] text-white py-3 rounded-xl font-medium transition-colors"
          >
            {isSubmitting ? "Signing In..." : "Sign In to System"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
}

function getDefaultRouteForBackendRole(role?: string): string {
  const normalized = (role || "").replace(/[\s_-]/g, "").toLowerCase();

  switch (normalized) {
    case "finance":
      return "/erp/finance";
    case "purchasing":
      return "/erp/purchasing";
    case "engineering":
    case "engineer":
    case "engineeringworker":
    case "engineeringreviewer":
    case "engineeringsupervisor":
      return "/erp/engineer";
    case "owner":
      return "/erp/dashboard";
    case "admin":
      return "/erp/finance/dashboard";
    case "sales":
    default:
      return "/erp/so";
  }
}
