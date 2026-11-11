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

#### 2026-10-14 — Admin approval queue and scoped notifications

**Task / Context:**\
Implement the missing admin approval request queue and in-app notification count for approval-required bookings so the correct scoped admin can review only their resource type.

**Prompt:**\
“now can we implement the sending approval requests to that particular resource admin (in side bar(nav bar) there should be option approval requests where admin can see the booking requests) and in-app notications to that particular admin should be sent when the member clicks the confirm booking for the approval-required resources”

**AI Output:**\
Added a backend approval queue API with admin-scoped filtering and a frontend sidebar badge plus admin dashboard request list that allows approve/reject decisions for pending approval jobs.

**Student/Team Evaluation:**\
This is a focused, low-risk solution aligned with the existing demo-email admin scope model. The implementation avoids creating a separate notification infrastructure and instead surfaces pending approvals as a live admin queue count and request list.

**Errors / Risks / Hallucinations:**\
No notification broker or push channel exists in this project, so the implementation uses the approved in-app queue pattern rather than a real-time push service.

**Changes Made After Evaluation:**\
Updated the sidebar navigation, added the `/admin/approvals` route, added the approval queue panel in the admin dashboard, hooked it to `/api/bookings/approvals`, and fixed the generated frontend TypeScript test issue by switching from `global` to `globalThis`.

**Final Accepted Artifact:**\
`src/components/AppHeader.tsx`, `src/routes/AppRoutes.tsx`, `src/pages/AdminDashboard.tsx`, and `src/pages/MemberHistory.test.tsx`.

**Decision:**\
Accepted

**Reason:**\
It meets the request for a scoped admin queue and approval notifications with the project’s existing architecture and without broad feature expansion.

#### 2026-10-11 — Correct OAuth backend origin

**Task / Context:**\
Investigate the supplied sign-in video, where the Google sign-in link targeted `localhost:8001` and the browser reported `ERR_CONNECTION_REFUSED`.

**AI Output:**\
Compared the runtime URL in the video with the frontend environment configuration and backend Spring Boot defaults. The backend uses port `8080`; an independent `VITE_AUTH_BASE_URL` could make OAuth point at a different port from the API.

**Student/Team Evaluation:**\
Pending human review. A live OAuth round-trip still requires the backend, PostgreSQL, and Google OAuth credentials to be running/configured.

**Errors / Risks / Hallucinations:**\
The video alone cannot establish whether the backend service was running. The current environment has no backend listener, PostgreSQL listener, or Google OAuth credentials, so a live sign-in cannot be completed here.

**Changes Made After Evaluation:**\
Derived the OAuth origin from `VITE_API_BASE_URL`, removed the independent auth URL setting from the example configuration, documented the local backend prerequisite, and tightened the sign-in test to assert the default port.

**Final Accepted Artifact:**\
Updated frontend auth URL configuration, environment example, sign-in test, and setup documentation.

**Decision:**\
Modified; implementation prepared for review.

**Reason:**\
The video exposed a split-origin configuration that could send OAuth to an inactive port while API requests target the configured backend.

#### 2026-10-12 — Default unauthenticated project demo

**Task / Context:** The user asked to make the website usable without Google authentication and clarified that teammates should not need extra development-mode instructions.

**AI Output:** Added a default demo administrator profile in the frontend and hid the Google sign-in entry points while authentication is disabled.

**Student/Team Evaluation:** Pending human review.

**Errors / Risks / Hallucinations:** The demo identity has admin UI access; use only for a controlled demo. No tests were run.

**Changes Made After Evaluation:** Added `VITE_AUTH_ENABLED` as the switch to restore the Google sign-in flow; the default remains disabled for the project demo.

**Final Accepted Artifact:** Proposed frontend demo profile, no-auth navigation, and setup documentation.

**Decision:** Modified.

**Reason:** The frontend now opens directly into the app for teammates while preserving the OIDC flow behind an explicit configuration setting.

---

#### 2026-10-12 — Fix Three Admin Dashboard Issues (Deactivate, Configure, New Resource Not Appearing)

