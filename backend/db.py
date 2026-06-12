"""
Async SQLAlchemy engine + session factory.

SQLite via aiosqlite by default (see config.DB_URL).
"""
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from config import settings

engine = create_async_engine(settings.DB_URL, echo=False)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db() -> None:
    """Create tables on startup (idempotent)."""
    from models import orm  # noqa: F401 — register models with Base.metadata

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session():
    """FastAPI dependency yielding an async DB session."""
    async with SessionLocal() as session:
        yield session
