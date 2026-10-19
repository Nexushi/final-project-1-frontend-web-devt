# Pickle Ball Pixel Game

Group 1 · Section C3B · React + Vite + HTML5 Canvas

Stage 4C-1 connects the single-player game to the real Express API. Stage 4C-2 adds a small Admin Dashboard using those existing sessions. The backend was inspected read-only; its private environment and credentials were not opened. No backend files were changed. No multiplayer, new dependencies, commit, push, or deployment is included.

## Run in VS Code

Open this frontend folder and use Terminal > New Terminal:

```sh
npm install
npm run dev
```

Open **http://localhost:5173**. The current backend CORS configuration allows that exact frontend origin; `127.0.0.1:5173`, another port, and Vite preview's port are different origins. If port 5173 is occupied, use the existing frontend server or stop it yourself before starting another.

The backend must already be running from its current source with MongoDB connected. Start/restart it yourself using its existing README instructions. This frontend does not launch, seed, edit, or reconfigure the backend. If the documented Atlas DNS issue prevents startup, follow the backend team's existing process; no DNS workaround is added here.

### API configuration

The default is `http://localhost:5000`. To override it, copy `.env.example` to `.env.local` **inside this frontend folder** and set:

```dotenv
VITE_API_BASE_URL=http://localhost:5000
```

Use the backend origin without `/api`, credentials, query strings, or a path. Restart Vite after changing environment variables. All `VITE_` values are public build configuration: never put passwords, tokens, MongoDB URIs, or JWT signing secrets there. `.env.local` and other environment files are ignored; the non-secret `.env.example` is included.

For later deployment, set the public backend HTTPS origin in Vercel's build environment and rebuild. Render's backend must separately allow the deployed frontend origin through CORS. The current backend's localhost-only CORS setting is a deployment prerequisite to resolve in a later backend task; it was not changed here.

```sh
npm run build
npm run lint
npm test
npm run preview
```

The tests use Node's built-in runner and mocked API responses. They do not create real accounts or modify MongoDB.

## Screens and connected features

The original main menu remains. **Start Game** while logged out opens clearly labeled offline practice, which never claims to save scores. **Login** and **Register** submit to the real backend. Registration creates a real PLAYER account only when the user submits the form; no account is created automatically.

After authentication, the dashboard shows the username, Play Game, Saved Matches, Match History, Profile settings, Logout, and Main menu. Profile settings load the authenticated profile and active difficulties. The user can change their username and preferred difficulty, or clear the preference. Role changes are not offered or sent. An existing inactive preference can be retained or replaced with an active one. A preferred level is marked on the difficulty screen; the player still explicitly chooses a level for each match.

Logged-in difficulty selection retrieves active settings from the API. No fabricated difficulty list is substituted if the backend fails or returns no active settings. Easy, Medium, and Hard retain the game's reaction-delay, aim-error, and miss-chance presets; **AI speed and ball speed come directly from backend values in logical pixels per second**. Custom level names use the Medium reaction/error preset and their returned speeds. The existing minimum shot-flight duration of 0.55 seconds keeps very fast settings playable.

## Authentication and errors

The JWT is held in memory and `sessionStorage` for the current browser tab session. A page reload checks `/api/users/profile` before opening the dashboard. Passwords are never written to frontend storage, logs, or URLs, and the password input clears after a submission attempt. Logout removes the token and clears player/match state.

Session storage is accessible to JavaScript, so it is not equivalent to an HttpOnly cookie; it avoids persistent localStorage sessions but still depends on preventing XSS. React renders API text normally without injecting HTML. Use HTTPS outside local development. No analytics, third-party artwork, external font scripts, or token logging are added.

The API client attaches Bearer tokens only to protected paths at the configured backend origin, blocks redirects, omits cookies, and uses a 12-second request timeout. Public difficulty/auth requests do not include a JWT. A protected 401 clears the session and returns to Login. Invalid login credentials stay on the login form with the backend's error. Expiration is handled when an authenticated API request is made. A response from an older token cannot log out a newly authenticated session.

Validation, duplicate usernames, unavailable servers, and backend messages are shown explicitly. An API outage never becomes a fake successful save. No API write is automatically retried in a loop.

## Match saving, recovery, and resume

