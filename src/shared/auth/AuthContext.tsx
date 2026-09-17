import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  api,
  setAccessToken,
  setSessionExpiredHandler,
  toApiError,
} from "@/shared/api/client";
import type { Language, Role, User } from "@/shared/types/api";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
}

export interface RegisterPayload {
  email: string;
  password: string;
  role: Exclude<Role, "ADMIN">;
  preferred_language: Language;
  consents: string[];
  phone?: string;
  first_name?: string;
  last_name?: string;
  birth_date?: string;
  region_id?: string | null;
  company_name?: string;
  legal_name?: string;
  headline?: string;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  /*
   * Every cached answer belongs to whoever was signed in when it arrived.
   *
   * Query keys here name the resource, not the account — ["employer-courses"],
   * ["candidates", vacancyId] — because within one session there is only ever
   * one account. Across a sign-out there is not. Without this the next person
   * to sign in on the same browser gets the previous one's data painted
   * first: one company's course list under another company's name, which is
   * exactly what happened. A background refetch corrects it a moment later,
   * and a moment is long enough to read.
   *
   * So the cache is emptied whenever the session changes — both directions,
   * because signing in is as much a change of identity as signing out.
   */
  const forgetEverythingCached = useCallback(() => {
    queryClient.cancelQueries();
    queryClient.clear();
  }, [queryClient]);

  const applySession = useCallback(
    (access: string, nextUser: User) => {
      forgetEverythingCached();
      setAccessToken(access);
      setUserState(nextUser);
      localStorage.setItem("yk_language", nextUser.preferred_language);
    },
    [forgetEverythingCached],
  );

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUserState(null);
    forgetEverythingCached();
  }, [forgetEverythingCached]);

  /*
   * On mount there is no access token in memory (it never survives a reload),
   * but the httpOnly refresh cookie may still be valid. One silent refresh
   * turns a page reload back into a signed-in session.
   */
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      try {
        const { data } = await api.post<{ access: string; user: User }>(
          "/auth/refresh/",
          {},
        );
        if (!cancelled && data.user) {
          applySession(data.access, data.user);
        }
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, [applySession, clearSession]);

  useEffect(() => {
    setSessionExpiredHandler(clearSession);
  }, [clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const { data } = await api.post<{ access: string; user: User }>(
          "/auth/login/",
          { email, password },
        );
        applySession(data.access, data.user);
        return data.user;
      } catch (error) {
        throw toApiError(error);
      }
    },
    [applySession],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      try {
        const { data } = await api.post<{ access: string; user: User }>(
          "/auth/register/",
          payload,
        );
        applySession(data.access, data.user);
        return data.user;
      } catch (error) {
        throw toApiError(error);
      }
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout/");
    } finally {
      // Clear locally even if the server call failed — the user asked to leave.
      clearSession();
    }
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get<User>("/auth/me/");
    setUserState(data);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      login,
      register,
      logout,
      refreshUser,
      setUser: setUserState,
    }),
    [user, isLoading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used inside <AuthProvider>.");
  }
  return context;
}

export const HOME_BY_ROLE: Record<Role, string> = {
  STUDENT: "/student/dashboard",
  EMPLOYER: "/employer/dashboard",
  ADMIN: "/admin/dashboard",
};
