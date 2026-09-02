import { useTranslation } from "react-i18next";

import { AppShell, icons, type NavItem } from "./AppShell";

/*
 * Settings live in the profile menu and notifications behind the bell, the
 * same as every other role — putting them in the sidebar too would be a
 * second door to the same room.
 */
const NAV: NavItem[] = [
  { to: "/mentor/dashboard", labelKey: "nav.dashboard", icon: icons.dashboard },
  { to: "/mentor/learners", labelKey: "mentor.learners", icon: icons.users },
  { to: "/mentor/sessions", labelKey: "nav.sessions", icon: icons.mentors },
];

export function MentorLayout() {
  const { t } = useTranslation();
  return <AppShell navItems={NAV} portalLabel={t("auth.roleMentor")} />;
}
