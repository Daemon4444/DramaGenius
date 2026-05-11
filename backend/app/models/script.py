"""
剧本模型 - 剧集与场景
"""
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.database import Base


class Episode(Base):
    __tablename__ = "episodes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    ep_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    cliffhanger: Mapped[str | None] = mapped_column(String(300), nullable=True)
    emotional_arc: Mapped[str | None] = mapped_column(String(100), nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=3)
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft/writing/completed
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    project = relationship("Project", back_populates="episodes")
    scenes = relationship("Scene", back_populates="episode", lazy="selectin", cascade="all, delete-orphan", order_by="Scene.order_idx")


class Scene(Base):
    __tablename__ = "scenes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    episode_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("episodes.id"), nullable=False)
    order_idx: Mapped[int] = mapped_column(Integer, nullable=False)  # 场景顺序
    scene_type: Mapped[str] = mapped_column(String(20), nullable=False)  # narration/dialogue/direction
    character_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("characters.id"), nullable=True)
    character_name: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 冗余存储方便查询
    content: Mapped[str] = mapped_column(Text, nullable=False)
    mood: Mapped[str | None] = mapped_column(String(30), nullable=True)  # 场景氛围
    location: Mapped[str | None] = mapped_column(String(100), nullable=True)  # 场景地点
    time_of_day: Mapped[str | None] = mapped_column(String(20), nullable=True)  # 时间
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    episode = relationship("Episode", back_populates="scenes")
