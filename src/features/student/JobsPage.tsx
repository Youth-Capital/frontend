import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { api } from "@/shared/api/client";

import { BestMatchCard } from "./BestMatchCard";
import { VacancyCard } from "./VacancyCard";
import {
  CardSkeleton,
  EmptyState,
  Input,
  Select,
  Tabs,
} from "@/shared/ui";
import type { Paginated, Region, Vacancy } from "@/shared/types/api";

type Tab = "matched" | "all" | "saved";

export default function JobsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("matched");
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [minMatch, setMinMatch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const regions = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Region>>("/taxonomy/regions/");
      return data.results;
    },
  });

  const vacancies = useQuery({
    queryKey: ["vacancies", tab, search, region, employmentType, minMatch],
    queryFn: async () => {
      const params = new URLSearchParams({ page_size: "50", open_only: "true" });
      if (search) params.set("search", search);
      if (region) params.set("region", region);
      if (employmentType) params.set("employment_type", employmentType);
      if (tab === "matched" || minMatch) params.set("min_match", minMatch || "40");
      const { data } = await api.get<Paginated<Vacancy>>(
        `/jobs/vacancies/?${params.toString()}`,
      );
      return data.results;
    },
    enabled: tab !== "saved",
  });

  const saved = useQuery({
    queryKey: ["saved-vacancies"],
    queryFn: async () => {
      const { data } = await api.get<
        Paginated<{ id: string; vacancy_detail: Vacancy }>
      >("/jobs/saved/?page_size=50");
      return data.results.map((item) => item.vacancy_detail);
    },
    enabled: tab === "saved",
  });

  const rows =
    tab === "saved"
      ? (saved.data ?? [])
      : [...(vacancies.data ?? [])].sort(
          (a, b) => (b.my_match?.score ?? 0) - (a.my_match?.score ?? 0),
        );

  const loading = tab === "saved" ? saved.isLoading : vacancies.isLoading;

  // The panel opens on the best match and follows whatever is picked after
  // that. Showing only the top one meant the breakdown for every other
  // vacancy was three clicks away, which is the opposite of what a panel
  // beside a list is for.
  //
  // Only on the matched tab: on "all" or "saved" the list is sorted by
  // something else, so calling its first row a best match would be a lie.
  const shown =
    (tab === "matched" && rows.find((row) => row.id === selectedId)) ||
    (tab === "matched" && rows[0]?.my_match ? rows[0] : null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("jobs.title")}
        subtitle={t("jobs.subtitle")}
      />

      <Tabs<Tab>
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "matched", label: t("jobs.matched") },
          { key: "all", label: t("jobs.catalog") },
          { key: "saved", label: t("jobs.saved") },
        ]}
      />

      {tab !== "saved" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            id="job-search"
            placeholder={t("common.search")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select
            id="job-region"
            value={region}
            onChange={(event) => setRegion(event.target.value)}
          >
            <option value="">{t("jobs.region")}</option>
            {regions.data?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select
            id="job-type"
            value={employmentType}
            onChange={(event) => setEmploymentType(event.target.value)}
          >
            <option value="">{t("jobs.employmentType")}</option>
            {["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT", "FREELANCE"].map(
              (type) => (
                <option key={type} value={type}>
                  {t(`jobs.type_${type}`)}
                </option>
              ),
            )}
          </Select>
          <Select
            id="job-match"
            value={minMatch}
            onChange={(event) => setMinMatch(event.target.value)}
          >
            <option value="">{t("jobs.minMatch")}</option>
            <option value="80">80%+</option>
            <option value="60">60%+</option>
            <option value="40">40%+</option>
          </Select>
        </div>
      )}

      {loading && <CardSkeleton rows={6} />}
      {!loading && rows.length === 0 && <EmptyState title={t("jobs.empty")} />}

      {rows.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="flex flex-col gap-3">
            {rows.map((vacancy) => (
              <VacancyCard
                key={vacancy.id}
                vacancy={vacancy}
                selected={vacancy.id === shown?.id}
                onOpen={() => {
                  // The panel only sits beside the list on a wide screen.
                  // Below that it is far below the cards, so a tap that
                  // silently updated something off-screen would read as a
                  // dead card — there, the card opens the vacancy instead.
                  if (window.matchMedia("(min-width: 1024px)").matches) {
                    setSelectedId(vacancy.id);
                  } else {
                    navigate(`/student/jobs/${vacancy.id}`);
                  }
                }}
              />
            ))}
          </div>

          {shown && (
            <div className="lg:sticky lg:top-20">
              <BestMatchCard vacancy={shown} isBest={shown.id === rows[0]?.id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
