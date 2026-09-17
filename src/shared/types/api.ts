export interface ApiError {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
    request_id?: string;
  };
}

export interface Paginated<T> {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type Role = "STUDENT" | "EMPLOYER" | "ADMIN";
export type Language = "uz" | "ru" | "en";

export type ModerationStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "PUBLISHED"
  | "REJECTED"
  | "ARCHIVED";

export type ApplicationStatus =
  | "APPLIED"
  | "UNDER_REVIEW"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "OFFER"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "SKIPPED";
export type Priority = "LOW" | "MEDIUM" | "HIGH";
export type SkillStatus = "DECLARED" | "VERIFIED";
export type RequirementLevel = "REQUIRED" | "PREFERRED";

export interface StudentProfileStub {
  id: string;
  youth_id: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  profile_completion: number;
  onboarding_completed: boolean;
  target_profession_id: string | null;
}

/**
 * The full student profile, as `/me/profile/` returns it.
 *
 * The stub above is what the shell needs to render a header; this is the
 * record itself. `middle_name` is the отчество — optional, and kept apart from
 * the first name so documents can set it in the order an official record uses.
 */
export interface StudentProfile {
  id: string;
  youth_id: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  full_name: string;
  birth_date: string | null;
  age: number | null;
  is_minor: boolean;
  gender: string;
  avatar: string | null;
  bio: string;
  region: string | null;
  region_detail: { id: string; name: string } | null;
  city: string;
  education_status: string;
  institution: string;
  study_year: number | null;
  target_profession: string | null;
  target_profession_detail: { id: string; name: string } | null;
  employment_status: string;
  open_to_work: boolean;
  languages: unknown[];
  profile_completion: number;
  onboarding_completed_at: string | null;
  diagnostics_completed_at: string | null;
  is_high_potential: boolean;
}

export interface EmployerProfileStub {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  verification_status: string;
}

export interface User {
  id: string;
  email: string;
  phone: string | null;
  role: Role;
  preferred_language: Language;
  email_verified: boolean;
  phone_verified: boolean;
  display_name: string;
  date_joined: string;
  profile: StudentProfileStub | EmployerProfileStub | null;
  requires_guardian_approval: boolean;
}

export interface Skill {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  category_name: string;
  aliases: string[];
  is_active: boolean;
}

export interface SkillCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  parent: string | null;
  icon: string;
  order: number;
  path: string;
  is_active: boolean;
  skill_count?: number;
  children?: SkillCategory[];
}

export interface Region {
  id: string;
  code: string;
  name: string;
  parent: string | null;
}

export interface Profession {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string | null;
  icon: string;
  demand_level: "LOW" | "MEDIUM" | "HIGH";
  median_salary: number | null;
  currency: string;
  is_active: boolean;
  required_count?: number;
  skills?: ProfessionSkill[];
}

export interface ProfessionSkill {
  id: string;
  skill: string;
  skill_name: string;
  category: string;
  requirement: RequirementLevel;
  min_proficiency: number;
  weight: number;
  order: number;
}

export interface UserSkill {
  id: string;
  skill: string;
  skill_name: string;
  category: string;
  category_name: string;
  proficiency: number;
  confidence: number;
  status: SkillStatus;
  band: string;
  is_verified: boolean;
  best_source: string;
  last_evidence_at: string | null;
  is_highlighted: boolean;
  knowledge_score: number | null;
  evidence?: SkillEvidence[];
}

export interface SkillEvidence {
  id: string;
  source: string;
  score: number;
  weight: number;
  ref_type: string;
  ref_id: string | null;
  issued_at: string;
  note: string;
}

export interface SkillGapEntry {
  skill_id: string;
  skill: string;
  category: string;
  requirement: RequirementLevel;
  required_level: number;
  current_level: number;
  verified: boolean;
}

