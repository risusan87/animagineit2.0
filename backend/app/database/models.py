
from sqlalchemy import String, Column, Integer

from app.database import Base

class AppConfiguration(Base):
    __tablename__ = "app_configuration"
    id: int = Column(Integer, primary_key=True, index=True)
    key: str = Column(String(255), unique=True, index=True, nullable=False)
    value: str = Column(String(255), nullable=False)