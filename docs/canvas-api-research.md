# Canvas LMS API research: local dashboard MVP

Research date: 2026-08-30

## Recommendation

The dashboard is practical as a local TanStack Start application, but the Canvas token should never be part of the browser bundle or normal client-side state. The recommended shape is a small same-origin backend-for-frontend (BFF):

```text
Browser dashboard on localhost
        |
        | same-origin tRPC call or TanStack server function
        v
Local TanStack Start server
        |
        | HTTPS + Authorization: Bearer <token>
        v
User's institution-specific Canvas origin
```

For the first private prototype, keep the Canvas origin and personal access token (PAT) in server-only environment variables, or accept them once through a same-origin setup form and retain them only in server memory. The browser should receive normalized Canvas data, never the token.

There is an important product boundary: Canvas describes manually generated tokens as a way to test an application before OAuth is implemented. Asking another user to generate a token and enter it into an application violates Canvas policy, and an application used by multiple users **must use OAuth**. Canvas also says not to embed tokens in web pages and treats token storage like password storage. Therefore PAT entry is suitable for this developer's own local prototype, not as the authentication design of a distributed product. See the official [Canvas OAuth2 overview](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth) and [Canvas API policy](https://www.instructure.com/policies/canvas-api-policy).

## Canvas origin and authentication

Canvas REST requests go over HTTPS to the user's normal Canvas domain, not a single global API host. The app should ask for or configure the complete origin, for example:

```text
https://school.instructure.com
https://canvas.university.edu
```

The user-facing Canvas account ID is not needed to list that user's own courses. `GET /api/v1/courses` is relative to the institution origin and identifies the user from the token. This follows the [Canvas API overview](https://developerdocs.instructure.com/services/canvas), which specifies HTTPS against the normal Canvas domain.

Normalize the configured value to a URL origin. For a hosted or Internet-reachable instance, require `https:`, reject credentials, query strings and fragments, and do not silently accept a path such as `/courses/123`. Do not restrict hosts to `*.instructure.com`, because institutions can use custom domains and Canvas can be self-hosted.

Every server-to-Canvas request should include:

```http
Authorization: Bearer <ACCESS_TOKEN>
Accept: application/json+canvas-string-ids
```

