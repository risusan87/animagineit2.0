
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
    status: str = Column(String(255), index=True, nullable=False)
    location: str = Column(String(255), nullable=True)
    prompt: str = Column(String(255), nullable=False)
    negative_prompt: str = Column(String(255), nullable=True)
    num_inference_steps: int = Column(Integer, nullable=False)
    guidance_scale: float = Column(Float, nullable=False)