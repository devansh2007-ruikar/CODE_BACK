import logging
from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from app.config import settings

logger = logging.getLogger("uvicorn.error")

FALLBACK_SQLITE_URL = "sqlite+aiosqlite:///./spidersense.db"

# Engine configured for async execution with asyncpg (or aiosqlite for fallback/tests)
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides an asynchronous database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database tables asynchronously.
    If PostgreSQL is unreachable in local development, fall back gracefully to SQLite.
    """
    global engine, AsyncSessionLocal

    try:
        # Test connection to configured DATABASE_URL (e.g. postgresql+asyncpg)
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info(f"Connected to database at {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
    except Exception as e:
        logger.warning(
            f"Configured database ({settings.DATABASE_URL}) unreachable: {e}. "
            f"Falling back to local SQLite ({FALLBACK_SQLITE_URL}) for active local development."
        )
        await engine.dispose()
        engine = create_async_engine(
            FALLBACK_SQLITE_URL,
            echo=settings.DEBUG,
            future=True,
        )
        AsyncSessionLocal = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database schemas verified and initialized.")
