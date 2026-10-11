# AI Engineering Log

This log records meaningful AI-assisted engineering work on the MRLBS project so the team can review how AI contributions were evaluated and what artifacts were accepted. Entries are appended chronologically; no historical entries are added without a reliable record of the underlying interaction.

Use this template for each meaningful AI-assisted task:

#### [Date] — [Task Title]

**Task / Context:**\
[Engineering problem being addressed]

**Prompt:**\
[Exact prompt, when available]

**AI Output:**\
[Relevant AI output, when available]

**Student/Team Evaluation:**\
[What was correct, useful, incomplete, or incorrect]

**Errors / Risks / Hallucinations:**\
[Identified issues]

**Changes Made After Evaluation:**\
[Changes made by the student/team]

**Final Accepted Artifact:**\
[Description/link to final result]

**Decision:**\
Accepted / Modified / Rejected

**Reason:**\
[Why]

#### 2026-10-07 — FR-1.2 / US-1: User Profile Creation & Role Assignment

**Task / Context:**\
Implement requirement FR-1.2 (User Story US-1) for the Multi-Resource Lab Booking System (MRLBS) frontend: On a user's first successful authentication, create a user profile using authenticated name and institutional email address, assign 'admin' role if present in authorized administrator configuration or 'member' role otherwise, and store the assigned role for subsequent RBAC enforcement.

**Prompt:**\
User Story Context: Ananya signs in using her institutional Google account. On her first successful authentication, the system creates her user profile using her authenticated name and institutional email address and assigns the appropriate role. Requirement: On the user's first successful authentication, the system shall create a user profile using the authenticated user's name and institutional email address. The system shall assign the Admin role if the authenticated institutional identity is present in the system's authorized administrator configuration; otherwise, the user shall be assigned the Member role. Acceptance Criteria: A user profile is created on the user's first successful authentication; The profile contains the authenticated user's name; The profile contains the user's institutional email address; The Admin role is assigned when the authenticated institutional identity exists in the authorized administrator configuration; The Member role is assigned otherwise; The assigned role is stored and available for subsequent RBAC enforcement. Traceability: Requirement FR-1.2, User Story US-1.

**AI Output:**\
Created `src/config/adminConfig.ts` to maintain system authorized administrator configuration; updated `src/types/User.ts` to include `UserProfile` (`name`, `email`, `role`, `id`); created `src/services/userService.ts` handling user profile creation, role assignment logic, and persistent storage in localStorage; created `src/context/AuthContext.tsx`, `src/context/authContextInstance.ts`, and `src/hooks/useAuth.ts` for React auth state management and RBAC enforcement; updated `src/pages/LoginPage.tsx` and `src/components/AppHeader.tsx` to display user profiles and roles; provided unit and integration test suites in `adminConfig.test.ts`, `userService.test.ts`, and `LoginPage.test.tsx`.

**Student/Team Evaluation:**\
The solution cleanly addresses all 6 acceptance criteria for FR-1.2. The separation of administrator configuration, user profile service, and React context provides clear architectural boundaries. All vitest tests passed (12/12) and `npm run build` completed cleanly without TypeScript or ESLint errors.

**Errors / Risks / Hallucinations:**\
Initial test execution required configuring Vitest matchers properly in `setup.ts` and separating React context definition from component file to avoid Fast Refresh lint warnings. Resolved promptly.

**Changes Made After Evaluation:**\
Extracted React context to `authContextInstance.ts` to satisfy ESLint `react-refresh/only-export-components` rule.

**Final Accepted Artifact:**\
`src/types/User.ts`, `src/config/adminConfig.ts`, `src/services/userService.ts`, `src/context/AuthContext.tsx`, `src/context/authContextInstance.ts`, `src/hooks/useAuth.ts`, `src/pages/LoginPage.tsx`, `src/components/AppHeader.tsx`, `src/config/adminConfig.test.ts`, `src/services/userService.test.ts`, `src/pages/LoginPage.test.tsx`.

**Decision:**\
Accepted

**Reason:**\
Fully satisfies requirement FR-1.2 / US-1 acceptance criteria, builds with zero errors, and passes 100% of test suites.

#### 2026-10-07 — Home Page UI Refinement: Direct Admin/Member Login Actions

**Task / Context:**\
Refine the home page UI navigation structure by removing separate 'Member' and 'Admin' navigation links from the header bar, and embedding direct 'Login as Admin' and 'Login as Member' action triggers on the home page hero section.

**Prompt:**\
curretly the ui is like this , i want it to be like in the home page itself login as admin and login as member , and remove those 2 separate sections member and admin

**AI Output:**\
Updated `src/components/AppHeader.tsx` to streamline main navigation to 'Home' and 'Login'; updated `src/pages/LandingPage.tsx` to include direct 'Login as Admin' and 'Login as Member' action buttons with role badge status displays; updated `src/routes/AppRoutes.test.tsx` to verify updated navigation and landing page buttons.

**Student/Team Evaluation:**\
The UI changes simplify navigation by consolidating role selection directly onto the home page while keeping header navigation clean. All 12 tests passed and production build succeeded cleanly.

**Errors / Risks / Hallucinations:**\
None identified.

**Changes Made After Evaluation:**\
None.

