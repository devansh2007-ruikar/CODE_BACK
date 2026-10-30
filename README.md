# 🕷️ Spider-Sense Alert System Backend

A robust, high-performance incident alert and coordination platform connecting citizens in distress with superheroes on patrol. Built with **FastAPI**, **PostgreSQL**, **SQLAlchemy (Async)**, and **asyncpg**.

---

## 📋 Features

- **Role-Based Access Control (RBAC):** Strict JWT authentication via `PyJWT` with explicit `CITIZEN` and `HERO` role verification (returns `403 Forbidden` on role mismatch).
- **React + TailwindCSS Frontend:**
  - **Login / Register Screen:** Decodes JWT token, stores credentials in `localStorage`, and handles automatic session expiry.
  - **Citizen Dashboard:** Emergency report submission form and interactive table of their past reports with real-time status badges.
  - **Hero Tactical Dispatch:** Live threat feed with instant atomic "Claim" action (with visual `409 Conflict` race condition alerts).
  - **Hero Detail Modal:** Visual state progression (`REPORTED` ➔ `CLAIMED` ➔ `IN_PROGRESS` ➔ `RESOLVED`) and full audit trail inspection from `StatusHistory`.
- **Atomic Concurrency Control (Race-Condition Free):** Prevents simultaneous claims by competing heroes using an atomic conditional SQL update:
  ```sql
  UPDATE incidents 
  SET status='CLAIMED', hero_id=:hero_id 
  WHERE id=:id AND status='REPORTED' AND hero_id IS NULL;
  ```
  Returns `409 Conflict` if 0 rows are affected.
- **Strict State Machine:** Strictly enforces sequential transitions (`REPORTED` ➔ `CLAIMED` ➔ `IN_PROGRESS` ➔ `RESOLVED`). Any invalid jump or reverse step is rejected with `400 Bad Request`.
- **Automatic Audit Trail:** Every status change is automatically recorded in the `status_history` table within the same transaction.

---

## 📊 Database Schema (Entity-Relationship Diagram)

```mermaid
erDiagram
    users {
        int id PK "Auto-incrementing primary key"
        string username UK "Unique username"
        string password_hash "Bcrypt password hash"
        enum role "CITIZEN or HERO"
    }

    incidents {
        int id PK "Auto-incrementing primary key"
        string title "Incident title"
        text description "Detailed incident description"
        string category "Emergency category"
        int severity "Severity level (1 to 5)"
        string location "Incident address / coordinates"
        enum status "REPORTED, CLAIMED, IN_PROGRESS, RESOLVED"
        int citizen_id FK "References users(id)"
        int hero_id FK "References users(id), Nullable"
        datetime created_at "Creation timestamp"
        datetime updated_at "Last update timestamp"
    }

    status_history {
        int id PK "Auto-incrementing primary key"
        int incident_id FK "References incidents(id)"
        string old_status "Previous status"
        string new_status "Transitioned status"
        int changed_by FK "References users(id)"
        datetime changed_at "Timestamp of status change"
    }

    users ||--o{ incidents : "reports (as citizen_id)"
    users ||--o{ incidents : "claims (as hero_id)"
    users ||--o{ status_history : "logs state change (as changed_by)"
    incidents ||--|{ status_history : "tracks transitions"
```

---

## 🔄 State Machine & Transition Flow

```mermaid
stateDiagram-v2
    [*] --> REPORTED : Citizen creates incident (POST /incidents)
    REPORTED --> CLAIMED : Hero claims incident (PATCH /incidents/{id}/claim)
    CLAIMED --> IN_PROGRESS : Hero starts response (PATCH /incidents/{id}/status)
    IN_PROGRESS --> RESOLVED : Hero completes mission (PATCH /incidents/{id}/status)
    RESOLVED --> [*]

    note right of REPORTED
      Attempting to skip straight to IN_PROGRESS or RESOLVED
      triggers a 400 Bad Request.
    end note

    note right of CLAIMED
      Attempting to jump directly to RESOLVED or backtrack to REPORTED
      triggers a 400 Bad Request.
    end note
```

---

## 🚀 Setup & Execution Instructions

### Prerequisites
- Python 3.10+ (or Docker & Docker Compose)
- PostgreSQL (if running locally without SQLite / Docker)

---

### Option 1: Running with Docker Compose (Recommended for Full Stack)

1. Clone or navigate to the repository directory:
   ```bash
   cd TCB_BACK
   ```

2. Start the PostgreSQL database and FastAPI application:
   ```bash
   docker-compose up --build
   ```

