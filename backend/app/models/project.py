"""
项目模型 - 含角色、决策点、舆情快照
"""
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, Integer, Float, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from app.models.database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    concept: Mapped[str] = mapped_column(Text, nullable=False)  # 创意概要
    genre: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 类型: 职场/甜宠/悬疑
    logline: Mapped[str | None] = mapped_column(String(200), nullable=True)  # 一句话概要
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft/writing/completed
    outline_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # 完整大纲 JSON
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    user = relationship("User", back_populates="projects")
    characters = relationship("Character", back_populates="project", lazy="selectin", cascade="all, delete-orphan")
    episodes = relationship("Episode", back_populates="project", lazy="selectin", cascade="all, delete-orphan")
    decisions = relationship("Decision", back_populates="project", lazy="selectin", cascade="all, delete-orphan")
    prophet_snapshots = relationship("ProphetSnapshot", back_populates="project", lazy="selectin", cascade="all, delete-orphan")


class Character(Base):
    __tablename__ = "characters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # protagonist/antagonist/supporting/mentor
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)
    personality: Mapped[list | None] = mapped_column(ARRAY(String), nullable=True)
    backstory: Mapped[str | None] = mapped_column(Text, nullable=True)
    motivation: Mapped[str | None] = mapped_column(String(300), nullable=True)
    speech_style: Mapped[str | None] = mapped_column(String(200), nullable=True)
    appearance: Mapped[str | None] = mapped_column(String(300), nullable=True)
    voice_desc: Mapped[str | None] = mapped_column(Text, nullable=True)  # CosyVoice 用
    embedding_id: Mapped[str | None] = mapped_column(String(100), nullable=True)  # 向量 DB ID
    signature_line: Mapped[str | None] = mapped_column(String(200), nullable=True)
    arc: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="characters")


class Decision(Base):
    __tablename__ = "decisions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    episode_number: Mapped[int] = mapped_column(Integer, nullable=False)
    scene_desc: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list | None] = mapped_column(JSON, nullable=True)  # [{label, desc, consequence, impact, premium}]
    unlock_condition: Mapped[str] = mapped_column(String(20), default="free")  # free/coin/vip
    dramatic_weight: Mapped[int] = mapped_column(Integer, default=50)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="decisions")


class ProphetSnapshot(Base):
    __tablename__ = "prophet_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    query: Mapped[str] = mapped_column(String(200), nullable=False)
    keywords: Mapped[list | None] = mapped_column(JSON, nullable=True)
    trends: Mapped[list | None] = mapped_column(JSON, nullable=True)
    sentiment: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    suggestions: Mapped[list | None] = mapped_column(JSON, nullable=True)
    hot_topics: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="prophet_snapshots")