**Final Accepted Artifact:**\
`src/pages/LandingPage.tsx`, `src/components/AppHeader.tsx`, `src/routes/AppRoutes.test.tsx`.

**Decision:**\
Accepted

**Reason:**\
Improves user experience by providing instant login actions directly on the landing page and removing redundant top navigation entries.

#### 2026-10-07 — FR-1.2 / US-1: Profile Setup Page & Dashboard Profile Display

**Task / Context:**\
Implement a complete profile creation flow: after first login (as Admin or Member), the user is taken to a Profile Setup page where they can fill in their full name, institutional ID (roll number), department, bio, and upload a profile picture. The profile is persisted in localStorage and displayed on the Member/Admin dashboards.

**Prompt:**\
"this is my task, to create user profile on first login, given that already the user signed up and now logging in as a member/admin, he/she should be able to add their name, institutional id, history if needed, and an image to like profile picture to add and anything that is mandatory in the profile section"

**AI Output:**\
Extended `UserProfile` type with `avatarUrl`, `institutionalId`, `department`, `bio`, and `profileCompleted` fields. Added `updateUserProfile` function to `userService.ts`. Added `updateProfile` to `AuthContext` and `authContextInstance`. Created `ProfilePage.tsx` with form fields for name, institutional ID, department, bio, and avatar upload with preview. Updated `LandingPage.tsx` to redirect to `/profile` after login instead of directly to dashboards. Rewrote `MemberDashboard.tsx` and `AdminDashboard.tsx` to display the full user profile card with avatar, institutional ID, department, bio, and an "Edit Profile" button. Updated `adminConfig.ts` to use `@iitk.ac.in` emails. Added `/profile` route to `AppRoutes.tsx`. Added "Profile" link to header navigation.

**Student/Team Evaluation:**\
The solution provides a complete profile creation and editing flow. The `UserProfile` type is well-structured with appropriate optional fields. The profile form validates required fields (name, institutional ID) and supports optional avatar upload with 2 MB size limit. Production build (`npm run build`) succeeds with zero TypeScript or ESLint errors.

**Errors / Risks / Hallucinations:**\
The `handleQuickPreset` function was left as unused code after removing the Quick Test UI block, causing a TypeScript build error (TS6133). Resolved by removing the function. Default admin emails and landing page quick-login emails were still using `@institution.edu` instead of `@iitk.ac.in`; corrected in this update.

**Changes Made After Evaluation:**\
Removed unused `handleQuickPreset` function. Updated all hardcoded emails to use `@iitk.ac.in` domain.

**Final Accepted Artifact:**\
`src/types/User.ts`, `src/services/userService.ts`, `src/context/AuthContext.tsx`, `src/context/authContextInstance.ts`, `src/pages/ProfilePage.tsx` (new), `src/pages/MemberDashboard.tsx`, `src/pages/AdminDashboard.tsx`, `src/pages/LandingPage.tsx`, `src/pages/LoginPage.tsx`, `src/config/adminConfig.ts`, `src/routes/AppRoutes.tsx`, `src/components/AppHeader.tsx`.

**Decision:**\
Accepted

**Reason:**\
Fully implements the profile creation requirement from FR-1.2 / US-1 with proper form validation, image upload, persistent storage, and profile display on dashboards. Builds cleanly with zero errors.

#### 2026-10-07 — Admin resource onboarding

**Task / Context:**\
Implement the frontend for FR-2.1 / US-2, allowing an Admin to submit a new lab resource and its initial booking rules.

**Prompt:**\
Exact user prompt: “implement this jira ticket” followed by the ticket titled “Admin onboards a new resource (name, type, location, capacity, initial rules)” and its description, acceptance criteria, and traceability to FR-2.1 / US-2.

**AI Output:**\
Implemented a separate resource onboarding form that submits to the backend, supports optional capacity and multiple initial rules, and reports success and failures.

**Student/Team Evaluation:**\
Pending human review.

**Errors / Risks / Hallucinations:**\
End-to-end use depends on the backend authentication integration supplying an Admin authority and a valid API session.

**Changes Made After Evaluation:**\
The onboarding form is kept alongside the resource management dashboard.

**Final Accepted Artifact:**\
Proposed frontend form in `src/pages/ResourceOnboardingForm.tsx`.

**Decision:**\
Modified; implementation prepared for human review.

**Reason:**\
The requested onboarding form remains available alongside the merged resource management workflows.

#### 2026-10-11 — BOOK-10 institutional Google OIDC sign-in

**Task / Context:**\
Implement the frontend sign-in experience for FR-1.1 / US-1 using Google OIDC and the configured institutional domain.

**AI Output:**\
Added the Google sign-in link, callback identity display, institutional-domain error messaging, and API/auth URL configuration. The successful OAuth callback is verified through `/auth/me` before the frontend profile is created. Resource creation includes the backend CSRF token.

**Student/Team Evaluation:**\
Pending human review. A live Google provider round-trip requires configured OAuth client credentials.

**Errors / Risks / Hallucinations:**\
Backend authentication remains authoritative for institutional-domain access; frontend checks provide user feedback and do not replace server-side enforcement.

**Final Accepted Artifact:**\
Proposed BOOK-10 frontend OAuth sign-in and callback handling.

**Decision:**\
Modified; implementation prepared for review.
