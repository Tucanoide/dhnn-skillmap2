# Claude working guide for DHNN SkillMap

## Project summary
This repository is a lightweight internal skills platform for DHNN. The product goal is to let employees self-assess skills, leaders validate them, and People/admins manage the roster and skill taxonomy.

The implementation is intentionally simple and pragmatic:
- Frontend: plain HTML, CSS, and JavaScript under `app/`
- Backend: FastAPI service under `backend/`
- Database: PostgreSQL, configured through `.env` and accessed through `backend/db.py`
- Auth: Google OAuth + JWT in `backend/auth.py`, with a fallback password flow for seeded users

## Core source files
- `REQUIREMENTS.md` — source of truth for product requirements and business rules
- `backend/main.py` — FastAPI app and route definitions
- `backend/auth.py` — JWT and Google auth logic
- `backend/db.py` — connection bootstrap using environment variables
- `app/api.js` — shared frontend API layer and session handling
- `app/*.html` — static UI pages
- `scripts/bump_cache_version.py` — cache-busting script for shared assets

## Architectural constraints
- Keep the frontend static and framework-free unless the product explicitly changes.
- Do not expose secrets or database credentials in code or commits.
- Respect the permission model from `REQUIREMENTS.md`: employee sees self, leader sees team, admin sees all.
- Keep the API contract compatible with the existing frontend calls in `app/api.js`.
- Prefer minimal, surgical changes over broad refactors.

## Local development
Use a virtual environment and install backend dependencies:

```bash
cd /Users/mefernandez/Desktop/webs/dhnn-skillmap2
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

Run the API:

```bash
cd /Users/mefernandez/Desktop/webs/dhnn-skillmap2
source .venv/bin/activate
cd backend
uvicorn main:app --host 0.0.0.0 --port 8420 --reload
```

Serve the static frontend (for browser testing):

```bash
cd /Users/mefernandez/Desktop/webs/dhnn-skillmap2
python3 -m http.server 8000 --directory app
```

Then open the UI via the local static server and point the frontend to the running API on port `8420`.

## Project conventions
- Prefer matching existing naming and route conventions used in `backend/main.py` and `app/api.js`.
- When touching API behavior, keep both the response shapes and edge cases consistent with currently-used frontend logic.
- When making frontend changes, keep styling aligned with the existing internal mockup aesthetic in `app/shared.css`.
- Use the repository spec before adding new features or changing business logic.

## Safety and compliance
- Never commit `.env` values or any secrets.
- Do not add new packages without checking whether the project is intentionally lightweight.
- Avoid changing login/security behavior without confirming the expected auth flow in `backend/auth.py` and the requirements document.
- If a change affects roles, access control, or sensitive org data, verify it against the permission model described in `REQUIREMENTS.md`.

## Suggested workflow for Claude
1. Read the relevant requirement section in `REQUIREMENTS.md` before implementing.
2. Inspect the exact backend route or frontend call that is affected.
3. Make the smallest aligned change needed.
4. Validate with the smallest relevant command or smoke check.
5. Keep the update consistent with the current app structure and user-role rules.

## Notes to remember
- This is not a modern SPA framework project; the app is intentionally plain HTML/CSS/JS.
- The API is likely expected to run on `http://127.0.0.1:8420` while the frontend is served from the `app/` folder.
- The database connection depends on environment variables loaded from the repository-root `.env` file.
- Google auth is restricted to `@dhnn.com`, which is an important product rule and should not be weakened casually.
