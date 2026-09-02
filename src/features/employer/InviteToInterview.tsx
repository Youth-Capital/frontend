import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api, toApiError } from "@/shared/api/client";
import { Button, Input, Modal, Select, Textarea } from "@/shared/ui";

/**
 * "We would like to talk."
 *
 * Two different things hide behind one button, and the employer should not
 * have to know which. A candidate who applied is already in the process, so
 * the meeting is simply booked. A candidate found by search has made no such
 * decision — inviting them asks, and nothing is created until they answer.
 * The server decides which happened and says so; this component reports back
 * in those words rather than a single "done".
 *
 * The time follows from which of the two it is. When asking, it is optional:
 * "we would like to talk" is a real message before anyone's calendar is open,
 * and demanding a slot here turns a warm approach into an ultimatum. When
 * booking, it is required — the candidate has already applied, so there is
 * nobody left to agree a time with, and a booking with no time would report a
 * meeting that was never made.
 */
export function InviteToInterview({
  vacancyId,
  userId,
  alreadyApplied,
  pendingInvite,
}: {
  vacancyId: string;
  userId: string;
  alreadyApplied: boolean;
  pendingInvite: boolean;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [when, setWhen] = useState("");
  const [mode, setMode] = useState("ONLINE");
  const [place, setPlace] = useState("");
  const [outcome, setOutcome] = useState<"invite" | "scheduled" | null>(null);

  const invite = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ kind: "invite" | "scheduled" }>(
        "/jobs/interview-invites/",
        {
          vacancy: vacancyId,
          student: userId,
          message,
          // A local datetime-local value carries no zone; the browser's own
          // offset is the right one to attach, since the employer picked the
          // time on their own calendar.
          proposed_at: when ? new Date(when).toISOString() : null,
          mode,
          ...(mode === "ONLINE" ? { meeting_link: place } : { location: place }),
        },
      );
      return data;
    },
    onSuccess: (data) => {
      setOutcome(data.kind);
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["candidate"] });
      void queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });

  if (pendingInvite && !outcome) {
    return (
      <p className="text-sm text-ink-500">{t("employer.inviteAwaitingReply")}</p>
    );
  }

  if (outcome) {
    return (
      <p className="text-sm text-success">
        {outcome === "scheduled"
          ? t("employer.inviteScheduled")
          : t("employer.inviteSent")}
      </p>
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        {alreadyApplied
          ? t("employer.scheduleInterview")
          : t("employer.inviteToInterview")}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          alreadyApplied
            ? t("employer.scheduleInterview")
            : t("employer.inviteToInterview")
        }
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => invite.mutate()}
              disabled={invite.isPending || (alreadyApplied && !when)}
            >
              {alreadyApplied ? t("common.submit") : t("employer.sendInvite")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-600">
            {alreadyApplied
              ? t("employer.scheduleInterviewHint")
              : t("employer.inviteToInterviewHint")}
          </p>

          <Textarea
            id="invite-message"
            label={t("employer.inviteMessage")}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={3}
            placeholder={t("employer.inviteMessagePlaceholder")}
          />

          {/*
            Optional when asking, required when booking. Nobody is left to
            agree a time with once the candidate has applied, so "schedule"
            with no time would report a meeting that was never made.
          */}
          <Input
            id="invite-when"
            type="datetime-local"
            label={
              alreadyApplied
                ? t("employer.inviteWhen")
                : `${t("employer.inviteWhen")} — ${t("common.optional")}`
            }
            required={alreadyApplied}
            value={when}
            onChange={(event) => setWhen(event.target.value)}
          />

          <Select
            id="invite-mode"
            label={t("employer.inviteMode")}
            value={mode}
            onChange={(event) => setMode(event.target.value)}
          >
            <option value="ONLINE">{t("employer.modeOnline")}</option>
            <option value="ONSITE">{t("employer.modeOnsite")}</option>
            <option value="PHONE">{t("employer.modePhone")}</option>
          </Select>

          {mode !== "PHONE" && (
            <Input
              id="invite-place"
              label={
                mode === "ONLINE"
                  ? t("employer.inviteLink")
                  : t("employer.inviteAddress")
              }
              value={place}
              onChange={(event) => setPlace(event.target.value)}
            />
          )}

          {invite.isError && (
            <p className="text-sm text-danger">
              {t(`errors.${toApiError(invite.error).code}`, {
                defaultValue: t("errors.generic"),
              })}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
