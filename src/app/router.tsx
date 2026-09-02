import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import { AuthLayout } from "@/app/layouts/AuthLayout";
import { AdminLayout } from "@/app/layouts/AdminLayout";
import { EmployerLayout } from "@/app/layouts/EmployerLayout";
import { MentorLayout } from "@/app/layouts/MentorLayout";
import { FocusLayout } from "@/app/layouts/FocusLayout";
import { StudentLayout } from "@/app/layouts/StudentLayout";
import { RedirectIfAuthenticated, RequireRole } from "@/shared/auth/RequireRole";
import { HOME_BY_ROLE, useAuth } from "@/shared/auth/AuthContext";
import { FullPageSpinner } from "@/shared/ui";

/*
 * Portals are lazy-loaded. A learner on a phone should not download the admin
 * analytics bundle to see their three tasks for today.
 */
const LoginPage = lazy(() => import("@/features/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/features/auth/RegisterPage"));
const ResetPasswordPage = lazy(() => import("@/features/auth/ResetPasswordPage"));
const OnboardingPage = lazy(() => import("@/features/auth/OnboardingPage"));
const IntakePage = lazy(() => import("@/features/auth/IntakePage"));

const StudentDashboard = lazy(() => import("@/features/student/DashboardPage"));
const CareerPage = lazy(() => import("@/features/student/CareerPage"));
const SkillsPage = lazy(() => import("@/features/student/SkillsPage"));
const KnowledgePage = lazy(() => import("@/features/student/KnowledgePage"));
const CoursesPage = lazy(() => import("@/features/student/CoursesPage"));
const CourseDetailPage = lazy(() => import("@/features/student/CourseDetailPage"));
const LessonPage = lazy(() => import("@/features/student/LessonPage"));
const NotesPage = lazy(() => import("@/features/student/NotesPage"));
// Unlisted: a style proposal to look at, not a part of the product yet.
const StylePreviewPage = lazy(() => import("@/features/preview/StylePreviewPage"));
const TestsPage = lazy(() => import("@/features/student/TestsPage"));
const TestRunnerPage = lazy(() => import("@/features/student/TestRunnerPage"));
const ExperiencePage = lazy(() => import("@/features/student/ExperiencePage"));
const CVPage = lazy(() => import("@/features/student/CVPage"));
const JobsPage = lazy(() => import("@/features/student/JobsPage"));
const JobDetailPage = lazy(() => import("@/features/student/JobDetailPage"));
const ApplicationsPage = lazy(() => import("@/features/student/ApplicationsPage"));
const PlanPage = lazy(() => import("@/features/student/PlanPage"));
const MentorsPage = lazy(() => import("@/features/student/MentorsPage"));
const AssistantPage = lazy(() => import("@/features/student/AssistantPage"));
const LandingPage = lazy(() => import("@/features/public/LandingPage"));
const ChatPage = lazy(() => import("@/features/assistant/ChatPage"));
const BillingPage = lazy(() => import("@/features/billing/BillingPage"));
const SettingsPage = lazy(() => import("@/features/student/SettingsPage"));
const NotificationsPage = lazy(() => import("@/features/student/NotificationsPage"));

const EmployerDashboard = lazy(() => import("@/features/employer/DashboardPage"));
const CompanyPage = lazy(() => import("@/features/employer/CompanyPage"));
const EmployerVacanciesPage = lazy(() => import("@/features/employer/VacanciesPage"));
const VacancyEditorPage = lazy(() => import("@/features/employer/VacancyEditorPage"));
const CandidatesPage = lazy(() => import("@/features/employer/CandidatesPage"));
const CandidateDetailPage = lazy(
  () => import("@/features/employer/CandidateDetailPage"),
);
const EmployerApplicationsPage = lazy(
  () => import("@/features/employer/ApplicationsPage"),
);
const EmployerCoursesPage = lazy(() => import("@/features/employer/CoursesPage"));
const CourseEditorPage = lazy(
  () => import("@/features/employer/CourseEditorPage"),
);
const EmployerCourseDetailPage = lazy(
  () => import("@/features/employer/CourseDetailPage"),
);
const EmployerTestsPage = lazy(() => import("@/features/employer/TestsPage"));

