import { useTranslation } from "react-i18next";

import { AssistantChat } from "./AssistantChat";

/**
 * The assistant as a full page, for roles that have no analysis screen.
 *
 * Employers get the conversation as their whole AI surface. Learners reach the
 * same component through the floating launcher instead — their assistant page
 * is the analysis, and the chat was taken out of it so the two are not the
 * same thing twice.
 */
export default function ChatPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">{t("chat.title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-500">{t("chat.subtitle")}</p>
      </div>

      <AssistantChat />
    </div>
  );
}
