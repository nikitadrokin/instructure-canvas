# Canvas Local

A private, local-first dashboard for Canvas LMS. Connect your institution's Canvas domain and a personal access token to see active courses, scores, and upcoming work in a calmer interface.

> [!IMPORTANT]
> Manual Canvas tokens are intended for personal testing. Do not ask other users to paste tokens into a deployed product. A multi-user version must use Canvas OAuth and proper application authentication.

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), then enter:

- Your normal Canvas domain, such as `school.instructure.com`
- A personal access token from **Canvas → Account → Settings → Approved Integrations**

The token is sent once to the same-origin TanStack Start server. It remains only in server memory behind an opaque HttpOnly, SameSite cookie and disappears when the server restarts or you disconnect. It is never placed in a URL, browser storage, or dashboard response.

## What works

- Canvas connection and current-user profile verification
- Active courses with term, role, and permission-dependent grade data
- Upcoming assignments and calendar events
- Canvas pagination through opaque `Link` headers
- Course and assignment deep links back to the institution's Canvas UI
- Responsive desktop and mobile layouts
- Session restore, refresh, and disconnect

The integration uses `Authorization: Bearer <token>` and requests `application/json+canvas-string-ids` so Canvas's 64-bit IDs remain safe in JavaScript.

## Security controls

The local server exposes named, read-only Canvas operations rather than a generic API proxy. Canvas origins must use public HTTPS, redirects and cross-origin pagination links are rejected, requests time out, responses are validated with Zod, and dashboard responses use `Cache-Control: no-store`.

For stricter host pinning, set a comma-separated allowlist before starting:

```bash
CANVAS_ALLOWED_HOSTS="school.instructure.com,*.trusted-canvas.example" pnpm dev
```

This prototype is designed to run on your own machine. Deploying it remotely changes the threat model because the remote server can receive Canvas credentials and private course data.

## Commands

```bash
pnpm dev              # local development server on port 3000
pnpm exec tsc --noEmit
pnpm check            # Biome checks
pnpm build            # production build
```

## Architecture

```text
Browser UI
   │ same-origin tRPC + opaque session cookie
   ▼
TanStack Start server
   │ HTTPS + Bearer token
   ▼
Institution Canvas REST API
```

The detailed API findings, official source links, security considerations, and recommended OAuth path are in [docs/canvas-api-research.md](docs/canvas-api-research.md).

## Next milestones

1. Add planner items and missing-submission views.
2. Add course detail pages for assignments and modules.
3. Add tests for pagination, redirects, cookie sessions, and Canvas error mapping.
4. Package the app locally with OS keychain storage, or implement Canvas OAuth before supporting multiple users.