export interface SkillGap {
  profession_id: string;
  profession: string;
  readiness: number;
  matching_skills: SkillGapEntry[];
  partial_skills: SkillGapEntry[];
  missing_skills: SkillGapEntry[];
  required_total: number;
  required_met: number;
}

export interface CapitalDimensionScore {
  slug: string;
  name: string;
  color: string;
  icon: string;
  score: number;
  has_data: boolean;
  breakdown: Record<string, unknown>;
}

export interface CapitalOverview {
  overall: number;
  measured_axes: number;
  total_axes: number;
  dimensions: CapitalDimensionScore[];
}

export interface KnowledgeTopic {
  skill_id: string;
  skill: string;
  category: string;
  score: number;
  band: string;
  confidence: number;
  evidence_count: number;
}

export interface KnowledgeOverview {
  average_score: number;
  tracked_skills: number;
  topics: KnowledgeTopic[];
  by_category: { category: string; score: number }[];
}

export interface Task {
  id: string;
  plan: string | null;
  milestone: string | null;
  title: string;
  description: string;
  type: string;
  ref_type: string;
  ref_id: string | null;
  priority: Priority;
  due_date: string | null;
  status: TaskStatus;
  completed_at: string | null;
  estimated_minutes: number;
  order: number;
  source: string;
  is_overdue: boolean;
  skills: { id: string; name: string }[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  order: number;
  status: string;
  progress: number;
  tasks: Task[];
}

export interface DevelopmentPlan {
  id: string;
  title: string;
  summary: string;
  goal: string | null;
  period_days: number;
  start_date: string;
  end_date: string | null;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  source: string;
  progress: number;
  days_remaining: number;
  tasks_total: number;
  tasks_done: number;
  created_at: string;
  milestones?: Milestone[];
  reviews?: PlanReview[];
}

export interface PlanReview {
  id: string;
  status: string;
  comment: string;
  reviewer: string;
  created_at: string;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description?: string;
  language: Language;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  duration_minutes: number;
  cover_image: string | null;
  category: string;
  provider_type: string;
  provider_name: string;
  status: ModerationStatus;
  is_certified: boolean;
  enrollment_count: number;
  completion_rate: number;
  rating_avg: number;
  rating_count: number;
  published_at: string | null;
  skills: { id: string; name: string }[];
  my_enrollment: { id: string; status: string; progress: number } | null;
  modules?: CourseModule[];
  tests?: CourseTestStub[];
  moderation_note?: string;
}

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: LessonStub[];
}

export interface LessonStub {
  id: string;
  title: string;
  duration_minutes: number;
  order: number;
  is_free_preview: boolean;
  /** Whether a video is attached — the URL itself is not shipped to a list. */
  has_video: boolean;
}

/**
 * How a lesson's video may be shown.
 *
 * `embed_url` is built by the server from a checked id, never rewritten from
 * what the author typed — so it is the only value that may reach an iframe.
 * It is null for anything the platform will not frame, and the page falls back
 * to a link.
 */
export interface LessonVideo {
  provider: "youtube" | "vimeo" | "file";
  url: string;
  embed_url: string | null;
  video_id?: string;
  start: number;
}

export interface Lesson extends LessonStub {
  module: string;
  content: string;
  /** As the author typed it. For editing — not for embedding. */
  video_url: string;
  video: LessonVideo | null;
  /**
   * What is said in the video, pasted by the author.
   *
   * The platform holds a link, not the audio, so this is the only text a
   * revision recap can honestly be built from.
   */
  transcript: string;
  /** Whether there is enough text for a recap — known before one is asked for. */
  has_recap_source: boolean;
  materials: CourseMaterial[];
}

/**
 * Something attached to a course, and optionally narrowed to one lesson.
 *
 * Five kinds, and the difference is not cosmetic — each is rendered
 * differently and each carries a different promise:
 *
 *   FILE   bytes we host, offered as a download
 *   IMAGE  bytes we host, shown inline; a diagram you must download to see
 *          is a diagram most learners will not see
 *   VIDEO  a link checked hard enough to go in an iframe
 *   LINK   somewhere else to go
 *   BOOK   a link with an honest label, for something we do not host
 */
