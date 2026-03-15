from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import v1_router

app = FastAPI(
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8501"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router, prefix="/api/v1")