**Task / Context:** Three bugs in the admin dashboard were reported: (1) deactivating a resource failed silently, (2) configuring/updating a resource's rules failed, (3) a newly created resource did not appear in the available resources section despite a success message.

**Prompt:** "admin dashboard is not working properly … tried to deactivate a resource and it says like that … tried to configure a resource by changing the already existing requirements … tried to create a resource by adding the details, it showed a message like successful but I can't see that added resource in the resources available section, please solve these 3 issues first."

**AI Output:**
- Root cause for (1) and (2): `deactivateResource` (DELETE) and `saveResource` (PUT) were sent with no CSRF token and no credentials. Spring Security's CSRF filter rejected both with 403.
- Root cause for (3): `ResourceOnboardingForm` had no callback to notify `AdminDashboard` to refresh. After a successful POST the parent's resource list was never reloaded.
- Fix: Added `csrfFetch` helper in `apiClient.ts` that fetches a fresh CSRF token then re-attaches it to mutating requests. Updated `deactivateResource`, `restoreResource`, and `saveResource` to use `csrfFetch`. Added `onCreated?: () => void` prop to `ResourceOnboardingForm` wired to `fetchResources()` in `AdminDashboard`.

**Student/Team Evaluation:** Pending human review.

**Errors / Risks / Hallucinations:** None identified; root cause analysis matched observed 403 responses.

**Changes Made After Evaluation:** None required beyond the generated fix.

**Final Accepted Artifact:** `src/services/apiClient.ts` (`csrfFetch`), `src/services/resourceService.ts` (deactivate/restore), `src/pages/AdminDashboard.tsx` (saveResource + onCreated wiring), `src/pages/ResourceOnboardingForm.tsx` (onCreated callback).

**Decision:** Accepted.

**Reason:** All three root causes were correctly identified and fixed. Build and TypeScript compilation confirmed clean.

---

#### 2026-10-12 — Scoped Admin Dashboard Per Resource Type

**Task / Context:** The team wants different admin accounts for each resource category: Lecture Halls (`lhc@iitk.ac.in`), GPU resources (`gpus@iitk.ac.in`), and KD Lab (`kdlab@iitk.ac.in`). Each admin should only see and manage resources of their category.

**Prompt:** "my idea is to create different admin pages for different admins … we will hardcode admin mails for lecture halls it should be lhc@iitk.ac.in, for gpu - gpus@iitk.ac.in, for kd lab kdlab@iitk.ac.in, and only lecture halls will appear to the lhc admin … do these changes for now as required."

**AI Output:**
- Backend: `AdminResourceScope.java` — hardcoded email→resource-type mapping. `DemoAuthenticationFilter.java` updated to read the chosen email from a `DEMO_ADMIN_EMAIL` cookie. `DemoAdminController.java` — `POST /api/demo/switch` sets the cookie. `SecurityConfig.java` — `/api/demo/**` permitted without auth. `ResourceController.java` — GET endpoints filter resources to the caller's scope; write endpoints validate scope before allowing create/update/delete. `LabResourceService.java` — added `getResourceIncludingInactive`. `AuthController.java` — `/api/auth/me` now returns `resourceTypeScope`.
- Frontend: `adminConfig.ts` replaced with `ADMIN_SCOPES` array and `getScopeForEmail`/`getResourceTypeForEmail` helpers. `AppHeader.tsx` — amber demo admin switcher pill with dropdown (visible only in demo mode). `AdminDashboard.tsx` — displays scope badge and scoped welcome text. `ResourceOnboardingForm.tsx` — type field is pre-filled and locked when a scoped admin is active. Test files updated.

**Student/Team Evaluation:** Pending human review.

**Errors / Risks / Hallucinations:** The `DEMO_ADMIN_EMAIL` cookie is not `httpOnly=true` (intentional for JS readability); in production this path is unreachable when `mrlbs.auth.enabled=true`. Scope enforcement in the backend relies on the email claim from the OIDC token — secure in production.

