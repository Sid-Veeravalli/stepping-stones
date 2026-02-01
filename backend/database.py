"""
Database connection and session management
Supports both SQLite (local dev) and PostgreSQL (production)
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from models import Base
import os

# Check for DATABASE_URL environment variable (for production)
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Production: Use provided database URL (Railway PostgreSQL)
    # Railway provides postgres:// but SQLAlchemy needs postgresql://
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
    elif DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

    # Create async engine for PostgreSQL
    engine = create_async_engine(
        DATABASE_URL,
        echo=os.getenv("DEBUG", "false").lower() == "true",
        future=True,
        pool_pre_ping=True,  # Handle connection drops
        pool_size=5,
        max_overflow=10,
        connect_args={"statement_cache_size": 0}  # Disable prepared statements for pgbouncer compatibility
    )
else:
    # Local development: Use SQLite
    DB_DIR = os.path.join(os.path.dirname(__file__), "data")
    os.makedirs(DB_DIR, exist_ok=True)
    SQLITE_URL = f"sqlite+aiosqlite:///{os.path.join(DB_DIR, 'quiz_game.db')}"

    engine = create_async_engine(
        SQLITE_URL,
        echo=True,
        future=True
    )

# Create async session factory
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


async def init_db():
    """
    Initialize database - create all tables
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """
    Dependency for getting database session
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
