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
# 2026-10-11 — BOOK-79 member booking submission

**Task/context:** Expose the authenticated booking submission flow and explain reason-coded failures to the Member.

**Prompt:** Complete assigned backlog tickets in a stacked branch/PR series with extensive tests; BOOK-79 covers invalid submissions and insufficient credits.

**AI output/response:** Replaced the Member placeholder with a booking submission form using the authenticated session, CSRF token, and backend API. It presents specific insufficient-credit and unavailable-slot feedback.

**Student/team evaluation:** Pending human review. Resource selection is temporary and will be replaced by searchable resources/availability in BOOK-81.

**Errors, risks, or hallucinations identified:** The API uses local date-time values; serializing browser `datetime-local` values as UTC would make them incompatible with the backend request type, so values are sent as local ISO date-time strings.

**Changes made after evaluating the AI output:** Added tests for request fields/credentials/CSRF and the specific insufficient-credit message.

**Final accepted artifact/output:** Proposed BOOK-79 Member submission UI and tests. Human acceptance is pending.

**Decision:** Modified.

**Reason:** The UI now makes a real authenticated booking request and reports the backend's stable business reason in clear language.
# 2026-10-11 — BOOK-81 resource discovery and availability UI

**Task/context:** Add Member-facing filters, search results, booked/open interval display, and slot selection.

**Prompt:** Complete the assigned Jira backlog as individually stacked PRs with extensive tests; BOOK-81 requires search and availability for the selected date.

**AI output/response:** Added type/date/capacity search controls, result list with date availability, availability view for a selected result, and buttons that prefill a booking time window from an open interval.

**Student/team evaluation:** Pending human review. The UI renders the date interval provided by the backend, including unbooked gaps across the full calendar day.

**Errors, risks, or hallucinations identified:** The backend has no resource-hours configuration, so availability is displayed across the selected calendar day.

**Changes made after evaluating the AI output:** Added component tests verifying filter query, chosen resource/date, rendering of booked/open intervals, slot prefill, and final authenticated booking payload.

**Final accepted artifact/output:** Proposed BOOK-81 Member discovery/availability experience and tests. Human acceptance is pending.

**Decision:** Modified.

**Reason:** The search result flows directly into persisted availability and lets a Member pick an available interval.
# 2026-10-11 — BOOK-84 Admin-configured approval requirement

**Task/context:** Let Admins mark new resources as requiring human review and send that option to the resource API.

**Prompt:** Complete assigned tickets through Sprint 3 as stacked PRs with extensive tests; BOOK-84 places approval-required bookings in a pending workflow.

**AI output/response:** Added an Admin checkbox for approval-required resources and sent the value in the resource creation request.

**Student/team evaluation:** Pending human review. Admin approval decisions are outside this ticket's scope.

**Errors, risks, or hallucinations identified:** The backend determines whether to create PENDING_APPROVAL; client state is only configuration input.

**Changes made after evaluating the AI output:** Added payload tests for default-off and explicitly enabled approval policy.

**Final accepted artifact/output:** Proposed BOOK-84 resource configuration control and tests. Human acceptance is pending.

**Decision:** Modified.

**Reason:** The Admin can now persist the policy that drives the backend pending state.
# 2026-10-11 — BOOK-91 concurrent slot rejection feedback

**Task/context:** Ensure the Member booking form explains a conflict returned when another request wins the slot.

**Prompt:** Complete assigned Sprint 3 work in stacked PRs with extensive tests. BOOK-91/BOOK-92 require the losing request to receive a clear unavailable-slot result.

**AI output/response:** Added UI regression coverage for the backend `SLOT_NO_LONGER_AVAILABLE` reason code.

**Student/team evaluation:** Pending human review.

**Errors, risks, or hallucinations identified:** The existing form already handled this reason code; this branch adds its missing test and keeps the UI behavior explicit.

**Changes made after evaluating the AI output:** Test submits a request after searching and selecting availability, then asserts the user-facing conflict message.

**Final accepted artifact/output:** Proposed BOOK-91 conflict feedback regression test.

**Decision:** Modified.

**Reason:** The contention failure has user-visible feedback and test coverage.
# 2026-10-11 — BOOK-86 member time-window changes

**Task/context:** Let Members view their bookings and change a future confirmed booking's time window.

**Prompt:** Complete Teja Satvik's assigned tickets through Sprint 3 with stacked PRs and extensive tests.

**AI output/response:** Added a member booking list with an edit flow that submits the new window to the backend and updates the displayed booking after success.

**Student/team evaluation:** Pending human review.

**Errors, risks, or hallucinations identified:** The server remains authoritative for start-time eligibility, pricing, availability, and transactional locking.

**Changes made after evaluating the AI output:** Added tests for successful replacement and a conflict response that leaves the original displayed window intact.

**Final accepted artifact/output:** Proposed BOOK-86 booking history and modification flow. Human acceptance is pending.

**Decision:** Modified.

**Reason:** The Member has an authenticated path to modify a booking while preserving server-side validation.
# 2026-10-11 — BOOK-88 booking cancellation safeguards

**Task/context:** Let Members cancel eligible upcoming bookings and explain when the server rejects cancellation after start.

**Prompt:** Complete assigned Sprint 3 tickets in stacked PRs with extensive tests.

**AI output/response:** Added a CSRF-protected cancellation action for confirmed and pending bookings; the list updates only when the backend confirms cancellation.

**Student/team evaluation:** Pending human review.

**Errors, risks, or hallucinations identified:** Eligibility is decided by the backend using the persisted status and scheduled start time.

**Changes made after evaluating the AI output:** Added frontend tests for successful cancellation and a post-start rejection that leaves the booking active in the list.

**Final accepted artifact/output:** Proposed BOOK-88 member cancellation action and tests. Human acceptance is pending.

**Decision:** Modified.

**Reason:** The Member can request cancellation while the UI reflects only server-confirmed status changes.
