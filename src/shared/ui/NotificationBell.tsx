import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { api } from "@/shared/api/client";
import { useAuth } from "@/shared/auth/AuthContext";

const ROLE_PATH: Record<string, string> = {
  STUDENT: "/student/notifications",
  EMPLOYER: "/employer/notifications",
  MENTOR: "/mentor/notifications",
  ADMIN: "/admin/dashboard",
};

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const { data } = await api.get<{ count: number }>(
        "/notifications/unread-count/",
      );
      return data.count;
    },
    refetchInterval: 60_000,
    enabled: Boolean(user),
  });

  const count = data ?? 0;

  return (
    <button
      type="button"
      onClick={() => navigate(ROLE_PATH[user?.role ?? "STUDENT"])}
      className="relative rounded-md p-2 text-ink-600 hover:bg-ink-100"
      aria-label={`Notifications${count ? `: ${count} unread` : ""}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9zM13.7 21a2 2 0 0 1-3.4 0"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-on-colour">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
