# FFXIV Mitigation Planner

A full-stack drag-and-drop timeline for planning party cooldown usage in Savage and Ultimate fights.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite + Tailwind + dnd-kit |
| Backend | FastAPI + SQLAlchemy (async) + Pydantic v2 |
| Database | PostgreSQL 16 |
| Infra | Docker Compose + Nginx reverse proxy |
| Tests | Pytest + pytest-asyncio + HTTPX (async test client) |

## Quick start

```bash
git clone <repo>
cd ffxiv-mit

# Start everything
docker compose up --build

# In a second terminal, seed the database with real job/ability data
docker compose exec backend python -m app.seed
```

Open http://localhost — the nginx proxy routes `/api/*` to the backend and everything else to the React dev server.

| URL | What |
|-----|------|
| http://localhost | Frontend (Vite dev server via nginx) |
| http://localhost/api/docs | FastAPI Swagger UI |
| http://localhost:8000/api/docs | Backend directly |

## Development (without Docker)

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Point to a local postgres
export DATABASE_URL=postgresql+asyncpg://ffxiv:ffxiv@localhost:5432/mitplanner

uvicorn app.main:app --reload
python -m app.seed
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

The Vite proxy in `vite.config.ts` forwards `/api` to `http://backend:8000` — change to `http://localhost:8000` for local dev outside Docker.

## Running tests

```bash
cd backend
pip install aiosqlite  # SQLite async driver for test isolation
pytest -v
```

Tests use an in-memory SQLite database — no Postgres required.

## Project structure

```
ffxiv-mit/
├── docker-compose.yml
├── nginx/nginx.conf
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + lifespan
│   │   ├── seed.py              # Seed FFXIV jobs & abilities
│   │   ├── core/config.py       # Pydantic settings
│   │   ├── db/session.py        # Async engine + Base
│   │   ├── models/models.py     # SQLAlchemy ORM models
│   │   ├── schemas/schemas.py   # Pydantic I/O schemas
│   │   └── api/routes/
│   │       ├── jobs.py          # CRUD jobs + abilities
│   │       └── plans.py         # CRUD plans + placements
│   └── tests/
│       ├── conftest.py
│       ├── test_jobs.py
│       └── test_plans.py
└── frontend/
    └── src/
        ├── App.tsx
        ├── lib/
        │   ├── api.ts           # Typed fetch client
        │   └── utils.ts         # Colors, formatTime
        ├── types/index.ts       # Shared TS types
        ├── hooks/
        │   └── useCooldownState.ts   # Cooldown window logic
        ├── pages/
        │   ├── HomePage.tsx     # Plan list + party builder
        │   ├── PlannerPage.tsx  # Main drag-drop timeline
        │   └── AdminPage.tsx    # Job/ability management
        └── components/planner/
            ├── AbilityCard.tsx  # Draggable ability chip
            └── TimelineRow.tsx  # Drop zone + placed bars
```

## Key data model

```
Job (WHM, PLD, …)
 └── Ability (Temperance, 20s dur, 120s CD, mitigation)

Plan (FRU Week 1, 720s fight)
 ├── PartySlot × 8 (slot_index → job_id)
 └── PlacedAbility (ability_id, time_offset_seconds)
```

## How the cooldown system works

When an ability is placed at `time_offset T`, it becomes unavailable from `T` to `T + cooldown`.
`useCooldownState` computes these windows from all placements. `AbilityCard` checks `getCooldownRemaining` — if > 0, the card is visually locked and not draggable. On drop, the same check runs server-side-equivalent in the frontend before calling the API.

## What's next

- [ ] Encounter timeline markers (boss mechanics at specific seconds)
- [ ] Overlap / conflict highlighting between party-wide mits
- [ ] Export to image / shareable link
- [ ] Multiple plans per encounter with diff comparison
- [ ] Alembic migrations (currently using `create_all` on startup)
