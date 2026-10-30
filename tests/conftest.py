import asyncio
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app
from app.models.user import UserRole

# Use an in-memory SQLite database with aiosqlite for ultra-fast, isolated testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    future=True,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest_asyncio.fixture(scope="function")
async def db_session():
    """Create fresh database tables for each test function and teardown afterwards."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession):
    """FastAPI test client with database dependency override."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def citizen_auth(client: AsyncClient):
    """Register and log in a Citizen user, returning headers with Bearer token."""
    user_data = {
        "username": "miles_morales",
        "password": "spider_password_123",
        "role": UserRole.CITIZEN.value,
    }
    res = await client.post("/auth/register", json=user_data)
    assert res.status_code == 201
    data = res.json()
    token = data["access_token"]
    return {
        "headers": {"Authorization": f"Bearer {token}"},
        "user": data["user"],
        "token": token,
    }


@pytest_asyncio.fixture
async def second_citizen_auth(client: AsyncClient):
    """Register and log in a second Citizen user."""
    user_data = {
        "username": "gwen_stacy",
        "password": "ghost_spider_123",
        "role": UserRole.CITIZEN.value,
    }
    res = await client.post("/auth/register", json=user_data)
    assert res.status_code == 201
    data = res.json()
    token = data["access_token"]
    return {
        "headers": {"Authorization": f"Bearer {token}"},
        "user": data["user"],
        "token": token,
    }


@pytest_asyncio.fixture
async def hero_auth(client: AsyncClient):
    """Register and log in a Hero user, returning headers with Bearer token."""
    user_data = {
        "username": "peter_parker",
        "password": "friendly_neighborhood_hero",
        "role": UserRole.HERO.value,
    }
    res = await client.post("/auth/register", json=user_data)
    assert res.status_code == 201
    data = res.json()
    token = data["access_token"]
    return {
        "headers": {"Authorization": f"Bearer {token}"},
        "user": data["user"],
        "token": token,
    }


@pytest_asyncio.fixture
async def second_hero_auth(client: AsyncClient):
    """Register and log in a second Hero user."""
    user_data = {
        "username": "miguel_ohara",
        "password": "spider_2099_shock",
        "role": UserRole.HERO.value,
    }
    res = await client.post("/auth/register", json=user_data)
    assert res.status_code == 201
    data = res.json()
    token = data["access_token"]
    return {
        "headers": {"Authorization": f"Bearer {token}"},
        "user": data["user"],
        "token": token,
    }