export type MaterialKind = "FILE" | "IMAGE" | "VIDEO" | "LINK" | "BOOK";

/** Kinds whose content is bytes we host, and so must carry a file. */
export const HOSTED_MATERIAL_KINDS: MaterialKind[] = ["FILE", "IMAGE"];

export interface CourseMaterial {
  id: string;
  course: string;
  lesson: string | null;
  kind: MaterialKind;
  title: string;
  description: string;
  /** Present only for uploaded files and images. */
  file_url: string | null;
  file_size: number | null;
  url: string;
  /**
   * Present only for VIDEO, and built by the server from an id it checked.
   * The raw `url` is never put in an iframe src — that field is user input.
   */
  video: LessonVideo | null;
  order: number;
  created_at: string;
}

/** A student's own study note. Private: the API only ever returns your own. */
export interface CourseNote {
  id: string;
  course: string;
  course_title: string;
  /** Null for a note about the course as a whole, or one whose lesson was removed. */
  lesson: string | null;
  lesson_title: string | null;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CourseTestStub {
  id: string;
  title: string;
  passing_score: number;
  time_limit_minutes: number;
  max_attempts: number;
}

export interface Enrollment {
  id: string;
  course: string;
  course_detail: Course;
  status: "ENROLLED" | "IN_PROGRESS" | "COMPLETED" | "DROPPED";
  progress: number;
  enrolled_at: string;
  started_at: string | null;
  completed_at: string | null;
  last_activity_at: string | null;
  lesson_progress: {
    id: string;
    lesson: string;
    status: string;
    seconds_spent: number;
    completed_at: string | null;
  }[];
}

export interface Test {
  id: string;
  title: string;
  description: string;
  language: Language;
  type: string;
  course: string | null;
  passing_score: number;
  time_limit_minutes: number;
  max_attempts: number;
  status: ModerationStatus;
  is_public: boolean;
  published_at: string | null;
  skills: { id: string; skill: string; skill_name: string; weight: number }[];
  question_count: number;
  provider_name: string;
  /** True when the platform owns the test rather than an employer. */
  is_platform: boolean;
  my_attempts: {
    used: number;
    remaining: number;
    best_percentage: number;
    passed: boolean;
  } | null;
}

export interface Question {
  id: string;
  text: string;
  type: "SINGLE" | "MULTIPLE" | "TRUE_FALSE" | "SHORT_ANSWER" | "SITUATIONAL";
  points: number;
  order: number;
  /** Option weights are never sent to the taker — a reader of the weights
   *  does not need to answer the question. */
  options: { id: string; text: string; order: number }[];
}

export type TestKind =
  | "COURSE_TEST"
  | "SKILL_TEST"
  | "DIAGNOSTIC"
  | "SCREENING"
  | "SOFT_SKILL";

export interface TestAttempt {
  id: string;
  test: string;
  test_title: string;
  /** Drives how the result reads: a soft-skill assessment has no pass mark
   *  and no wrong answers, so it must not render as an exam. */
  test_type: TestKind;
  attempt_no: number;
  started_at: string;
  expires_at: string | null;
  submitted_at: string | null;
  status: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" | "GRADED";
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  time_spent_seconds: number;
  skill_results: {
    skill: string;
    skill_name: string;
    percentage: number;
    questions_total: number;
    questions_correct: number;
  }[];
  questions?: Question[];
  review?: AttemptReviewItem[];
}

export interface AttemptReviewItem {
  question_id: string;
  question: string;
  is_correct: boolean;
  points_awarded: number;
  explanation: string;
  correct_option_ids: string[];
  selected_option_ids: string[];
}

export interface Experience {
  id: string;
  type: string;
  title: string;
  organization: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  location: string;
  url: string;
  verification_status: string;
  duration_months: number;
  counts_as_tenure: boolean;
  skills: { id: string; skill: string; skill_name: string }[];
  assets: unknown[];
}

export interface Vacancy {
  id: string;
  title: string;
  description?: string;
  responsibilities?: string;
  conditions?: string;
  language: Language;
  employment_type: string;
  work_mode: string;
  region: string | null;
  region_name: string;
  city: string;
  profession: string | null;
  profession_name: string;
  min_experience_months: number;
  education_required: string;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  is_salary_public: boolean;
  positions_count: number;
  deadline: string | null;
  status: ModerationStatus;
  published_at: string | null;
  views_count: number;
  company: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    is_verified: boolean;
  };
  required_skills: {
    id: string;
    name: string;
    requirement: RequirementLevel;
    min_score: number;
  }[];
  is_open: boolean;
  my_match: {
    score: number;
    coverage: number;
    knowledge: number;
    missing_skills: string[];
    /** Why it is in front of them — a different question from how well they fit. */
    relevance: number;
    relevance_known: boolean;
    relevance_reason: string;
  } | null;
  my_application: { id: string; status: ApplicationStatus } | null;
  is_saved: boolean;
  skills?: VacancySkill[];
  screening_tests?: { id: string; title: string; is_mandatory: boolean }[];
  match_explanation?: MatchReason[] | null;
  moderation_note?: string;
}