1. Selecting a difficulty while logged in sends `POST /api/matches` with its real `difficultyId`. The game opens only after the backend confirms a record and supplies its ID, version, and difficulty snapshot. Double clicks are blocked while creation is pending.
2. Each completed point sends one cumulative score/status checkpoint using `PATCH /api/matches/:id` and the last confirmed `version`. The next rally waits until the checkpoint is confirmed. In-flight duplicate checkpoints share one promise; unchanged progress produces no additional PATCH. The request sends only `playerScore`, `aiScore`, `status`, and `version`.
3. The fifth point is saved atomically with `status: 'COMPLETED'`. The result screen distinguishes local match completion from confirmed backend saving. The backend makes completed records immutable.
4. On a failed save, play waits and the UI says progress is not confirmed. **Retry save** is explicit. If the response may have been lost after a commit, retry first GETs the record. Matching scores/status confirm the earlier save without repeating it. If the version is unchanged, the request can be sent with that version. A changed version is never silently overwritten or rebased.
5. A 409 conflict locks further saves. **Discard local point & load server match** fetches the latest server record. It restores only confirmed scores and the stored difficulty snapshot and begins a fresh rally. A completed record opens History instead. A failure to reload remains visible.
6. Saved Matches lists unfinished records; Match History lists completed records. Resume fetches the selected record again rather than trusting an old list entry. The stored snapshot supplies the exact saved AI and ball speeds, even if an Admin renamed/deactivated the current setting. The player serves first on resume because server/ball positions are not persisted by this API.
7. Delete requires an explicit in-interface confirmation before a real DELETE request. The list changes only after backend confirmation. Deletion is permanent according to the current API.

Restart/Play Again on a logged-in match returns to difficulty selection and creates a **new** match. Existing scores never decrease; the previous unfinished record stays in Saved Matches until deleted. Returning to Dashboard during a rally retains the last saved score and discards that rally's ball position. Navigation is disabled during a pending save; leaving after a failed save asks before discarding unconfirmed local points. A tab-close warning is registered while a checkpoint is pending/failed, but browser shutdown cannot guarantee delivery. No unload/beacon save is claimed.

An ambiguous create timeout cannot safely be retried automatically because POST has no backend idempotency key. The UI directs the player to Saved Matches before another creation attempt. If a timed-out creation appears there, resume that record. The frontend cannot guarantee exactly-once POST processing across a lost response or browser restart without backend idempotency support.

## Gameplay and simplified rules

- WASD or arrows move the blue character on the bottom half. Diagonal speed is normalized and both characters remain within their own halves.
- Space serves or swings. Release between swings; holding Space does not auto-hit. Follow the ground shadow, wait for the bounce, move within 58 logical pixels, then swing.
- Left/right while swinging aims 180 pixels to that side of the character; aim toward open court to avoid hitting out. With no direction, the shot targets a random safe location.
- P/Escape or buttons pause/resume. Losing browser focus or hiding the tab pauses automatically. Click the court to return keyboard focus.
- Rally scoring, first to five, no win-by-two. The point winner serves next; the human serves first in a new/resumed game. The AI serves automatically.

The 640 × 560 logical Canvas scales with CSS. The ball's ground position travels toward a landing target, and a sine arc draws it above its shadow so it crosses the net. After one bounce it moves toward the baseline at 65 pixels/second. A return must occur within 0.9 seconds, before the second bounce/baseline fault. An out landing awards the receiver a point; a missed return awards the last hitter a point. Scoring immediately changes the rally phase, blocking duplicate points. A 1.5-second point message precedes the next serve, after saving finishes for online matches.

Kitchen/service lines are drawn, but kitchen restrictions, diagonal serves, service rotation, net-height faults, spin, and official two-bounce serving rules are simplified. This is an arcade classroom prototype, not official-rule certification. Graphics remain original rectangles and simple shapes, with walking/swing animations; no downloaded artwork or gameplay framework is used.

## Files and organization

Created for Stage 4C-1:

- `.env.example`: public backend-origin configuration.
- `src/api/client.js`: fetch client, real endpoint methods, errors, timeout, and protected requests.
- `src/api/session.js`: session token storage and in-memory connection.
- `src/api/matchSaver.js`: versioned checkpoint persistence, deduplication, and uncertain-save recovery.
- `src/game/backendDifficulty.js`: backend and snapshot mapping to game settings.
- `src/components/AuthForm.jsx`, `DifficultyPanel.jsx`, `MatchesPanel.jsx`, `ProfilePanel.jsx`: account, difficulty, match-list, and profile screens.
- `tests/api.test.js`: API and save/resume regression coverage.

Updated: `src/App.jsx` (dashboard/session/navigation), `src/components/GameCanvas.jsx` (checkpoint lifecycle and save feedback), `src/game/engine.js` (snapshot settings, restored scores, save barrier), `src/App.css` (matching forms/panels), `.gitignore` (environment and temporary files), `package.json` (all test files), and `README.md`.