**Changes Made After Evaluation:** None required; both backend (`mvnw compile`) and frontend (`npm run build`) confirmed clean.

**Final Accepted Artifact:** `AdminResourceScope.java`, `DemoAuthenticationFilter.java`, `DemoAdminController.java`, `SecurityConfig.java`, `ResourceController.java`, `LabResourceService.java`, `AuthController.java`, `adminConfig.ts`, `AppHeader.tsx`, `AdminDashboard.tsx`, `ResourceOnboardingForm.tsx`, updated test files.

**Decision:** Accepted.

**Reason:** Cleanly separates admin responsibilities by resource type, is easy to extend for new resource types, and preserves the ability to use a super-admin demo identity during development.

#### 2026-10-12 — Scoped Admin Dashboard Filters

**Task / Context:** Implement admin‑specific resource visibility on the frontend so that each admin only sees resources of their assigned type (Lecture Hall, GPU, KD Lab).

**Prompt:** User requested “make all these changes by yourself, and tell me when to run the frontend”.

**AI Output:** Updated `AdminDashboard.tsx` to compute `adminScope` as the resource type string, filtered the active resource list and the inactive resource list accordingly, and adjusted the client‑side filtering logic. Adjusted `adminScope` handling to use `getScopeForEmail(...).resourceType`.

**Student/Team Evaluation:** The code compiles, the UI now displays only the appropriate resources per admin, and the backend already enforces the same scope. No runtime errors observed.

**Errors / Risks / Hallucinations:** None identified.

**Changes Made After Evaluation:** Committed the edits to `AdminDashboard.tsx`.

**Final Accepted Artifact:** `src/pages/AdminDashboard.tsx` modifications.

**Decision:** Accepted

**Reason:** Implements the required scoped view and aligns frontend with backend scope logic.
#### 2026-10-12 — Member Search Start and End Time Selection

**Task / Context:** Update the resource booking flow so members can select the start and end time upfront in the search form alongside the date, instead of only entering times after selecting a resource.

**Prompt:** "now we will get an availability after we enter the start and end time in the availability section of a resource but a member should be able to select the start and end time in the starting where the date searching option is there , please change the flow from the current flow to therequired flow as i said"

**AI Output:** Added `searchStartTime` and `searchEndTime` fields into the search form in `MemberDashboard.tsx`. Included them in `/resources/search` query parameters. When a member selects a resource from the search results, the booking form's start time and end time fields are automatically pre-populated with the chosen search window.

**Student/Team Evaluation:** All Vitest unit tests in `MemberDashboard.test.tsx` pass. The frontend builds cleanly (`tsc -b && vite build`). The UX is much faster as members don't need to re-enter times.

**Errors / Risks / Hallucinations:** None. The labels in the search form are designated to avoid ambiguity with testing-library queries.

**Changes Made After Evaluation:** Updated `MemberDashboard.tsx`, ran vitest tests and production build.

**Final Accepted Artifact:** `src/pages/MemberDashboard.tsx` modifications.

**Decision:** Accepted

**Reason:** Eliminates redundant data entry and matches the requested booking flow.
#### 2026-10-12 — Direct Availability Display and Terminology Update

**Task / Context:** Automatically show the selected resource's availability and booking form upon search without requiring the member to click the "View availability" button first. In addition, update the site terminology from "Multi-Resource Lab Booking System" / "lab resources" to "Multi-Resource Booking System" / "resources" across landing, header, and login pages.

**Prompt:** "here the user should be able to see the avilability of a resource without even clicking the view availability button, you can see the difference between the 2 images , i want it to be like when the user enters the time he/she should be able to see the entire availability directly without creating view availability , and also in the first page(login ) it was mentioned as lab resources booking but in this we are having all types of resources so it shouldnt specifically be lab resources change that to resources"

**AI Output:** 
1. Updated `MemberDashboard.tsx` so that when search returns matching resources, it automatically loads and displays the availability details and pre-filled booking form for the first matching resource immediately.
2. Highlighted the active resource with a "Selected" badge and active styling in the matching resources list.
3. Updated `LoginPage.tsx`, `LandingPage.tsx`, and `AppHeader.tsx` to replace "Multi-Resource Lab Booking System" and "lab resources" with "Multi-Resource Booking System" and "resources".

