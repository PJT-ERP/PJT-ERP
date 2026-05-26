import { Navigate, useLocation } from "react-router";
import { useApp } from "./context/AppContext";
import { UserRole } from "./data/mockData";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { currentUser } = useApp();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    // If they don't have access, redirect to their role's default dashboard
    // or just the generic /erp layout root which will show their allowed links
    return <Navigate to="/erp" replace />;
  }

  return <>{children}</>;
}
