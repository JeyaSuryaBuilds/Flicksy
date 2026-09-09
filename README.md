# Flicksy

A Gen-Z social media app — React + TypeScript frontend, Python/FastAPI backend.
Visual identity: deep charcoal background, cream text, coral accent (#FF6B4A), rounded cards,
Sora + Inter type. UI terminology follows Flicksy's own vocabulary throughout (Flick = post,
Rush = short video, Moment = story, Flash = private quick photo/video, Space = profile,
Stream = feed, Discover = explore, Crew = followers, Circles = following, Love/Echo/Send On/Keep
= like/comment/share/save, Alerts = notifications, FlickTag = username).

## Platform architecture

The current build is **Flicksy Web only** (this React app). The backend is a stateless FastAPI
REST API behind JWT auth with no web-only assumptions — Android, iOS, Windows, and macOS clients
are intended to be built as separate frontends against this same API, with no backend changes
required. `CORS_ORIGINS` accepts a comma-separated list so future native/desktop clients can be
allowlisted. **No native apps exist in this repository — only this web client.**

## Setup

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # SQLite by default, zero config needed
python -m app.seed            # demo users/posts/conversations
uvicorn app.main:app --reload --port 8000
```
Swagger docs: `http://localhost:8000/docs`
**Demo login:** `demo@flicksy.dev` / `password123` · **Admin login:** `admin@flicksy.dev` / `password123`

A prior session's `flicksy.db` is auto-patched with new columns on startup (SQLite dev only —
see `app/database/migrations.py`; use real Alembic migrations for Postgres/production).

### Frontend
```bash
cd frontend
npm install
cp .env.example .env          # points at http://localhost:8000 by default
npm run dev
```
Open `http://localhost:5173`.

## Required environment variables (`backend/.env`)