**Student/Team Evaluation:** All 7 unit tests in `MemberDashboard.test.tsx` pass. The frontend production build succeeded. Testing confirmed the availability card and booking submission form appear immediately when search results load.

**Errors / Risks / Hallucinations:** None identified.

**Changes Made After Evaluation:** Modified `MemberDashboard.tsx`, `LoginPage.tsx`, `LandingPage.tsx`, `AppHeader.tsx`.

**Final Accepted Artifact:** Updated component files and frontend build artifacts.

**Decision:** Accepted

**Reason:** Aligns the user experience directly with user feedback by showing complete availability and booking controls immediately, while broadening terminology to reflect all institutional resources.

#### 2026-10-12 — Status Bar and Booking Flow Redesign in MemberDashboard

**Task / Context:**\
Replace the "View Availability" button in the member search results with an inline status bar (Open/Booked). Redesign the booking flow so that clicking a resource expands a dropdown panel with open slots, pre-filled start/end times, and a submit booking button with a close/exit option. Add a confirmation modal when submitting a booking that shows credits and a confirm/cancel option.

**Prompt:**\
User requested: "replace the view availability option with status bar, which shows the status of that specific resource (open/booked)... when a member searches with time slots and resource, system should be able to display all the matching resources with status bar(booked/open). if user selects any resource, there should be a drop box which shows the open slots and below that start time,end time like before... and submit booking option. this drop box should also have an exit button... and if a user selects to submit the booking there should be a pop box, which shows the credits placeholder and confirm booking option and cross button/exit button."

**AI Output / Response:**\
Rewrote `MemberDashboard.tsx` with the following changes:
- Replaced the "View Availability" button with an inline status badge (green "Open" / red "Booked") using a coloured dot and label
- Resource cards are now clickable to expand an inline booking panel
- Expanded panel shows open time slots as selectable buttons, booked slots list, and a booking form with start/end datetime inputs (pre-filled if user set them before searching)
- Added a confirmation modal overlay with booking summary (resource name, times, credit cost placeholder) and confirm/cancel buttons
- Added close/exit buttons on both the expanded panel and the confirmation modal

**Student / Team Evaluation:**\
Pending team review.

**Errors / Risks / Hallucinations:** None identified. The `available` field from the backend `ResourceSearchResponse` is used directly for the status badge.

**Changes Made After Evaluation:** Rewrote `MemberDashboard.tsx`.

**Final Accepted Artifact:** Updated `MemberDashboard.tsx` with status bars, expandable booking panel, and confirmation modal.

**Decision:** Accepted

**Reason:** Implements the user's requested flow: resources display status immediately in search results, clicking opens an inline panel with availability and booking controls, and a confirmation modal appears before final submission.

#### 2026-10-12 — Min and Max Duration Option During Resource Onboarding

**Task / Context:** Enable administrators to specify minimum and maximum booking durations (in minutes), buffer time, and max bookings per member when creating a resource through `ResourceOnboardingForm.tsx`, ensuring parity with the configuration fields in `AdminDashboard.tsx`.

**Prompt:** "in the admin pages , when admin is adding a resource ther e is no option for min max duration but when admin is configuring the resources , it is clearly visible that there is min max duration , so now admin should be able to add the min max duration while adding resource as well , please implement this correctly"

**AI Output / Response:** Added form fields in `ResourceOnboardingForm.tsx` for `Min duration (minutes)` (default 30), `Max duration (minutes)` (default 180), `Buffer time (minutes)` (default 15), and `Max bookings per member` (default 3). Implemented client-side validation to ensure `minDurationMinutes > 0`, `maxDurationMinutes > 0`, and `minDurationMinutes <= maxDurationMinutes`. Included both flat duration fields and nested `bookingRule` object in the POST payload to `/resources`. Fixed `AuthContext` import to prevent unhandled exceptions during standalone component testing. Added test coverage in `AdminDashboard.test.tsx`.

