
import os
import re
import io
import base64
from pydantic import BaseModel
import json
from typing import Optional

from fastapi import APIRouter, status, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import modal

from app.database import get_db
from app.database.models import AppConfiguration, Inference
from app.database.minio import storage
from app.ai.serverless import app
from app.cryptographit import P2PEncryption

v1_router = APIRouter()

@v1_router.get("/status", status_code=status.HTTP_204_NO_CONTENT)
async def status_check():
    return None

@v1_router.get("/config/modal-key")
async def get_modal_key(response: Response):
    modal_key = os.getenv("MODAL_TOKEN_ID", "")
    modal_secret = os.getenv("MODAL_TOKEN_SECRET", "")
    key_exists = modal_key.startswith("ak-") and modal_secret.startswith("as-")
    print(f"Modal Key Exists: {key_exists}, Modal Key: {modal_key}, Modal Secret: {modal_secret}")
    response.status_code = status.HTTP_200_OK if key_exists else status.HTTP_404_NOT_FOUND
    return response

class ModalKeySetCommand(BaseModel):
    value: str

@v1_router.post("/config/modal-key")
async def set_modal_key(config_data: ModalKeySetCommand, db: AsyncSession = Depends(get_db)):
    # Extract keys from the command string
    modal_key_match = re.search(r"ak-[a-zA-Z0-9]+", config_data.value)
    modal_secret_match = re.search(r"as-[a-zA-Z0-9]+", config_data.value)
    
    if not modal_key_match or not modal_secret_match:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid key format")
    
    modal_key = modal_key_match.group(0)
    modal_secret = modal_secret_match.group(0)
    
    modal_key_orm = (await db.execute(
        select(AppConfiguration).where(AppConfiguration.key == "modal_key")
    )).scalar_one_or_none()
    modal_secret_orm = (await db.execute(
        select(AppConfiguration).where(AppConfiguration.key == "modal_secret")
    )).scalar_one_or_none()
    
    os.environ["MODAL_TOKEN_ID"] = modal_key
    os.environ["MODAL_TOKEN_SECRET"] = modal_secret
    if not modal_key_orm:
        modal_key_orm = AppConfiguration(key="modal_key", value=modal_key)
        modal_secret_orm = AppConfiguration(key="modal_secret", value=modal_secret)
        db.add(modal_key_orm)
        db.add(modal_secret_orm)
    else:
        modal_key_orm.value = modal_key
        modal_secret_orm.value = modal_secret
    await db.commit()
    await app.deploy.aio()
    return {"status": "success"}

class InferenceRequest(BaseModel):
    prompt: str
    negative_prompt: str
    num_inference_steps: int
    guidance_scale: float
    num_images_per_prompt: int
    images: int
    scheduler: str

@v1_router.post("/inference")
async def inference(request: InferenceRequest, response: Response, db: AsyncSession = Depends(get_db)):
    blob_ids = []
    for _ in range(request.images * request.num_images_per_prompt):
        inference_record = Inference(
            status="accepted",
            location=None,
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            num_inference_steps=request.num_inference_steps,
            guidance_scale=request.guidance_scale,
            seed=None,
            scheduler=request.scheduler,
        )
        blob_ids.append(inference_record.blob_id)
        db.add(inference_record)
    await db.commit()
    await app.deploy.aio()
    DiffusionModel = modal.Cls.from_name("animagineit", "DiffusionModel")
    # Addons to the model
    loras = [
        #{"name": "pixel-art-xl", "weight": 0.0},
    ]
    refiner = {
        #"model_name": "sd_xl_refiner_1.0",
        #"strength": 0.55,
        #"high_noise_frac": 0.7,
    }
    upscaler = {
        #"model_name": "stable-diffusion-x4-upscaler",
    }
    diffusion = DiffusionModel(
        model_name="animagine-xl-4.0-opt", 
        loras=json.dumps(loras), 
        refiner=json.dumps(refiner), 
        upscaler=json.dumps(upscaler)
    )
    cipher = P2PEncryption(is_remote=False) # Modal is remote in this case
    if (hints := await diffusion.encryption_request.remote.aio()) is not None:
        pem, varifying_key = hints
        res = cipher.encryption_response(pem, varifying_key)
    success = await diffusion.encryption_acknowledged.remote.aio(*res)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Encryption handshake failed")
    print("Encryption handshake successful, proceeding with inference...")
    encrypted_args = cipher.cryptor.encrypt(request.model_dump_json().encode('utf-8'))
    encrypted_images = await diffusion.generate.remote.aio(encrypted_args)
    images = json.loads(cipher.cryptor.decrypt(encrypted_images).decode('utf-8'))
    img_locations = []
    reserved_inferences = (await db.execute(
        select(Inference).where(Inference.blob_id.in_(blob_ids))
    )).scalars().all()
    for inference, img in zip(reserved_inferences, images["images"]):
        image = io.BytesIO(base64.b64decode(img["img"]))
        location = storage.upload_image(image.getvalue(), f"{inference.blob_id}.png")
        img_locations.append(location)
        inference.status = "completed"
        inference.location = location
        inference.seed = img["seed"]
    await db.commit()
    response.status_code = status.HTTP_200_OK
    response.headers["Content-Type"] = "application/json"
    return img_locations

@v1_router.get("/inference")
async def get_inference_results(
    blob_id: Optional[str] = None, 
    prompt: Optional[str] = None,
    negative_prompt: Optional[str] = None,
    guidance_scale: Optional[str] = None,
    seed: Optional[str] = None,
    scheduler: Optional[str] = None,
    steps: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Inference).where(Inference.status == "completed")
    if blob_id:
        stmt = stmt.where(Inference.blob_id == blob_id)
    if prompt:
        stmt = stmt.where(Inference.prompt.in_(prompt))
    if negative_prompt:
        stmt = stmt.where(Inference.negative_prompt.in_(negative_prompt))
    if guidance_scale:
        min_guidance, max_guidance = map(float, guidance_scale.split(","))
        stmt = stmt.where(Inference.guidance_scale >= min_guidance, Inference.guidance_scale <= max_guidance)
    if seed:
        min_seed, max_seed = map(int, seed.split(","))
        stmt = stmt.where(Inference.seed >= min_seed, Inference.seed <= max_seed)
    if scheduler:
        stmt = stmt.where(Inference.scheduler == scheduler)
    if steps:
        min_steps, max_steps = map(int, steps.split(","))
        stmt = stmt.where(Inference.num_inference_steps >= min_steps, Inference.num_inference_steps <= max_steps)
    result = await db.execute(stmt)
    inferences = result.scalars().all()
    return [
        {
            "location": inference.location,
            "prompt": inference.prompt,
            "negative_prompt": inference.negative_prompt,
            "num_inference_steps": inference.num_inference_steps,
            "guidance_scale": inference.guidance_scale,
            "seed": inference.seed,
            "scheduler": inference.scheduler,
        }
        for inference in inferences
    ]