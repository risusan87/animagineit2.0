
import os
import re
from pydantic import BaseModel

from fastapi import APIRouter, status, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.database.models import AppConfiguration

v1_router = APIRouter()

@v1_router.get("/status", status_code=status.HTTP_204_NO_CONTENT)
async def status_check():
    return None

@v1_router.get("/config/modal-key")
async def get_modal_key():
    modal_key = os.getenv("MODAL_TOKEN_ID")
    modal_secret = os.getenv("MODAL_TOKEN_SECRET")
    return status.HTTP_200_OK if modal_key and modal_secret else status.HTTP_404_NOT_FOUND

class ModalKeySetCommand(BaseModel):
    value: str

@v1_router.post("/config/modal-key")
async def set_modal_key(config_data: ModalKeySetCommand, db: AsyncSession = Depends(get_db)):
    modal_key = re.match(r"^ak-[a-zA-Z0-9]+$", config_data.value)
    modal_secret = re.match(r"^as-[a-zA-Z0-9]+$", config_data.value)
    if not modal_key or not modal_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid key format")
    modal_key_orm = await db.execute(
        select(AppConfiguration).where(AppConfiguration.key == "modal_key")
    ).scalar_one_or_none()
    modal_secret_orm = await db.execute(
        select(AppConfiguration).where(AppConfiguration.key == "modal_secret")
    ).scalar_one_or_none()
    os.setenv("MODAL_TOKEN_ID", modal_key)
    os.setenv("MODAL_TOKEN_SECRET", modal_secret)
    if not modal_key_orm:
        modal_key_orm = AppConfiguration(key="modal_key", value=modal_key)
        modal_secret_orm = AppConfiguration(key="modal_secret", value=modal_secret)
        db.add(modal_key_orm)
        db.add(modal_secret_orm)
    else:
        modal_key_orm.value = modal_key
        modal_secret_orm.value = modal_secret
    await db.commit()
    return {"status": "success"}