export interface VacancySkill {
  id: string;
  skill: string;
  skill_name: string;
  category: string;
  requirement: RequirementLevel;
  min_knowledge_score: number;
  weight: number;
  order: number;
}

export interface MatchReason {
  code: string;
  sentiment: "positive" | "neutral" | "negative";
  data: Record<string, unknown>;
}

export interface MatchResult {
  id: string;
  vacancy: string;
  vacancy_title: string;
  company: string;
  overall_score: number;
  coverage_score: number;
  knowledge_score: number;
  verification_score: number;
  experience_score: number;
  education_score: number;
  location_score: number;
  matched_skills: MatchSkill[];
  missing_skills: MatchSkill[];
  explanation: MatchReason[];
  /**
   * How close this vacancy is to what the learner said they want — a separate
   * number from the score on purpose. The score answers "can I do this job",
   * this answers "is it the kind of job I asked for", and averaging the two
   * would make a job you are perfect for but do not want look identical to
   * one you want but cannot do.
   */
  relevance_score: number;
  /** False when the learner has declared no interests: nothing was filtered. */
  relevance_known: boolean;
  relevance_reasons: MatchReason[];
  computed_at: string;
  is_stale: boolean;
}

export interface MatchSkill {
  skill_id: string;
  skill: string;
  requirement: RequirementLevel;
  required_level: number;
  current_level: number;
  knowledge_level: number;
  verified: boolean;
  met: boolean;
}

export interface Application {
  id: string;
  vacancy: string;
  vacancy_detail: {
    id: string;
    title: string;
    company: string;
    employment_type: string;
    work_mode: string;
    city: string;
  };
  cv: string | null;
  cover_letter: string;
  status: ApplicationStatus;
  match_score_at_apply: number;
  applied_at: string;
  status_changed_at: string;
  employer_note: string;
  events: {
    id: string;
    from_status: string;
    to_status: string;
    actor_name: string;
    note: string;
    created_at: string;
  }[];
  interviews: unknown[];
  candidate?: {
    identified: boolean;
    user_id?: string;
    youth_id?: string;
    name?: string;
    avatar?: string | null;
    education_status?: string;
    city?: string;
  };
}

export interface Candidate {
  user_id: string;
  youth_id: string | null;
  name: string | null;
  identified: boolean;
  has_applied: boolean;
  has_cv: boolean;
  /** CV quality rating, or null when this candidate has no CV. */
  cv_rating: number | null;
  match: {
    overall: number;
    coverage: number;
    knowledge: number;
    verification: number;
    experience: number;
    education: number;
    location: number;
  };
  skills: MatchSkill[];
  missing_skills: MatchSkill[];
  explanation: MatchReason[];
}

