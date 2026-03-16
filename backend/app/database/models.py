
from sqlalchemy import String, Column, Integer

from app.database import Base

class AppConfiguration(Base):
    __tablename__ = "app_configuration"
    id: int = Column(Integer, primary_key=True, index=True)
    key: str = Column(String(255), unique=True, index=True, nullable=False)
    value: str = Column(String(255), nullable=False)

class ImageBlob(Base):
    __tablename__ = "image_blob"
    id: int = Column(Integer, primary_key=True, index=True)
    name: str = Column(String(255), unique=True, index=True, nullable=False)
    data: bytes = Column(String, nullable=False)