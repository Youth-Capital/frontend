import { useTranslation } from "react-i18next";

import { AppShell, icons, type NavItem } from "./AppShell";

const NAV: NavItem[] = [
  { to: "/admin/dashboard", labelKey: "nav.dashboard", icon: icons.dashboard },
  { to: "/admin/analytics", labelKey: "nav.analytics", icon: icons.analytics },
  { to: "/admin/moderation", labelKey: "nav.moderation", icon: icons.moderation },
  { to: "/admin/users", labelKey: "nav.users", icon: icons.users },
  { to: "/admin/taxonomy", labelKey: "nav.taxonomy", icon: icons.taxonomy },
  { to: "/admin/professions", labelKey: "nav.professions", icon: icons.career },
  { to: "/admin/ai", labelKey: "nav.aiMonitor", icon: icons.assistant },
  { to: "/admin/safety", labelKey: "admin.safety", icon: icons.moderation },
  { to: "/admin/reviews", labelKey: "nav.reviews", icon: icons.reviews },
  { to: "/admin/audit", labelKey: "nav.audit", icon: icons.audit },
];

export function AdminLayout() {
  const { t } = useTranslation();
  return <AppShell navItems={NAV} portalLabel={t("nav.analytics")} accent="warning" />;
}