Canvas recommends the `Authorization` header. Although a token can be passed in the query string, Canvas discourages this because URLs are more likely to be logged or leaked. Canvas IDs can be 64-bit integers; the special `Accept` media type makes Canvas return integer IDs as strings so JavaScript does not lose precision. Both behaviors are documented in the [OAuth2 overview](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth) and [API overview](https://developerdocs.instructure.com/services/canvas).

### Creating a manual token for this prototype

In Canvas, open **Account -> Settings**, find **Approved Integrations**, and choose **Add New Access Token**. Give it a purpose and an expiration, generate it, and copy it when shown. Token generation may be disabled by the institution, and current Canvas rules can impose role-based expiration limits. Tokens have the same effective access as the user and should be revoked immediately if exposed. See Instructure's [access-token user guide](https://community.instructure.com/en/kb/articles/662901-how-do-i-manage-api-access-tokens-in-my-user-account).

Use this only for the developer's own test instance. The setup UI should say this explicitly instead of presenting PAT entry as a supported sign-in flow for general users.

## Why calls should be server-side

A browser page on `http://localhost:3000` and an institution Canvas site are different origins. Adding an `Authorization` header makes the request subject to CORS preflight; the [Fetch Standard](https://fetch.spec.whatwg.org/) specifically treats `Authorization` as a CORS non-wildcard request header. A successful direct browser call therefore depends on the specific Canvas deployment returning matching CORS response headers. The Canvas REST documentation does not promise portable cross-origin browser access across hosted and self-hosted installations.

Even if one institution happens to allow the origin, browser-direct access is still the wrong default because it places a password-equivalent token in JavaScript-accessible memory and exposes it to XSS, browser extensions, development tools, and accidental logging. Canvas explicitly says: do not embed tokens in web pages, do not put them in URLs, and protect web apps against XSS, request forgery, and replay attacks. See [Storing Tokens](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth).

The BFF also gives one place to normalize Canvas errors, follow pagination, enforce a trusted origin, redact logs, and later replace the PAT with OAuth without rewriting the UI.

In this repository, either the existing tRPC layer or TanStack Start `createServerFn` can form that boundary. The route loader may call the server procedure, but must not call Canvas directly or contain the token. The returned dashboard payload should use `Cache-Control: no-store` (or, if caching is later justified, a strictly private per-user cache).

## Credential storage choices

| Choice | Suitability | Notes |
| --- | --- | --- |
| Server-only `.env.local` | Best first step | Configure `CANVAS_ORIGIN` and `CANVAS_ACCESS_TOKEN`; the repository already ignores `*.local`. Restart to change credentials. Never use a `VITE_` prefix because that exposes values to client code. |
| Same-origin setup form -> server memory | Good local UX | POST origin and token to a server mutation, verify them, store only in the local server process, and return an opaque HttpOnly session cookie. Forget the token on logout or process restart. |
| OS keychain through a native wrapper | Best later local app | Canvas recommends native keychain storage. A normal web page cannot directly use the OS keychain; this fits a future Tauri/Electron/native shell. |
| Encrypted server-side store | Required consideration for deployment | Requires application authentication, per-user isolation, encryption key management, deletion/revocation, and incident handling. At that point use Canvas OAuth rather than manual PAT collection. |
| `localStorage`, `sessionStorage`, IndexedDB, client state, or a cookie containing the raw PAT | Do not use | All make the token available to browser JavaScript or cause it to be sent/serialized in places where it can leak. |

If the app is deployed anywhere other than the user's machine, it is no longer meaningfully local: the remote operator can receive the Canvas token and Canvas data. A remotely hosted version needs explicit application authentication and Canvas OAuth. The scaffold currently contains Clerk; that may be useful for a future hosted mode, but it is not needed to protect a single-user process bound only to loopback.

## First API calls

### 1. Test the connection and identify the user

```http
GET /api/v1/users/self/profile
```

This returns profile data for the token's user, including ID, name, and profile image. Canvas allows `self` wherever the users API supports the current user. Use this call immediately after configuration and display the connected user and Canvas origin without ever echoing the token. See the [Users API](https://developerdocs.instructure.com/services/canvas/resources/users).

Treat `401` with a `WWW-Authenticate` header as an invalid, expired, revoked, or wrong-domain token and ask the developer to reconnect; the OAuth documentation describes this distinction. Treat `403` as a permission failure for the requested resource rather than automatically declaring the token invalid.

### 2. List active courses and enrollment data

```http
GET /api/v1/courses
  ?enrollment_state=active
  &include[]=term
  &include[]=course_image
  &include[]=favorites
  &include[]=teachers
  &include[]=total_scores
  &include[]=concluded
  &per_page=100
```

`GET /api/v1/courses` returns the paginated list of active courses for the current user. Important parameters from the [Courses API](https://developerdocs.instructure.com/services/canvas/resources/courses) are:

- `enrollment_state=active|invited_or_pending|completed` filters the user's enrollment state and respects course, section, term, and date overrides.
- `enrollment_type=teacher|student|ta|observer|designer` can create role-specific views, but omitting it is better for a unified dashboard.
- `state[]=unpublished|available|completed|deleted` filters course workflow state. Defaults vary by enrollment type, so the UI should not infer that every returned course is student-visible in the same way.
- `include[]=term`, `course_image`, `favorites`, and `teachers` provide card metadata.
- `include[]=total_scores` adds computed score/grade fields to student enrollments when the user is allowed to see them. Canvas omits them when final grades are hidden, so grades must be optional in the UI.
- `include[]=concluded` helps label courses whose dates have ended.

A user can hold multiple enrollments or roles. Do not flatten `course.enrollments` to a single assumed student enrollment. For a detailed role/enrollment view, use:

```http
GET /api/v1/users/self/enrollments
```

The [Enrollments API](https://developerdocs.instructure.com/services/canvas/resources/enrollments) supports `type[]`, `state[]`, and user-specific synthetic states such as `current_and_future` and `current_and_concluded`. It also documents that grades are permission-dependent.

If the desired course-card list should match Canvas favorites, another option is `GET /api/v1/users/self/favorites/courses`. It returns favorite courses, or a default selection of currently enrolled courses when the user has not selected favorites. See the [Favorites API](https://developerdocs.instructure.com/services/canvas/resources/favorites).

### 3. Add useful dashboard sections

The smallest useful MVP can stop at profile plus courses. The next endpoints can be added in this order:

| Dashboard area | Endpoint | Purpose |
| --- | --- | --- |
| Upcoming / to-do | `GET /api/v1/planner/items` | Paginated learning objects for the current user's planner. Supports `start_date`, `end_date`, course/group `context_codes[]`, and incomplete/completed activity filters. [Planner API](https://developerdocs.instructure.com/services/canvas/resources/planner) |
| Missing work | `GET /api/v1/users/self/missing_submissions` | Student-focused list of past-due assignments with no submission. [Users API](https://developerdocs.instructure.com/services/canvas/resources/users) |
| Recent grades | `GET /api/v1/users/self/graded_submissions?include[]=assignment&only_current_enrollments=true&only_published_assignments=true` | Recently graded submissions for the current user. [Users API](https://developerdocs.instructure.com/services/canvas/resources/users) |
| Activity | `GET /api/v1/users/self/activity_stream` | Paginated global activity stream. [Users API](https://developerdocs.instructure.com/services/canvas/resources/users) |
| Course detail | `GET /api/v1/courses/:course_id/assignments?bucket=upcoming&order_by=due_at` | Upcoming assignments for one selected course. [Assignments API](https://developerdocs.instructure.com/services/canvas/resources/assignments) |

Planner items are a better first dashboard feed than fetching assignments separately for every course: one bounded date-range request avoids an N+1 fan-out and already models the objects Canvas considers relevant to the user's planner.

## Pagination and throttling

Canvas collection endpoints default to 10 records. `per_page` can request more, but Canvas intentionally leaves the maximum unspecified. Every collection client must inspect the case-insensitive `Link` response header, find `rel="next"`, and follow that absolute URL until no next link remains. Canvas says those URLs are opaque and may omit `rel="last"`; do not calculate page URLs yourself. See the official [Pagination guide](https://developerdocs.instructure.com/services/canvas/basics/file.pagination).

For this local BFF:

1. Fetch sequentially, not with a burst of parallel page requests.
2. Parse `Link` on the server.
3. Before following `rel="next"`, require that its origin exactly matches the configured Canvas origin and that its path is under `/api/`; this prevents an absolute pagination URL from becoming an SSRF or token-exfiltration primitive.
4. Reattach the Bearer header on each request. Using header authentication avoids Canvas's special case where query-string access tokens are intentionally omitted from pagination links.
5. Set a defensive page/item cap and surface partial-result errors rather than looping forever.

Canvas uses dynamic request-cost throttling. It returns `X-Request-Cost`, may return `X-Rate-Limit-Remaining`, and can reject requests with a rate-limit response. Canvas says a client making no more than one simultaneous request is unlikely to be throttled; retry later with backoff instead of fanning out. See [Canvas throttling](https://developerdocs.instructure.com/services/canvas/basics/file.throttling).

## Local threat model and controls

| Risk | Control for the MVP |
| --- | --- |
| XSS steals the PAT | PAT exists only on the server; return normalized JSON; use a restrictive Content Security Policy; do not add analytics or third-party scripts to the local token-entry page. |
| Token leaks through URLs or logs | Bearer header only; redact `Authorization`; never log setup inputs, full headers, thrown request objects, or environment values. |
| SSR/loader serializes a secret | Put all credential access in server-only modules/procedures. Never return configuration objects containing the token. Search built assets for a known test marker before release. |
| Attacker supplies a Canvas URL and turns the BFF into an SSRF proxy | Validate and pin one origin; HTTPS by default; reject private/loopback/link-local targets unless a self-hosted development origin is explicitly trusted; reject cross-origin redirects and cross-origin pagination links. Expose named Canvas operations, not a generic `proxy(url)` endpoint. |
| Malicious Canvas HTML creates XSS | Avoid requesting or rendering `syllabus_body` and assignment descriptions in the first release. React-render plain text. If rich content is added, sanitize it and constrain links/images before `dangerouslySetInnerHTML`. |
| Another site calls the localhost server | Bind the development/packaged server to `127.0.0.1`, not `0.0.0.0`; validate `Origin` on mutations; use SameSite, HttpOnly cookies for an opaque local session ID; do not enable wildcard CORS on the local BFF. |
| Cached private course data leaks | Return `Cache-Control: no-store` for dashboard/session responses and avoid service-worker caching until a deliberate offline-data design exists. |
| Token expires or is revoked | Handle `401` cleanly, clear the in-memory credential, and show reconnect/revoke guidance. Do not retry authentication failures indefinitely. |
| Local machine compromise or hostile browser extension | Document that the PAT is password-equivalent. Prefer short-lived tokens, least privilege where the institution supports scopes, and OS keychain storage in a later native wrapper. A web architecture cannot defend against a fully compromised host. |

Start read-only. Do not implement submission, grade, enrollment, messaging, or file mutation endpoints until the token lifecycle and same-origin protections are tested. The current dashboard endpoints are all `GET` operations.

## Canvas Cloud and self-hosted installations

The REST resource paths are the same, but the origin, available version, account policy, and enabled features can differ.

- Canvas Cloud developer keys are issued and enabled by the institution's administrator. A key is normally tied to that root account and its subaccounts; multi-institution vendors need the appropriate developer-key arrangement. See [Developer Keys](https://developerdocs.instructure.com/services/canvas/oauth2/file.developer_keys).
- Open-source/self-hosted Canvas administrators can create a client ID and secret through the Site Admin account. The official [Canvas LMS repository](https://github.com/instructure/canvas-lms) confirms that Canvas is open source and documents self-hosting.
- A self-hosted instance may run a different Canvas release or reverse-proxy configuration. Feature-detect optional fields, tolerate permission-based omissions, and do not assume a CORS policy. Server-to-server requests avoid depending on that policy.
- Hosted tenants may use an `instructure.com` subdomain or a vanity domain. Store the exact origin with the credential. A token used against the wrong Canvas domain can produce `401`; the [OAuth2 overview](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth) explicitly calls out wrong-domain tokens.

## Proposed implementation slices

1. **Connection slice:** server-only Canvas client, strict origin validation, Bearer/string-ID headers, redacted errors, and a `profile` call.
2. **Courses slice:** paginated `courses` call, runtime response validation, normalized course/enrollment/card model, empty/error/loading states.
3. **Dashboard slice:** profile header, active/favorite course cards, optional score and role badges, and Canvas deep links from returned `html_url` values after same-origin validation.
4. **Planner slice:** one date-bounded planner query, due-date grouping in the user's locale/time zone, and missing-work section for student enrollments.
5. **Hardening slice:** pagination caps, 429 backoff, no-store headers, CSP, origin/redirect tests, log-redaction tests, and build-output secret scan.
6. **Productization decision:** keep it strictly single-user/local, package it with an OS keychain, or obtain institution developer keys and implement Canvas OAuth before inviting any other user.

The first demonstrable milestone is therefore: enter server-only development credentials, verify `/users/self/profile`, fetch all active course pages through the BFF, and render resilient course cards. That proves the Canvas connection, permission model, pagination, and local security boundary without prematurely adding write access.