Scoring and rendering remain in their original modules. The engine stays independent of React, uses delta time capped at 33 milliseconds, and is driven by requestAnimationFrame. React receives changed summaries, not per-frame positions. Event listeners, animation frames, and component subscribers clean up on unmount, including Strict Mode remounts. API creation is initiated by user events, never mount effects.

## Stage 4C-1 verification — October 19, 2026

- Build and lint passed.
- 18 automated tests passed: the 7 existing gameplay tests plus 11 API/save/resume tests. Existing coverage includes 100 seeded simulated matches across all three difficulties and duplicate-point prevention.
- New coverage checks endpoint methods/payloads/envelopes, token destinations/redirect policy, 401 handling, network/timeout/invalid-response errors, duplicate and serialized saves, stale-version locks, uncertain-response reconciliation, completion, restored scores/snapshot speeds, and frozen gameplay while saving.
- Read-only live health request: `GET http://localhost:5000/api/health` returned 200.
- Read-only live difficulty request: `GET http://localhost:5000/api/difficulty` returned **404 Route not found**, although the inspected current backend source defines that endpoint. The running process appears to be older/different code. Restart it from the current backend source before integrated testing. A health response alone does not verify MongoDB or the CRUD routes. No real accounts, profiles, matches, or difficulties were created, modified, or deleted by these checks.
- The existing frontend dev server responded. Browser testing opened the main menu and inspected Login/Register, difficulty selection, original Canvas rendering, keyboard movement, serving, pause/resume, retained score while paused, a point for each side, and restart resetting the score to 0–0. No successful authenticated browser CRUD/persistence test is claimed while the running backend lacks the inspected route.

### Manual integrated acceptance checks

1. Start the current backend with its existing configuration/DNS instructions; confirm `/api/difficulty` returns active settings, not 404. Run this frontend at `http://localhost:5173`.
2. Register your intended demo account or log in to your own existing one. Check duplicate/invalid input feedback, logout, session reload, and 401/expired-token return to Login. Do not share tokens or passwords in screenshots/logs.
3. Check dashboard username. Update your username/preferred difficulty in Profile settings; reload to verify persistence. Confirm no role editor exists.
4. Select each returned difficulty. Verify the game starts only after a match is created, then play several points. Confirm saved messages, match ID/version progression, and one PATCH per point in DevTools Network.
5. Return to Dashboard, open Saved Matches, reload the page, and resume. Verify scores/snapshot difficulty are restored and a fresh player serve starts. Complete to five; confirm the final save and History record.
6. Stop the backend during a point save. Confirm play waits and no success message appears. Restore connectivity and use Retry save. Check that an uncertain response is read/reconciled before another PATCH.
7. Resume the same saved match in two tabs, score/save in one, then save in the other. Confirm a 409 stops the stale game and loading the server record restores confirmed progress without overwriting it.
8. Test restart/new-match behavior, and cancel/confirm deletion only on a record you intentionally want removed. Check AI returns, Space contact, movement, out faults, game-over, and pause behavior on the presentation laptop.

Remaining limits: live authenticated acceptance/persistence, peer feedback, and subjective difficulty balance need the team's manual verification. Backend-owned CORS/DNS/startup and deployment remain outside this frontend task. The Admin UI is described in the Stage 4C-2 section below. List endpoints are unpaginated in the inspected backend.

## Stage 4C-2: small Admin Dashboard

The team reports successful real registration/login, match saving/resuming, and completed history testing for Stage 4C-1. The older 404/startup observation above is a historical Stage 4C-1 test result, not a new blocker reported in Stage 4C-2.

Only a user whose authenticated backend response contains `role: 'ADMIN'` sees **Admin Dashboard** on the player dashboard. Opening Admin rechecks `/api/users/profile` against the backend before loading administrative lists. The app does not infer permissions from a JWT role claim, a username, or browser-stored role data. Backend authorization is the real security boundary; hiding the button is only navigation control.

One screen contains three sections:

- **Users:** Registered PLAYER accounts, IDs and join dates. Delete requires an explicit confirmation explaining that the account and all its matches are permanently removed. Admin/self deletion is not offered; the backend independently rejects it.
- **Matches:** Read-only review of all saved/completed match records, player username (or user ID when no player name is available), difficulty snapshot, score, status and update time. There are no Admin match editing/deletion controls.
- **Difficulties:** All active/inactive settings, a basic create/edit form, and activation/deactivation buttons. Names and numeric speeds follow backend validation (1–32-character names, speeds 1–2000 px/s). Mutations update the display only after confirmation from the backend. Existing matches retain their snapshots.

