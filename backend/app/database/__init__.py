
import os
import asyncio
import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase


DATABASE_URL = f"mysql+aiomysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}/{os.getenv('DB_NAME')}"
engine = create_async_engine(DATABASE_URL, echo=True)
SessionLocal = async_sessionmaker(
    bind=engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def wait_for_db(db_url: str, retries: int = 5, delay: int = 5):
    """Attempt to connect to the database with retries."""
    # MariaDB async engine
    engine = create_async_engine(db_url)
    logger = logging.getLogger("uvicorn")
    
    for i in range(retries):
        try:
            async with engine.connect() as conn:
                # Simple 'SELECT 1' to verify the DB is actually ready
                await conn.execute(text("SELECT 1"))
                logger.info("✅ Database connection established.")
                await engine.dispose()
                return True
        except Exception as e:
            logger.warning(f"⚠️ Connection attempt {i+1}/{retries} failed. Retrying in {delay}s...")
            await asyncio.sleep(delay)
    
    await engine.dispose()
    return False