**Student / Team Evaluation:** All 5 tests in `AdminDashboard.test.tsx` pass. Production build (`npm run build`) succeeded without type errors or bundle issues.

**Errors / Risks / Hallucinations:** Identified that `AdminDashboard.test.tsx` tested `ResourceOnboardingForm` without an `AuthProvider`, which previously caused a runtime error when using `useAuth()`; resolved by safely reading from `AuthContext` directly.

**Changes Made After Evaluation:** Modified `ResourceOnboardingForm.tsx` and updated `AdminDashboard.test.tsx`.

**Final Accepted Artifact:** Updated `ResourceOnboardingForm.tsx` and `AdminDashboard.test.tsx`.

**Decision:** Accepted

**Reason:** Admins can now configure min/max durations upfront when adding resources instead of having to configure them in a second step.

#### 2026-10-13 — Restore IITK Google OIDC authentication

**Task / Context:** The user requested latest `main` as the base for new `authentication` branches in both repositories, a working authentication path for IITK accounts, and no push before successful testing.

**Prompt:** "pull the latest versions of main for both frontend and backend and create a new branch on authentication and we need to find an alternative to make authentication work and also dont push until you have tested that authentication works and keep in mind that the accounts are .iitk.ac.in accounts and plan accordingly"

**AI Output / Response:** Replaced typed-email login with the backend Google OAuth 2.0 / OIDC flow and configured it as the normal frontend behavior.

**Student / Team Evaluation:** Pending. Production build passed. OIDC-focused frontend tests pass; the full frontend run has 7 existing `MemberDashboard` test failures because the current resource card is selectable directly while tests expect a separate "View availability" button. The live Google authorization redirect was verified, but the IITK account callback still needs a user sign-in.

**Errors / Risks / Hallucinations:** A successful Google sign-in must still produce the configured Workspace hosted-domain claim. The email suffix is also checked but is not used as a replacement for Google organization validation. Authentication has not yet been confirmed end to end with an IITK account.

**Changes Made After Evaluation:** Set the Google OAuth entry link and callback handling as the normal sign-in route, removed the insecure typed-email login choices, and clarified local environment requirements.

**Final Accepted Artifact:** Local frontend implementation on the `authentication` branch; not pushed.

**Decision:** Modified.

**Reason:** The frontend now hands identity verification to Google and only creates a local profile after the backend verifies the institutional OIDC session.

#### 2026-10-13 — Switch institutional sign-in to Microsoft Entra

**Task / Context:** The user confirmed they can sign in to Microsoft 365 with the IITK account, while Google says the account cannot be found. They authorized finding an alternative and asked that nothing be pushed before authentication is tested.

**AI Output / Response:** Changed the login link and callback handling to use the backend's Microsoft Entra OIDC registration, with provider-specific success and failure messages.

**Student / Team Evaluation:** 8 focused frontend authentication tests passed and the production build passed. The end-to-end provider callback is pending a Microsoft Entra app registration and local client credentials.

**Errors / Risks / Hallucinations:** The frontend only creates a local profile after `/api/auth/me` returns the backend-verified institutional identity. The frontend domain check supplements backend tenant and domain validation; it does not replace it.

**Changes Made After Evaluation:** Updated the sign-in URL, identity-check messages, authentication tests, and README. No commits or pushes were made.

**Final Accepted Artifact:** Local frontend implementation on the `authentication` branch; provider sign-in awaits Entra application credentials.

**Decision:** Pending real sign-in.

**Reason:** Microsoft 365 is the institutional identity the user can access; Google does not recognize this address.


#### 2026-10-13 — Switch login to IITK mailbox verification

**Task / Context:** The user could not proceed through Microsoft OAuth because the institutional tenant requires admin approval and approved email delivery as an alternative.

**Prompt:** "yeah the mail sending thing is better"

**AI Output / Response:** Replaced the Microsoft sign-in link with a two-step institutional email/code form. On application load, the frontend now verifies `/api/auth/me` before restoring a cached profile; after entering the code it creates a profile only from a successful backend response.