3. The API and Interactive Swagger Documentation will be accessible at:
   - **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
   - **ReDoc UI:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### Option 2: Running Locally with Python Virtual Environment

1. Create and activate a virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment variables in `.env`:
   ```ini
   DATABASE_URL=postgresql+asyncpg://postgres:postgrespassword@localhost:5432/spidersense
   SECRET_KEY=spider-sense-super-secret-jwt-signing-key-32-bytes-min
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   DEBUG=true
   ```

4. Run the development servers:
   - **Backend API (Port 8000):**
     ```bash
     uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
     ```
   - **Frontend UI (Port 5173):**
     ```bash
     npm run dev
     # or: cd frontend && npm run dev
     ```

5. Access the Web Application:
   - **Spider-Sense Frontend Dashboard:** [http://localhost:5173](http://localhost:5173)
   - **Interactive API Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🧪 Running the Test Suite

A complete test suite covering concurrency race conditions, RBAC authorization, pagination, and state machine validation is provided.

Run tests using pytest:
```bash
.venv/bin/pytest -v
```

### Test Suite Summary:
- `tests/test_auth.py`: Registration, login, JWT token claims, and role check boundaries (`403 Forbidden`).
- `tests/test_concurrency.py`: Simulates concurrent hero claims using `asyncio.gather` on the same millisecond to ensure exactly one claim succeeds and the competing claim receives `409 Conflict`.
- `tests/test_incidents.py`: Citizen isolation, Hero open queue viewing, ORM pagination, and multi-field query filtering.
- `tests/test_state_machine.py`: Full lifecycle progression and rejection of invalid state transitions with `400 Bad Request`.

---

## 🔌 API Endpoints Reference

### 1. Authentication

| Method | Endpoint | Description | Auth Required | Role |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register a new user | No | Anyone |
| `POST` | `/auth/login` | Log in and receive JWT token | No | Anyone |
| `GET` | `/auth/me` | Retrieve profile of caller | Yes (Bearer) | Any |

#### Register Payload (`POST /auth/register`):
```json
{
  "username": "miles_morales",
  "password": "spider_password_123",
  "role": "CITIZEN"
}
```
*(Roles can be `CITIZEN` or `HERO`)*

---

### 2. Incidents & State Transitions

| Method | Endpoint | Description | Role Required | HTTP Status |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/incidents` | Create a new incident report | `CITIZEN` | `201 Created` |
| `GET` | `/incidents` | List incidents (Paginated & Filtered) | Any Authenticated | `200 OK` |
| `GET` | `/incidents/{id}` | Get incident details & audit logs | Author or `HERO` | `200 OK` |
| `PATCH` | `/incidents/{id}/claim` | Atomically claim open incident | `HERO` | `200 OK` / `409 Conflict` |
| `PATCH` | `/incidents/{id}/status` | Advance incident status | `HERO` | `200 OK` / `400 Bad Request` |
| `GET` | `/incidents/{id}/history`| View audit trail of status changes | Author or `HERO` | `200 OK` |

#### Create Incident (`POST /incidents` - Citizen Only):
```json
{
  "title": "Rhino Rampage on Broadway",
  "description": "Rhino charging down Broadway smashing vehicles.",
  "category": "Assault",
  "severity": 4,
  "location": "Broadway & 42nd St"
}
```

#### Update Incident Status (`PATCH /incidents/{id}/status` - Hero Only):
```json
{
  "status": "IN_PROGRESS"
}
```
*(Strict transitions: `CLAIMED` ➔ `IN_PROGRESS`, `IN_PROGRESS` ➔ `RESOLVED`)*

---

## ⚡ Concurrency & Race Condition Prevention

When multiple heroes try to claim an incident at the exact same time, ordinary `SELECT` followed by `UPDATE` queries suffer from race conditions (Time-of-Check to Time-of-Use). 

In this system, the claim endpoint executes an atomic conditional update at the database engine layer:
```python
stmt = (
    update(Incident)
    .where(
        Incident.id == incident_id,
        Incident.status == IncidentStatus.REPORTED,
        Incident.hero_id.is_(None),
    )
    .values(
        status=IncidentStatus.CLAIMED,
        hero_id=current_user.id,
    )
    .execution_options(synchronize_session=False)
)
result = await db.execute(stmt)

if result.rowcount == 0:
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Incident cannot be claimed (already claimed, invalid status, or does not exist).",
    )
```
The database engine serializes the write on the row lock. Only the first transaction modifies `rowcount = 1`. Any subsequent or simultaneous concurrent requests see `rowcount = 0` and are immediately rejected with `409 Conflict`.
# CODE_BACK
