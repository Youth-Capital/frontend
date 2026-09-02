import { useTranslation } from "react-i18next";

import { Button, Modal } from "@/shared/ui";

/**
 * Deleting a note is not undoable, so it is not a one-click action.
 *
 * Raised above the notes panel, which sits above the normal dialog layer so
 * it can stay open beside a lesson. At equal height the panel showed through
 * undimmed and stayed clickable, which is not what a confirmation is for.
 */
export function ConfirmDeleteNote({
  open,
  deleting,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={t("notes.deleteTitle")}
      size="sm"
      overlayClassName="z-70"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" loading={deleting} onClick={onConfirm}>
            {t("common.delete")}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-600">{t("notes.deleteWarning")}</p>
    </Modal>
  );
}
