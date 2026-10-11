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

#### 2026-10-07 — Admin resource onboarding

**Task / Context:**\
Implement the frontend for FR-2.1 / US-2, allowing an Admin to submit a new lab resource and its initial booking rules.

**Prompt:**\
Exact user prompt: “implement this jira ticket” followed by the ticket titled “Admin onboards a new resource (name, type, location, capacity, initial rules)” and its description, acceptance criteria, and traceability to FR-2.1 / US-2.

**AI Output:**\
Replaced the Admin dashboard placeholder with a resource onboarding form that submits to the backend, supports optional capacity and multiple initial rules, and reports success and failures. This entry summarizes the generated work; the exact code is in the files listed below.

**Student/Team Evaluation:**\
Pending human review. The backend requires `ROLE_ADMIN`; the current project scaffold does not yet provide sign-in or role provisioning.

**Errors / Risks / Hallucinations:**\
End-to-end use depends on the backend authentication integration supplying an Admin authority and a valid API session.

**Changes Made After Evaluation:**\
No human evaluation has been provided yet.

**Final Accepted Artifact:**\
Proposed frontend form in `src/pages/AdminDashboard.tsx` and expanded `src/types/Resource.ts`, with tests in `src/pages/AdminDashboard.test.tsx`. Human acceptance is pending.

**Decision:**\
Modified; implementation prepared for human review.

**Reason:**\
The requested form was implemented. Sign-in and role provisioning are outside the existing frontend scaffold.

#### 2026-10-11 — BOOK-10 institutional Google OIDC sign-in

**Task / Context:**\
Implement the frontend sign-in experience for FR-1.1 / US-1 using Google OIDC and the configured institutional domain.

**Prompt:**\
The user requested implementation of the institutional Google sign-in ticket, specified the initial domain `iitk.ac.in`, and authorized consulting `Deliverable_1_Final.pdf` for requirements context. Deliverable 1 identifies institutional authentication as BOOK-10.

**AI Output:**\
Replaced the login placeholder with a Google sign-in link, displays the authenticated account after the backend callback, surfaces domain/authentication failures, and sends the CSRF token when posting a new resource. Updated frontend API/auth URL configuration. This is a summary of the generated work, not a verbatim transcript.

**Student/Team Evaluation:**\
Pending human review. The frontend must point to the backend and the backend must have valid Google OAuth client credentials configured for live sign-in.

**Errors / Risks / Hallucinations:**\
No real Google client credentials are available in the repository, so a live provider round-trip cannot be performed here. Backend authentication is authoritative; frontend text does not enforce domain access.

**Changes Made After Evaluation:**\
No human evaluation has been provided yet.

**Final Accepted Artifact:**\
Proposed frontend sign-in in `src/pages/LoginPage.tsx`, URL configuration in `src/services/apiClient.ts` and `.env.example`, plus the Admin request's CSRF header. Tests are in `src/pages/LoginPage.test.tsx` and `src/pages/AdminDashboard.test.tsx`. Human acceptance is pending.

**Decision:**\
Modified; implementation prepared for human review.

**Reason:**\
The sign-in UI and callback handling were implemented. Live provider credentials must be configured by the deployment owner.
# 2026-10-11 — BOOK-78 pricing edge cases

**Task/context:** Add Admin inputs for per-resource minimum billable duration and maximum contention multiplier, and cover their API payload with tests.

**Prompt:** Complete assigned Jira backlog issues on stacked branches and include extensive unit tests; BOOK-78 requires Admin-configurable pricing edge cases.

**AI output/response:** Added validated numeric controls with defaults matching initial policy and included values in the resource creation request. Added UI tests for the defaults and custom values.

**Student/team evaluation:** Pending human review.

**Errors, risks, or hallucinations identified:** The booking workflow is not yet present on this branch, so this change configures the policy but does not itself consume the values during a booking.

**Changes made after evaluating the AI output:** Connected both settings to the existing resource onboarding payload and reset their values on successful creation.

**Final accepted artifact/output:** Proposed BOOK-78 Admin form and tests. Human acceptance is pending.

**Decision:** Modified.

**Reason:** The Admin configuration is now available and covered by request-payload tests; the booking calculation is delivered in the backend.