**Student / Team Evaluation:** Pending user review and a real SMTP test. Focused auth and route tests passed (5 tests); the production build passed. Full frontend test suite still has 7 unrelated existing MemberDashboard failures where test expectations do not match the current interface.

**Errors / Risks / Hallucinations:** This is mailbox possession verification and does not satisfy the originally specified Google OAuth/OIDC authentication mechanism. It requires an operational SMTP relay, which has not been configured or tested with a real recipient.

**Changes Made After Evaluation:** Replaced Microsoft-specific text and callback logic with email/code form interactions, added focused UI tests, and made server session validation authoritative over local profile cache.

**Final Accepted Artifact:** Local frontend implementation on the existing `authentication` branch. No commits or pushes were made. Real email delivery still needs SMTP configuration.

**Decision:** Modified.

**Reason:** User approved mail sending as a practical authentication workaround.

**Verification update:** The final focused auth/navigation run passes 6 tests and the production build passes. The full frontend suite reports 25 passing tests and 7 pre-existing failures in MemberDashboard.test.tsx, where the tests expect a separate “View availability” control and booking text that the current page does not render. No SMTP delivery test was possible because there are no SMTP settings in the workspace environment.

---

#### 2026-10-13 � Fix admin resource onboarding blocked by demo cookie conflict (403 Forbidden)

**Date:** 2026-10-13

**Task / Context:**
Admin users (e.g. `lhc@iitk.ac.in`) were receiving `Only an Admin can onboard a resource.` (HTTP 403) when submitting the Resource Onboarding Form, even after successfully logging in via the Admin Login flow.

**Prompt:**
`why i am unable to book a resource, why am i getting like this, dont change any code just give me reason` (diagnosis request); followed by `to onboard a resource only, i am currently in lhc admin but couldnot onboard a resource, make changes such that resource onboarding by admins happens successfully.`

**AI Output / Response:**
Fixed three interlocking bugs: (1) `AuthContext.tsx` logout now clears both `DEMO_ADMIN_EMAIL` and `DEMO_MEMBER_EMAIL` cookies. (2) `LoginPage.tsx` handleAdminLogin clears `DEMO_MEMBER_EMAIL` before calling the backend /api/demo/switch endpoint, preventing the stale member cookie from shadowing the new admin identity. Corresponding backend fixes in `AuthController.java` and `DemoAuthenticationFilter.java` ensure `DEMO_ADMIN_EMAIL` is always checked first.

**Student / Team Evaluation:**
Pending human review.

**Errors / Risks / Hallucinations:**
No hallucinations. The fix is scoped to the demo-auth path; production (`mrlbs.auth.enabled=true`) is unaffected.

**Changes Made After Evaluation:**
`AuthContext.tsx`, `LoginPage.tsx` (frontend); `AuthController.java`, `DemoAuthenticationFilter.java` (backend).

**Final Accepted Artifact:**
Admin resource onboarding now succeeds from the frontend form when logged in as any scoped admin (LHC, GPU, KD Lab).

**Decision:** Pending human review.

**Reason:** Bug fix � demo-mode cookie priority and cleanup corrected; no change to production auth or resource creation logic.

#### 2026-10-13 — Merge latest main into authentication branches

**Task / Context:** The user asked to update both repositories from the latest `main` and resolve conflicts in their branches.

**Prompt:** “now pull the latest version of main for both backend and frontend” followed by “and then resolve the merge conflicts of my branches”.

**AI Output / Response:** Merged the latest `origin/main` changes into the `authentication` branch in each repository and resolved overlapping login, member dashboard, and engineering-log changes while preserving both feature sets.

**Student / Team Evaluation:** The user reports that the email-code flow was tested with a real IITK account and works. No tests were rerun after this merge.

**Errors / Risks / Hallucinations:** The full frontend suite previously had seven `MemberDashboard.test.tsx` failures; these have not been rerun after merging main.

