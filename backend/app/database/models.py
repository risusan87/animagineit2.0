from sqlalchemy import String, Column, Integer, Float

from app.database import Base

class AppConfiguration(Base):
    __tablename__ = "app_configuration"
    id: int = Column(Integer, primary_key=True, index=True)
    key: str = Column(String(255), unique=True, index=True, nullable=False)
    value: str = Column(String(255), nullable=False)

class Inference(Base):
    __tablename__ = "inference"
    id: int = Column(Integer, primary_key=True, index=True)
    blob_id: str = Column(String(255), unique=True)
    status: str = Column(String(255), index=True, nullable=False)
    location: str = Column(String(255), nullable=True)
    prompt: str = Column(String(1024), nullable=True)
    negative_prompt: str = Column(String(1024), nullable=True)
    num_inference_steps: int = Column(Integer, nullable=True)
    guidance_scale: float = Column(Float, nullable=True)
    seed: int = Column(String(255), nullable=True)
    scheduler: str = Column(String(255), nullable=True)