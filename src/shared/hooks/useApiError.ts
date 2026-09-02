import { useTranslation } from "react-i18next";

import { toApiError } from "@/shared/api/client";

/**
 * Turn a backend error into a localised message.
 *
 * The API returns codes, not sentences, precisely so the message can be shown
 * in the user's language (docs/02-ARCHITECTURE.md §10). If a code has no
 * translation we fall back to the developer-facing message rather than showing
 * a blank space.
 */
export function useApiError() {
  const { t } = useTranslation();

  return (error: unknown): string => {
    const payload = toApiError(error);
    const key = `errors.${payload.code}`;
    const translated = t(key, {
      ...payload.details,
      defaultValue: "",
    });
    if (translated) return translated;

    const details = payload.details;
    if (details && typeof details === "object") {
      const first = Object.values(details).flat()[0];
      if (typeof first === "string") return first;
    }
    return payload.message || t("errors.generic");
  };
}