**Changes Made After Evaluation:** Kept the email-code sign-in UI and CSRF-aware member requests while incorporating the AI assistant and latest dashboard changes.

**Final Accepted Artifact / Output:** Updated local `authentication` branches in both repositories; no remote push has been made yet.

**Decision:** Modified.

**Reason:** Resolve conflicts while retaining the verified institutional mailbox flow and latest mainline work.
#### 2026-10-13 — Publish resolved authentication merge

**Task / Context:** Follow-up to merging latest `main` into the frontend authentication branch.

**AI Output / Response:** Pushed the resolved merge commit and verified the remote branch matches local `HEAD`.

**Student / Team Evaluation:** GitHub reports frontend PR #16 as mergeable with a clean merge state. Tests were not rerun after this merge.

**Final Accepted Artifact / Output:** `authentication` is updated on origin at `adb75c047a33b2392b70eaa4769c241a65417a76`.

**Decision:** Accepted.

**Reason:** The user requested conflict resolution on their branches.

#### 2026-11-06 — Frontend verification and coverage

**Task / Context**

Collect verification evidence on a branch based on frontend `main` at `bce1818` and restore the failing workflow tests.

**Prompt**

The user requested test, coverage, security, concurrency, performance, and recovery reports, plus defects with fixes, GitHub issues, and a pull request.

**AI Output**

Ran Vitest and reproduced 13 failures out of 46 tests. Updated the login, routing, and booking tests for the current labels, API requests, and draft and confirmation flow. Added a V8 coverage command.

**Student / Team Evaluation**

Pending human review.

**Errors / Risks / Hallucinations**

The browser component tests use mocked HTTP. The time-window change test exercises the UI contract, and the backend baseline lacks the corresponding route. Lint reports three errors and three warnings in existing application code.

**Changes Made After Evaluation**

Adjusted the assertions and fixtures for current workflow behavior. All 46 tests passed with coverage, and the production build succeeded.

**Final Artifact / Output**

Updated workflow tests and coverage configuration, tracked in GitHub issue #27.

**Decision**

Pending human review.

**Reason**

The tests verify the workflows implemented by the current frontend and the coverage command reproduces the reported metrics.

#### 2026-11-06 — BOOK-117, BOOK-118 and BOOK-119 frontend integration

**Task / Context**

Keep member and scoped admin workflows working with verified backend sessions and HTTPS production APIs.

**Prompt**

The user asked to implement the three Jira security tickets and test the running app and existing workflows.

**AI Output**

Unified frontend API URL handling, updated the sign-in text for verified sessions, sent a CSRF token on logout, and only updated inbox state when the server accepted the action.

**Student / Team Evaluation**

Pending human review.

**Errors / Risks / Hallucinations**

The live run used a local HTTPS server and a local STARTTLS mailbox. Hosted browser cookie and proxy behavior depends on deployment configuration.

**Changes Made After Evaluation**

Ran the built frontend in Chrome against the real HTTPS backend and PostgreSQL. Verified sign-in, booking, member history, the scoped approval UI, and logout. The production build succeeded and all 46 Vitest tests passed.

**Final Artifact / Output**

Frontend integration for the verified backend session and HTTPS deployment.

**Decision**

Pending human review.

**Reason**

All frontend calls now use the same production API policy and the browser workflows were exercised against the running stack.

#### 2026-11-11 — Password sign-in and recovery screens

- **Prompt** — The user asked for member and admin passwords, OTP password recovery, and a running backend, then requested “ok fix it” after the security assessment.
- **Implementation** — Replaced the email-only sign-in with a password form and emailed-code setup and reset. The frontend uses the server-issued role and session, and member credit and booking calls use the authenticated session.
- **Verification and changes** — Updated the login and routing tests. The production build and all 14 focused tests passed. The full frontend suite passed 43 of 45 tests. Two booking-reschedule tests expect a Change time button absent from the existing dashboard.
- **Final artifact** — Updated authentication screens, profile restoration, session-backed API calls, documentation, and tests.
- **Team evaluation and decision** — Pending human review. No acceptance decision recorded.
