import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardSkeleton,
  Input,
  Select,
  Textarea,
} from "@/shared/ui";
import type { Paginated, Region } from "@/shared/types/api";

interface Company {
  id: string;
  legal_name: string;
  brand_name: string;
  display_name: string;
  slug: string;
  tax_id: string;
  industry: string;
  size: string;
  website: string;
  description: string;
  region: string | null;
  address: string;
  contact_email: string;
  contact_phone: string;
  verification_status: string;
  is_verified: boolean;
}

export default function CompanyPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const describeError = useApiError();

  const [form, setForm] = useState<Partial<Company>>({});
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const company = useQuery({
    queryKey: ["company"],
    queryFn: async () => {
      const { data } = await api.get<Company>("/me/profile/");
      return data;
    },
  });

  const regions = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Region>>("/taxonomy/regions/");
      return data.results;
    },
  });

  useEffect(() => {
    if (company.data) setForm(company.data);
  }, [company.data]);

  const save = useMutation({
    mutationFn: async () => {
      await api.patch("/me/profile/", {
        legal_name: form.legal_name,
        brand_name: form.brand_name,
        tax_id: form.tax_id,
        industry: form.industry,
        size: form.size,
        website: form.website,
        description: form.description,
        region: form.region || null,
        address: form.address,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
      });
    },
    onSuccess: () => {
      setSaved(true);
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["company"] });
    },
    onError: (caught) => setError(describeError(caught)),
  });

  if (company.isLoading) return <CardSkeleton rows={8} />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("employer.company")}
        action={
            <Badge tone={company.data?.is_verified ? "success" : "warning"}>
              {company.data?.verification_status}
            </Badge>
        }
      />

      {!company.data?.is_verified && (
        <div className="rounded-(--radius-card) border border-warning-soft bg-warning-soft/40 p-4 text-sm text-warning">
          {t("employer.verificationPending")}
        </div>
      )}

      <Card>
        <CardHeader title={t("employer.company")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="brand-name"
            label={t("auth.companyName")}
            value={form.brand_name ?? ""}
            onChange={(event) => setForm({ ...form, brand_name: event.target.value })}
          />
          <Input
            id="legal-name"
            label={t("auth.companyName")}
            value={form.legal_name ?? ""}
            onChange={(event) => setForm({ ...form, legal_name: event.target.value })}
          />
          <Input
            id="tax-id"
            label="INN / STIR"
            value={form.tax_id ?? ""}
            onChange={(event) => setForm({ ...form, tax_id: event.target.value })}
          />
          <Input
            id="industry"
            label={t("nav.professions")}
            value={form.industry ?? ""}
            onChange={(event) => setForm({ ...form, industry: event.target.value })}
          />
          <Select
            id="size"
            label={t("employer.students")}
            value={form.size ?? "SMALL"}
            onChange={(event) => setForm({ ...form, size: event.target.value })}
          >
            <option value="MICRO">1–9</option>
            <option value="SMALL">10–49</option>
            <option value="MEDIUM">50–249</option>
            <option value="LARGE">250+</option>
          </Select>
          <Select
            id="region"
            label={t("auth.region")}
            value={form.region ?? ""}
            onChange={(event) => setForm({ ...form, region: event.target.value })}
          >
            <option value="">{t("common.notSpecified")}</option>
            {regions.data?.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </Select>
          <Input
            id="website"
            label="Website"
            value={form.website ?? ""}
            onChange={(event) => setForm({ ...form, website: event.target.value })}
          />
          <Input
            id="address"
            label={t("auth.region")}
            value={form.address ?? ""}
            onChange={(event) => setForm({ ...form, address: event.target.value })}
          />
          <Input
            id="contact-email"
            type="email"
            label={t("auth.email")}
            value={form.contact_email ?? ""}
            onChange={(event) =>
              setForm({ ...form, contact_email: event.target.value })
            }
          />
          <Input
            id="contact-phone"
            label={t("auth.phone")}
            value={form.contact_phone ?? ""}
            onChange={(event) =>
              setForm({ ...form, contact_phone: event.target.value })
            }
          />
        </div>

        <div className="mt-4">
          <Textarea
            id="description"
            label={t("cv.summary")}
            value={form.description ?? ""}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
        {saved && !error && (
          <p className="mt-3 text-sm text-success">{t("common.save")} ✓</p>
        )}

        <div className="mt-4 flex justify-end">
          <Button onClick={() => save.mutate()} loading={save.isPending}>
            {t("common.save")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