const AdminDashboard = lazy(() => import("@/features/admin/DashboardPage"));
const UsersPage = lazy(() => import("@/features/admin/UsersPage"));
const ModerationPage = lazy(() => import("@/features/admin/ModerationPage"));
const TaxonomyPage = lazy(() => import("@/features/admin/TaxonomyPage"));
const ProfessionsPage = lazy(() => import("@/features/admin/ProfessionsPage"));
const AdminAnalyticsPage = lazy(() => import("@/features/admin/AnalyticsPage"));
const AIMonitorPage = lazy(() => import("@/features/admin/AIMonitorPage"));
const AdminSafetyPage = lazy(() => import("@/features/admin/SafetyPage"));
const AuditPage = lazy(() => import("@/features/admin/AuditPage"));

const MentorDashboard = lazy(() => import("@/features/mentor/DashboardPage"));
const MentorSessionsPage = lazy(() => import("@/features/mentor/SessionsPage"));
const MentorLearnersPage = lazy(() => import("@/features/mentor/LearnersPage"));

const PublicPassportPage = lazy(() => import("@/features/public/PassportPage"));

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<FullPageSpinner />}>{children}</Suspense>;
}

function RootEntry() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  return (
    <Lazy>
      <LandingPage />
    </Lazy>
  );
}

