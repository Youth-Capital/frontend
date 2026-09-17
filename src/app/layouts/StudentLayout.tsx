import { useTranslation } from "react-i18next";

import { AppShell, icons, type NavItem } from "./AppShell";

const NAV: NavItem[] = [
  { to: "/student/dashboard", labelKey: "nav.dashboard", icon: icons.dashboard },
  { to: "/student/career", labelKey: "nav.career", icon: icons.career },
  { to: "/student/plan", labelKey: "nav.plan", icon: icons.plan },
  { to: "/student/courses", labelKey: "nav.courses", icon: icons.courses },
  { to: "/student/notes", labelKey: "nav.notes", icon: icons.notes },
  { to: "/student/tests", labelKey: "nav.tests", icon: icons.tests },
  { to: "/student/jobs", labelKey: "nav.jobs", icon: icons.jobs },
  { to: "/student/applications", labelKey: "nav.applications", icon: icons.applications },
  { to: "/student/assistant", labelKey: "nav.assistant", icon: icons.assistant },
];

export function StudentLayout() {
  const { t } = useTranslation();
  return <AppShell navItems={NAV} portalLabel={t("auth.roleStudent")} />;
}