/**
 * One piece of proof, as the candidate card sends it.
 *
 * Deliberately not the `SkillEvidence` above: that one is the student's own
 * view and carries `id`/`ref_type`/`ref_id`, which the employer endpoint does
 * not return. Reusing the name would have merged the two declarations — same
 * name, same module — and left this field silently claiming fields that never
 * arrive.
 */
export interface CandidateSkillEvidence {
  source: string;
  score: number;
  weight: number;
  issued_at: string;
  note: string;
}

export interface CandidateSkill {
  skill_id: string;
  skill: string;
  proficiency: number;
  band: string;
  verified: boolean;
  source: string;
  last_evidence_at: string | null;
  evidence: CandidateSkillEvidence[];
}

/**
 * The full candidate card.
 *
 * Every field that could name the person is nullable or empty on purpose: an
 * anonymous card withholds the photo, the free text, the university and the
 * organisations on the record, and the API decides that, not the page.
 */
export interface CandidateDetail {
  user_id: string;
  identified: boolean;
  youth_id: string | null;
  name: string | null;
  avatar: string | null;
  bio: string;
  region: string | null;
  city: string;
  education_status: string | null;
  institution: string;
  study_year: number | null;
  languages: string[];
  target_profession: string | null;
  open_to_work: boolean;
  has_applied: boolean;
  application: { id: string; status: string; created_at: string } | null;
  invite: {
    id: string;
    status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
    proposed_at: string | null;
    created_at: string;
    response_note: string;
  } | null;
  match: Candidate["match"];
  explanation: MatchReason[];
  required_skills: MatchSkill[];
  missing_skills: MatchSkill[];
  skills: CandidateSkill[];
  tests: {
    test_id: string;
    title: string;
    percentage: number;
    passed: boolean;
    submitted_at: string | null;
  }[];
  experience_entries: {
    type: string;
    title: string;
    organization: string | null;
    duration_months: number;
    is_current: boolean;
    verified: boolean;
  }[];
  certificates: {
    course: string;
    issued_at: string;
    serial: string | null;
  }[];
  /**
   * The candidate's CV: what the platform rates it at, and the document.
   *
   * `document` follows the same identity rule as the rest of the card — an
   * anonymous candidate's résumé arrives with the capability intact and the
   * name, photo, contacts, school and employers stripped out.
   */
  cv: {
    id: string;
    title: string;
    language: Language;
    updated_at: string;
    rating: { overall: number; band: string; components: CvRatingComponentDto[] };
    document: CvDocumentPayload;
  } | null;
}

export interface CvRatingComponentDto {
  key: string;
  score: number;
  max: number;
  facts: { code: string; data?: Record<string, unknown> }[];
  tips: { code: string; severity: string; data?: Record<string, unknown> }[];
}

/** The assembled résumé, as `/cv/documents/{id}/preview/` and the candidate
 *  card both return it. */
export interface CvDocumentPayload {
  meta: { title: string; sections: string[]; identified?: boolean };
  personal: Record<string, string | null>;
  contacts?: { email: string; phone: string | null };
  summary?: string;
  education?: {
    institution: string;
    degree: string;
    field_of_study: string;
    start_date: string | null;
    end_date: string | null;
    is_current: boolean;
  }[];
  skills?: {
    name: string;
    category: string;
    proficiency: number;
    verified: boolean;
    band: string;
  }[];
  experience?: {
    type: string;
    title: string;
    organization: string;
    description: string;
    duration_months: number;
    is_current: boolean;
    skills: string[];
  }[];
  projects?: { title: string; description: string; type: string; url: string; skills: string[] }[];
  courses?: { title: string; provider: string; completed_at: string | null; level: string }[];
  certificates?: { title: string; serial: string; issued_at: string }[];
  languages?: { code: string; level: string }[];
}