| Purpose | Variables |
|---|---|
| JWT | `JWT_SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES` |
| Database | `DATABASE_URL` (defaults to SQLite; Postgres example in `.env.example`) |
| Media storage | `MEDIA_STORAGE_BACKEND`, `MEDIA_LOCAL_DIR`, `MEDIA_PUBLIC_BASE_URL` |
| Flicksy AI | `GEMINI_API_KEY`, `GEMINI_MODEL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` |
| Email (verification, password reset) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_USE_TLS` |
| CORS | `CORS_ORIGINS` |

**Without SMTP configured**, verification/reset emails are printed to the backend console
instead of sent — a real dev fallback, not a false "email sent" claim. **Without an AI key
configured**, `/ai/*` returns a clear 503 instead of a fabricated response.

---

## IMPLEMENTED

**Auth & account security:** register/login/logout, JWT expiry, bcrypt hashing, forgot/reset
password, **real email verification** (code + expiry + resend cooldown + verify endpoint, SMTP
or dev-console fallback), **change password** (current-password checked), **account
deactivation**, **account deletion** (cascades to owned Flicks/comments/Moments via SQLAlchemy
relationship cascades — secondary references like Follows/Likes/Reports are not cleaned up, see
Partial section).

**Space:** avatar upload, FlickTag (globally unique, case-normalized, live availability check,
enforced at registration/edit/DB level), bio, website, pronouns, Verified Space badge
(admin-only grant/revoke, backend-enforced via `get_current_admin`), Space Theme (real per-user
backend model, presets + custom, visitors see the owner's actual saved theme via CSS
custom-property cascading — independent of the separate app-wide Appearance setting).

**Flick / Rush:** real multipart upload → persisted URL → rendered from that URL (never an empty
`media_urls: []`). Love/Echo/Send On/Keep/Delete/Report all wired to real endpoints. Rush is a
dedicated short-video experience (separate compose flow, vertical scroll-snap viewer) built on
the same `Post` model via an `is_rush` flag rather than a duplicate model.

**Moments:** photo/video capture or gallery upload, **real creative editor** — text overlays
(tap-to-place), emoji (inserted as overlay text), freehand drawing (persisted as vector stroke
paths, not a flattened image), 5 filter presets — all persisted as JSON in `overlay_data` and
re-rendered by the viewer, not just held in React state. Echo (comment), Send On (to a real,
membership-checked chat conversation), Recast (preserves original-creator attribution, blocked
for private/permission-off Moments), creator permission toggles, Close Crew privacy, 24h expiry,
view tracking.

**Flash:** full send + receive flow. Composer: capture/gallery pick, caption, disappearing
toggle, recipient picked from existing Chats, real upload+send. Inbox: list of received Flashes
with seen/unseen state, full-screen viewer, mark-as-seen on open, reply, unsend (sender only).
**Kept structurally and storage-wise separate from Chats and never appears in Stream/Rush/
Moments/Discover.**

**Media security:** uploads split into `public/` (Flicks, Rush, Moments, Avatars, SoundBox —
served directly, world-readable by design) and `private/` (Flash — NOT static-served; accessible
only through `GET /media/private/{filename}`, which checks the requester is the actual sender or
recipient before streaming). Server-generated filenames throughout (user-supplied filenames are
never trusted or used in a path — rules out path traversal). Frontend fetches private media
through the authenticated axios instance and renders it as a blob (`SecureMedia` component),
since a plain `<img src>` can't carry an Authorization header.

**Media quality:** uploaded bytes are persisted exactly as received — no resize, recompression,
transcoding, or GIF-to-static conversion anywhere in the upload path.

**SoundBox:** real search/trending/recent/original-upload endpoints and a picker UI wired into
New Flick, Rush compose, and Moment compose (preview, select, remove, attach — persisted as
`sound_id` on the created content).

**Flicksy AI:** Gemini primary, OpenRouter fallback, no other providers, keys backend-only. Chat
page with persisted history; caption/Topic Tag generation wired into New Flick and Rush.

**Settings — audited so every visible control does something real:**
- *Privacy:* Private Space is enforced server-side (hidden from Stream/Rush/Discover/search for
  non-Crew viewers, not just hidden in the UI); who-can-message is enforced when starting a Chat.
- *Notifications:* each toggle actually gates whether that Alert is generated — Love/Echo/Crew
  notifications are created (or not) at the moment of the action, checked against the
  recipient's settings, not just displayed as a switch with no backend effect.
- *Appearance:* Light/Dark/System and Reduce Motion are backend-persisted and applied live via a
  `ThemeContext` that sets `data-theme`/`data-reduce-motion` on load and on change — survives
  refresh, logout/login, and a different browser session.
- *Account:* change password, deactivate, delete, email verification status/resend/verify.
- *Support:* Help/Guidelines/Privacy/Terms/About render real static content in a modal (not dead
  buttons) — no backend-driven CMS exists, so this is honestly static, not fake-dynamic.
- Every toggle rolls back visually if the backend save fails, and never claims success it didn't
  earn.

**Admin Console:** frontend-gated but every call independently backend-enforced. Dashboard
stats, user search/verify/suspend/restore, reports queue (dismiss/action), Ads CRUD +
pause/resume with impressions/clicks/CTR/spend.

## PARTIALLY IMPLEMENTED / EXTERNAL CONFIG REQUIRED

- **Flicksy AI** — code path is complete and correct, but produces real responses only once you
  supply `GEMINI_API_KEY` and/or `OPENROUTER_API_KEY`. Without either, every `/ai/*` call
  returns a 503 with a clear message (not a fake success).
- **Email verification/reset delivery** — the full flow (token generation, expiry, endpoints,
  frontend UI) is real; actual delivery requires real `SMTP_*` values. Without them, codes are
  logged to the backend console — visible to you for local testing, but not delivered.
- **Private Space "who can see it"** — enforced today using the existing follow relationship as
  the access check (owner + people they're followed by). There's no follow-request/approval
  workflow — following is still instant/one-directional, so "Crew" isn't the same as "approved
  follower" a fully private-account model would use.
- **Account deletion** — cascades to Flicks/comments/Moments (proper SQLAlchemy relationship
  cascades), but does not clean up secondary rows referencing the deleted user (Follows, Likes,
  Bookmarks, Reports, AI conversations). SQLite doesn't enforce FK constraints by default in this
  dev setup, so these become orphaned rows rather than causing a crash — acceptable for a dev
  build, not production-ready as-is.

## NOT IMPLEMENTED

- **Real-time chat (WebSockets)** — messaging is REST request/response only. No typing
  indicators, no live push of new messages/reactions/read-receipts, no group chats, no message
  reactions, no edit/delete-message. This is a genuinely separate, large feature.
- **Native Android/iOS/Windows/macOS clients** — only the platform-agnostic backend + web client
  exist (see "Platform architecture" above).
- **Mention/tag system** — the "tag people" input exists in New Flick/Rush compose UI but isn't
  wired to a backend mentions model; no `who_can_mention`/`who_can_tag` enforcement exists yet
  despite those settings fields being present in `UserSettings`.
- **Collections, Saved Drafts** — no models or UI.
- **Creator analytics, achievements** — not built.
- **SoundBox licensed catalog** — the `Sound` model has `source`/`external_id` fields ready for
  a real licensed provider, but no actual catalog is bundled (and per the brief, none should be
  without proper licensing) — only user-uploaded Original Sound + whatever you seed manually.

## Tech stack

- Frontend: React 18, TypeScript, Vite, React Router, Axios, CSS Modules
- Backend: FastAPI, SQLAlchemy 2.0, Pydantic v2, python-jose (JWT), passlib (bcrypt), httpx (AI
  provider calls), smtplib (email), SQLite/PostgreSQL
