import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { formatDateTime } from "@/shared/lib/format";
import { Badge, Button, Card, CardHeader, Textarea } from "@/shared/ui";

/**
 * Invitations waiting for an answer.
 *
 * A company found this person through the platform and asked to talk. Nothing
 * has been created on their behalf: no application exists until they say yes,
 * and their name is not shown to that employer until they do. So the two
 * buttons are a real decision, and the block says what accepting means rather
 * than leaving it to be discovered afterwards.
 *
 * Only open invitations appear. An answered one belongs in the applications
 * list underneath, where the rest of the process lives.
 */
export function InterviewInvites() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const invites = useQuery({
    queryKey: ["interview-invites"],
    queryFn: async () => {
      const { data } = await api.get<{ results: Invite[] }>(
        "/jobs/interview-invites/?page_size=20",
      );
      return data.results;
    },
  });

  const respond = useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      await api.post(`/jobs/interview-invites/${id}/respond/`, {
        accept,
        note: accept ? "" : note,
      });
    },
    onSuccess: () => {
      setDecliningId(null);
      setNote("");
      void queryClient.invalidateQueries({ queryKey: ["interview-invites"] });
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  const open = invites.data?.filter((row) => row.status === "PENDING") ?? [];
  if (open.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title={t("invites.title")}
        subtitle={t("invites.subtitle")}
        action={<Badge tone="warning">{open.length}</Badge>}
      />

      <ul className="flex flex-col divide-y divide-ink-200">
        {open.map((invite) => (
          <li key={invite.id} className="flex flex-col gap-3 py-4 first:pt-0">
            <div>
              <p className="text-sm font-semibold text-ink-900">
                {invite.company}
              </p>
              <p className="text-sm text-ink-600">{invite.vacancy_title}</p>
            </div>

            {invite.message && (
              <p className="whitespace-pre-line rounded-(--radius-card) bg-ink-50 p-3 text-sm text-ink-700">
                {invite.message}
              </p>
            )}

            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div className="flex gap-1.5">
                <dt className="text-ink-500">{t("invites.when")}:</dt>
                <dd className="text-ink-800">
                  {invite.proposed_at
                    ? formatDateTime(invite.proposed_at, i18n.language)
                    : t("invites.timeToBeAgreed")}
                </dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-ink-500">{t("invites.mode")}:</dt>
                <dd className="text-ink-800">
                  {t(`employer.mode${modeLabel(invite.mode)}`)}
                </dd>
              </div>
            </dl>

            {decliningId === invite.id ? (
              <div className="flex flex-col gap-2">
                <Textarea
                  id={`decline-${invite.id}`}
                  label={t("invites.declineReason")}
                  hint={t("common.optional")}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={2}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setDecliningId(null)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    variant="danger"
                    disabled={respond.isPending}
                    onClick={() =>
                      respond.mutate({ id: invite.id, accept: false })
                    }
                  >
                    {t("invites.confirmDecline")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* What saying yes actually does, before they say it. */}
                <p className="text-xs text-ink-500">
                  {t("invites.acceptMeaning")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={respond.isPending}
                    onClick={() =>
                      respond.mutate({ id: invite.id, accept: true })
                    }
                  >
                    {t("invites.accept")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setDecliningId(invite.id)}
                  >
                    {t("invites.decline")}
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function modeLabel(mode: string): string {
  if (mode === "ONSITE") return "Onsite";
  if (mode === "PHONE") return "Phone";
  return "Online";
}

interface Invite {
  id: string;
  vacancy_title: string;
  company: string;
  message: string;
  proposed_at: string | null;
  duration_minutes: number;
  mode: string;
  location: string;
  meeting_link: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
  created_at: string;
}