export const router = createBrowserRouter([
  { path: "/", element: <RootEntry /> },

  {
    path: "/auth",
    element: (
      <RedirectIfAuthenticated>
        <AuthLayout />
      </RedirectIfAuthenticated>
    ),
    children: [
      { index: true, element: <Navigate to="login" replace /> },
      { path: "login", element: <Lazy><LoginPage /></Lazy> },
      { path: "register", element: <Lazy><RegisterPage /></Lazy> },
      { path: "reset-password", element: <Lazy><ResetPasswordPage /></Lazy> },
    ],
  },

  {
    // The intake interview. Server-driven, so a refresh resumes
    // rather than restarting.
    path: "/intake",
    element: (
      <RequireRole roles={["STUDENT"]}>
        <Lazy><IntakePage /></Lazy>
      </RequireRole>
    ),
  },
  {
    path: "/onboarding",
    element: (
      <RequireRole roles={["STUDENT"]}>
        <Lazy>
          <OnboardingPage />
        </Lazy>
      </RequireRole>
    ),
  },

  {
    /*
      The lesson lives outside the app shell.
      
      Same guard, same URL space — only the chrome differs: a learner watching
      a lesson does not need ten other destinations beside it, and the sidebar
      was taking a fifth of the width from the one thing they opened.
    */
    path: "/student",
    element: (
      <RequireRole roles={["STUDENT"]}>
        <FocusLayout />
      </RequireRole>
    ),
    children: [
      {
        path: "courses/:courseId/lessons/:lessonId",
        element: <Lazy><LessonPage /></Lazy>,
      },
    ],
  },

  {
    path: "/student",
    element: (
      <RequireRole roles={["STUDENT"]}>
        <StudentLayout />
      </RequireRole>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: "dashboard", element: <Lazy><StudentDashboard /></Lazy> },
      { path: "career", element: <Lazy><CareerPage /></Lazy> },
      { path: "skills", element: <Lazy><SkillsPage /></Lazy> },
      { path: "knowledge", element: <Lazy><KnowledgePage /></Lazy> },
      { path: "courses", element: <Lazy><CoursesPage /></Lazy> },
      { path: "courses/:courseId", element: <Lazy><CourseDetailPage /></Lazy> },
      { path: "notes", element: <Lazy><NotesPage /></Lazy> },
      { path: "style-preview", element: <Lazy><StylePreviewPage /></Lazy> },
      { path: "tests", element: <Lazy><TestsPage /></Lazy> },
      { path: "tests/:testId/run", element: <Lazy><TestRunnerPage /></Lazy> },
      { path: "experience", element: <Lazy><ExperiencePage /></Lazy> },
      { path: "cv", element: <Lazy><CVPage /></Lazy> },
      { path: "jobs", element: <Lazy><JobsPage /></Lazy> },
      { path: "jobs/:vacancyId", element: <Lazy><JobDetailPage /></Lazy> },
      { path: "applications", element: <Lazy><ApplicationsPage /></Lazy> },
      { path: "plan", element: <Lazy><PlanPage /></Lazy> },
      { path: "mentors", element: <Lazy><MentorsPage /></Lazy> },
      { path: "assistant", element: <Lazy><AssistantPage /></Lazy> },
      { path: "notifications", element: <Lazy><NotificationsPage /></Lazy> },
      // Kept as a redirect: the learner chat moved into the assistant page,
      // and a bookmark should land there rather than on "not found".
      { path: "chat", element: <Navigate to="/student/assistant" replace /> },
      { path: "billing", element: <Lazy><BillingPage /></Lazy> },
      { path: "settings", element: <Lazy><SettingsPage /></Lazy> },
    ],
  },

  {
    path: "/employer",
    element: (
      <RequireRole roles={["EMPLOYER"]}>
        <EmployerLayout />
      </RequireRole>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: "dashboard", element: <Lazy><EmployerDashboard /></Lazy> },
      { path: "company", element: <Lazy><CompanyPage /></Lazy> },
      { path: "vacancies", element: <Lazy><EmployerVacanciesPage /></Lazy> },
      { path: "vacancies/new", element: <Lazy><VacancyEditorPage /></Lazy> },
      { path: "vacancies/:vacancyId", element: <Lazy><VacancyEditorPage /></Lazy> },
      {
        path: "vacancies/:vacancyId/candidates",
        element: <Lazy><CandidatesPage /></Lazy>,
      },
      {
        path: "vacancies/:vacancyId/candidates/:userId",
        element: <Lazy><CandidateDetailPage /></Lazy>,
      },
      { path: "applications", element: <Lazy><EmployerApplicationsPage /></Lazy> },
      { path: "courses", element: <Lazy><EmployerCoursesPage /></Lazy> },
      { path: "courses/new", element: <Lazy><CourseEditorPage /></Lazy> },
      {
        path: "courses/:courseId/edit",
        element: <Lazy><CourseEditorPage /></Lazy>,
      },
      {
        path: "courses/:courseId",
        element: <Lazy><EmployerCourseDetailPage /></Lazy>,
      },
      { path: "tests", element: <Lazy><EmployerTestsPage /></Lazy> },
      { path: "notifications", element: <Lazy><NotificationsPage /></Lazy> },
      { path: "chat", element: <Lazy><ChatPage /></Lazy> },
      { path: "billing", element: <Lazy><BillingPage /></Lazy> },
      { path: "settings", element: <Lazy><SettingsPage /></Lazy> },
    ],
  },

  {
    path: "/mentor",
    element: (
      <RequireRole roles={["MENTOR"]}>
        <MentorLayout />
      </RequireRole>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: "dashboard", element: <Lazy><MentorDashboard /></Lazy> },
      { path: "sessions", element: <Lazy><MentorSessionsPage /></Lazy> },
      { path: "learners", element: <Lazy><MentorLearnersPage /></Lazy> },
      { path: "notifications", element: <Lazy><NotificationsPage /></Lazy> },
      { path: "settings", element: <Lazy><SettingsPage /></Lazy> },
    ],
  },

  {
    path: "/admin",
    element: (
      <RequireRole roles={["ADMIN"]}>
        <AdminLayout />
      </RequireRole>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: "dashboard", element: <Lazy><AdminDashboard /></Lazy> },
      { path: "users", element: <Lazy><UsersPage /></Lazy> },
      { path: "moderation", element: <Lazy><ModerationPage /></Lazy> },
      { path: "taxonomy", element: <Lazy><TaxonomyPage /></Lazy> },
      { path: "professions", element: <Lazy><ProfessionsPage /></Lazy> },
      { path: "analytics", element: <Lazy><AdminAnalyticsPage /></Lazy> },
      { path: "ai", element: <Lazy><AIMonitorPage /></Lazy> },
      { path: "safety", element: <Lazy><AdminSafetyPage /></Lazy> },
      { path: "audit", element: <Lazy><AuditPage /></Lazy> },
      { path: "settings", element: <Lazy><SettingsPage /></Lazy> },
    ],
  },

  { path: "/p/:slug", element: <Lazy><PublicPassportPage /></Lazy> },
  { path: "*", element: <Navigate to="/" replace /> },
]);