export interface Recommendation {
  id: string;
  type: string;
  ref_type: string;
  ref_id: string | null;
  title: string;
  score: number;
  reason_code: string;
  reason_text: string;
  reason_data: Record<string, unknown>;
  status: string;
  created_at: string;
}

export interface Notification {
  id: string;
  type: string;
  title_key: string;
  body_key: string;
  payload: Record<string, unknown>;
  ref_type: string;
  ref_id: string | null;
  action_url: string;
  priority: Priority;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface StudentDashboard {
  greeting_name: string;
  youth_id: string | null;
  /** Has the learner answered the intake interview? */
  intake_completed: boolean;
  intake_started: boolean;
  streak: StreakState;
  company: CompanyState;
  target_profession: { id: string; name: string } | null;
  career_progress: number;
  stats: {
    profile_completion: number;
    skills_total: number;
    skills_verified: number;
    courses_enrolled: number;
    courses_completed: number;
    tests_passed: number;
    applications: number;
    matching_vacancies: number;
    unread_notifications: number;
  };
  capital: CapitalOverview;
  knowledge: KnowledgeOverview;
  plan: {
    id: string;
    title: string;
    progress: number;
    days_remaining: number;
    tasks_total: number;
    tasks_done: number;
  } | null;
  today_tasks: {
    id: string;
    title: string;
    type: string;
    priority: Priority;
    due_date: string | null;
    is_overdue: boolean;
    estimated_minutes: number;
    ref_type: string;
    ref_id: string | null;
  }[];
  overdue_tasks: number;
  recommendations: {
    id: string;
    type: string;
    title: string;
    score: number;
    reason_code: string;
    reason_data: Record<string, unknown>;
    ref_id: string | null;
  }[];
}

export interface EmployerDashboard {
  company: { id: string; name: string; verification_status: string };
  vacancies: { total: number; published: number; pending: number; draft: number };
  applications: {
    total: number;
    new: number;
    shortlisted: number;
    interview: number;
    hired: number;
  };
  learning: {
    courses: number;
    students: number;
    completions: number;
    avg_completion_rate: number;
  };
  assessment: { tests: number; attempts: number; avg_score: number };
  talent: {
    strong_matches: number;
    top_vacancies: { id: string; title: string; applicant_count: number }[];
  };
}

export interface AdminDashboard {
  overview: Record<string, number>;
  funnel: { step: string; count: number; rate: number }[];
  outcomes: Record<string, number>;
  skill_demand: {
    skill: string;
    skill_id: string;
    demand: number;
    supply: number;
    verified_supply: number;
    gap: number;
  }[];
}

export interface RiskRow {
  user_id: string;
  youth_id: string;
  name: string;
  region: string | null;
  target_profession: string | null;
  idle_days: number;
  overdue_tasks: number;
  profile_completion: number;
  risk_score: number;
}

export interface CVDocument {
  id: string;
  title: string;
  language: Language;
  template: string;
  headline: string;
  summary: string;
  sections_config: { key: string; enabled: boolean; order: number }[];
  enabled_sections: string[];
  target_profession: string | null;
  is_primary: boolean;
  /** Cached CV quality rating (0-100). The employer sees the same number. */
  quality_score: number;
  quality_computed_at: string | null;
  updated_at: string;
}

/* ------------------------------------------------------------------ billing */

export type PlanTier = "FREE" | "PREMIUM" | "PRO" | "ENTERPRISE";
export type BillingInterval = "MONTH" | "YEAR" | "NONE";
export type SubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "EXPIRED";
export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";

/** Marketing bullet, carried per language rather than as an i18n key so the
 *  catalogue stays editable without a frontend deploy. */
export interface PlanHighlight {
  uz: string;
  ru: string;
  en: string;
}

export interface Plan {
  id: string;
  code: string;
  role: "STUDENT" | "EMPLOYER";
  tier: PlanTier;
  name: string;
  description: string;
  /** Minor units. Use `price_display` for anything shown to a person. */
  price_minor: number;
  price_display: string;
  currency: string;
  currency_exponent: number;
  interval: BillingInterval;
  trial_days: number;
  /** `null` on a listed feature means unlimited; a missing key means not included. */
  limits: Record<string, number | null>;
  highlights: PlanHighlight[];
  is_free: boolean;
  is_default: boolean;
  sort_order: number;
}

export interface Subscription {
  id: string;
  plan: Plan;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  renews_on: string | null;
  is_entitling: boolean;
  provider: string;
}

export interface UsageEntry {
  feature: string;
  granted: boolean;
  /** null on a granted feature means unlimited. */
  limit: number | null;
  used: number;
  kind: "METERED" | "CONCURRENT";
}

export interface Payment {
  id: string;
  plan_code: string;
  plan_name: string;
  amount_minor: number;
  amount_display: string;
  currency: string;
  status: PaymentStatus;
  provider: string;
  failure_reason: string;
  paid_at: string | null;
  created_at: string;
}

export interface CheckoutResponse {
  reference: string;
  provider: string;
  redirect_url: string | null;
  payment: Payment;
}

export interface FeatureCheck {
  feature: string;
  allowed: boolean;
  reason: string;
  limit: number | null;
  used: number;
  remaining: number | null;
  plan: string | null;
}

/* ------------------------------------------------------------- ai intake */

export type IntakeQuestionKind = "TEXT" | "SINGLE" | "MULTI" | "SKILLS" | "SCALE";

export interface IntakeChoice {
  value: string;
  /** i18n key for fixed options. */
  label_key: string;
  /** Already-resolved label for options that come from the database. */
  label?: string;
}

export interface IntakeQuestion {
  id: string;
  kind: IntakeQuestionKind;
  label_key: string;
  hint_key: string;
  placeholder_key: string;
  choices: IntakeChoice[];
  required: boolean;
  max_choices: number;
}

export interface IntakeState {
  session_id: string;
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  /** null once every applicable question has been answered. */
  question: IntakeQuestion | null;
  answered: number;
  total: number;
  answers: Record<string, unknown>;
  applied: Record<string, unknown>;
}

export interface SkillOption {
  id: string;
  name: string;
  slug: string;
}

/* --------------------------------------------------------------- ai chat */

export interface ChatSource {
  type: string;
  id?: string;
  /** Route the reader can open to verify the number themselves. */
  screen: string;
}

export interface ChatMessage {
  id: string;
  thread: string | null;
  author: "USER" | "ASSISTANT";
  text: string;
  /** Assistant turns: selects the sentence. Empty on user turns. */
  code: string;
  intent: string;
  /** The facts the answer was built from — the receipts shown under it. */
  grounding: Record<string, unknown>;
  sources: ChatSource[];
  suggestions: string[];
  blocked: boolean;
  created_at: string;
}

export interface ChatThread {
  id: string;
  /** The first question asked, verbatim — what the reader will recognise. */
  title: string;
  last_message_at: string | null;
  created_at: string;
}

export interface ChatState {
  thread: string | null;
  messages: ChatMessage[];
  threads: ChatThread[];
}

export interface ChatResponse {
  thread: string;
  message: ChatMessage;
}

/* ----------------------------------------------------- habit & company */

export interface StreakState {
  current_days: number;
  longest_days: number;
  done_today: boolean;
  /** A live streak that today has not yet secured. */
  at_risk: boolean;
  daily_goal: number;
  actions_today: number;
  total_active_days: number;
}

/** Counts of other real people. Null where too few to show without naming them. */
export interface CompanyState {
  peers: { count: number; profession: string } | null;
  recent_test_takers: { count: number; days: number } | null;
  hired: { count: number; profession: string } | null;
}
