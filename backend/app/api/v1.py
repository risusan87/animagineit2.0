from fastapi import APIRouter, status

v1_router = APIRouter()

@v1_router.get("/status", status_code=status.HTTP_204_NO_CONTENT)
async def status():
    return None