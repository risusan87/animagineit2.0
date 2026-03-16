
from asyncio.log import logger
from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api.v1 import v1_router
from app.database import DATABASE_URL, wait_for_db, SessionLocal
from app.database.models import AppConfiguration

@asynccontextmanager
async def lifespan(app: FastAPI):
    if DATABASE_URL:
        db_ready = await wait_for_db(DATABASE_URL)
        if db_ready:
            with SessionLocal() as db:
                modal_token = db.execute(
                    select(AppConfiguration).where(AppConfiguration.key == "modal_key")
                ).scalar_one_or_none()
                modal_secret = db.execute(
                    select(AppConfiguration).where(AppConfiguration.key == "modal_secret")
                ).scalar_one_or_none()
                if modal_token and modal_secret:
                    os.setenv("MODAL_TOKEN_ID", modal_token.value)
                    os.setenv("MODAL_TOKEN_SECRET", modal_secret.value)
    yield

app = FastAPI(
    redirect_slashes=False,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8501"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router, prefix="/api/v1")