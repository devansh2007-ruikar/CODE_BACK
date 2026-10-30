from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import auth_router, incidents_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # On startup: initialize database schemas if needed
    try:
        await init_db()
    except Exception as e:
        print(f"Database initialization warning (ensure DB is running): {e}")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "**Spider-Sense Alert System**\n\n"
        "High-performance incident alert and coordination platform connecting Citizens and Heroes.\n\n"
        "### Key Capabilities:\n"
        "- **Role-Based Access Control**: Strict JWT payload checking for `CITIZEN` and `HERO` roles.\n"
        "- **Incident Pipeline**: Citizens report emergencies; Heroes review open queues, claim, and resolve.\n"
        "- **Atomic Concurrency Control**: Zero-race condition claims using atomic conditional SQL updates.\n"
        "- **Strict State Machine**: Sequential enforcement of `REPORTED` -> `CLAIMED` -> `IN_PROGRESS` -> `RESOLVED`.\n"
        "- **Audit Trail**: Real-time automated logging of all state transitions into `StatusHistory`."
    ),
    lifespan=lifespan,
)

# Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count", "X-Page", "X-Limit"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(incidents_router)


@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "online",
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "spider-sense-api",
    }
