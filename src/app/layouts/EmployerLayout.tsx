import { useTranslation } from "react-i18next";

import { AppShell, icons, type NavItem } from "./AppShell";

const NAV: NavItem[] = [
  { to: "/employer/dashboard", labelKey: "nav.dashboard", icon: icons.dashboard },
  { to: "/employer/vacancies", labelKey: "nav.vacancies", icon: icons.jobs },
  { to: "/employer/applications", labelKey: "nav.applications", icon: icons.applications },
  { to: "/employer/courses", labelKey: "nav.courses", icon: icons.courses },
  { to: "/employer/tests", labelKey: "nav.tests", icon: icons.tests },
  { to: "/employer/chat", labelKey: "nav.assistant", icon: icons.assistant },
];

export function EmployerLayout() {
  const { t } = useTranslation();
  return <AppShell navItems={NAV} portalLabel={t("auth.roleEmployer")} accent="info" />;
}