Known match or player-preference references disable a difficulty's Delete button with guidance to deactivate it instead. The backend checks all references transactionally, including ones not visible in these lists. If another session creates a reference after loading, the server's 409 is shown; the frontend does not bypass it. Difficulty and user deletion both require a separate Confirm delete click; Cancel makes no request.

A 401 uses the existing expired-session return to Login. A 403 clears Admin data, returns to the player dashboard, and hides Admin navigation until the next sign-in rechecks the role. Other errors remain visible without a false success message. Buttons are disabled during a mutation to prevent duplicate submissions. Network failures are not automatically retried; refresh before retrying an unconfirmed operation. No passwords, hashes, full user objects, tokens, or secrets are displayed or logged.

### Confirmed Admin API contracts

| Method | Endpoint | Response / request |
| --- | --- | --- |
| GET | `/api/admin/users` | `{ users }`, PLAYER accounts only |
| DELETE | `/api/admin/users/:id` | 204; player and owned matches removed together |
| GET | `/api/admin/matches` | `{ matches }`, system match records |
| GET | `/api/admin/difficulty` | `{ difficulties }`, active and inactive |
| POST | `/api/admin/difficulty` | `levelName`, `aiSpeed`, `ballSpeed`, `isActive`; returns `{ difficulty }` |
| PUT | `/api/admin/difficulty/:id` | Changed allowed fields; returns `{ difficulty }` |
| DELETE | `/api/admin/difficulty/:id` | 204 if unused; 409 if referenced |

These contracts were confirmed from backend routes, controllers, authentication middleware, safe response utilities, and User/Match/DifficultySetting models in read-only mode. All requests reuse the configured API origin, current JWT, timeout, and redirect policy.

### Stage 4C-2 files

Created `src/components/AdminDashboard.jsx` (tables/forms/confirmation), `src/components/AdminNavigation.js` (small role-gated button), `src/api/admin.js` (role recheck, list loading, form/reference helpers), and `tests/admin.test.js`.

Updated `src/App.jsx` (Admin navigation/screen and denied-access handling), `src/api/client.js` (Admin endpoint methods only), `src/App.css` (simple tables/forms using the existing palette), and this README. Gameplay, authentication/session code, and the match-saving engine were not changed for Stage 4C-2. Existing uncommitted Stage 4C-1 changes remain in this workspace; they are not new Stage 4C-2 changes.

### Stage 4C-2 verification — October 19, 2026

- `npm run build`, `npm run lint`, and all **28 tests** passed: 18 existing gameplay/API/save tests plus 10 focused Admin tests.
- Admin tests cover actual rendered navigation for ADMIN versus PLAYER/signed-out users, refusal to initiate loading for non-Admins, current-profile role rechecks and demotion, list failures, exact methods/bodies/response envelopes, protected JWT requests, 401/403 behavior, referenced-setting 409s, offline writes, form validation, and known reference checks.
- All destructive API operations in these tests use in-memory fetch mocks; no real database is involved.
- An isolated, ignored temporary browser page imported the real Admin screen with in-memory API methods and was removed after testing. Browser checks verified the three sections, disabled deletion for a used difficulty, confirmation/cancel with zero writes, confirmed mock deletion, difficulty creation/editing, activation/deactivation, and confirmed mock player deletion removing their match rows. This is mock UI verification, not a claim that real Admin MongoDB writes were exercised.
- No real Admin database mutation, account promotion, or live destructive operation was performed. Live Admin access and database transactions still need the team's approved-account check. List endpoints remain unpaginated, and the backend does not supply edit versions for difficulty settings; refresh before edits when multiple Admins are working.

### Manual check using an approved Admin account

1. Run the current backend and frontend as described above; open `http://localhost:5173`. Use your own already approved Admin credentials. This task does not create or promote an Admin account.
2. First log in as a regular player and confirm Admin Dashboard is absent. Existing gameplay and saved-match screens should remain available.
3. Log out and log in with the approved Admin account. Open Admin Dashboard; check the Users, Matches and Difficulties lists and Refresh lists.
4. For a read-only presentation, inspect the tables, open/cancel Edit, and open/cancel a deletion confirmation. Do not click Confirm delete on real records during testing.
5. Only if the team separately approves intentional database changes, create a clearly named unused demo difficulty, edit its speeds, deactivate/reactivate it, and delete it using the confirmation. Verify used settings are protected and recommend deactivation. Delete a player only when that particular account and every owned match are explicitly approved for permanent removal.
6. An expired/invalid session should return to Login. A regular/revoked account making an Admin request should receive 403 and lose Admin navigation. Use the mocked tests to exercise these error/destructive cases without changing live records.

No account promotion, Admin role editor, charts, analytics, multiplayer, backend changes, or deployment is included.
