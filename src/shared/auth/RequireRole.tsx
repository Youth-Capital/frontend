import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { FullPageSpinner } from "@/shared/ui/Spinner";
import type { Role } from "@/shared/types/api";

import { HOME_BY_ROLE, useAuth } from "./AuthContext";

interface Props {
  roles?: Role[];
  children: ReactNode;
}

/**
 * Route guard.
 *
 * This is UX, not security. Every endpoint behind these routes re-checks the
 * role server-side; removing this component would make the app ugly, not
 * insecure (prompt §24, §29).
 */
export function RequireRole({ roles, children }: Props) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  }

  return <>{children}</>;
}

export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <FullPageSpinner />;
  if (user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  return <>{children}</>;
}
