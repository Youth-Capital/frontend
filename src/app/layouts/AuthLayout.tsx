import { Outlet, useLocation } from "react-router-dom";

import { AuthPanel } from "./AuthPanel";
import { LanguageSwitcher } from "@/shared/ui/LanguageSwitcher";
import { ThemeSwitcher } from "@/shared/ui/ThemeSwitcher";


/**
 * Signing in, as an entrance rather than a form on a page.
 *
 * The left half is a portal: nested pointed arches, constructed rather than
 * drawn, standing in a lattice. It carries one line — your next opportunity
 * starts here — because that is the promise being made at the door.
 *
 * The two pages get different panels. Coming back is not the same act as
 * arriving: a returning student is greeted, and someone signing up is shown
 * what they are about to walk through. Same composition, different message.
 *
 * The form side stays plain on purpose. Whatever the panel is doing, this is
 * the half where someone has to type an address and a password, and nothing
 * here should compete with that.
 */
export function AuthLayout() {
  const location = useLocation();

  const registering = location.pathname.includes("register");

  return (
    <div className="grid min-h-dvh items-start lg:grid-cols-2">
      {/*
        Pinned to the viewport rather than stretched to the grid row. The row
        is as tall as the *form*, and registration is long, so a stretched
        panel pushed its own content to the middle of a 1600px column — off
        screen on arrival, which is what made the message look like it had
        fallen away.
      */}
      <AuthPanel registering={registering} />

      <main
        className="flex min-h-dvh flex-col"
        style={{
          background: "color-mix(in oklab, var(--color-accent) 9%, var(--color-surface))",
        }}
      >
        <div className="flex justify-end gap-2 p-4">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-12">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
