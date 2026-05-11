"""
Producer 视频制片模型
热点雷达、视频剧本、观众互动、视频制作、分支图谱
"""
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, Integer, Float, Boolean, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.database import Base


# ── 热点雷达 ──
class Hotspot(Base):
    __tablename__ = "hotspots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    episode_key: Mapped[str] = mapped_column(String(30), nullable=False)  # episode1/episode2/episode3
    tag: Mapped[str] = mapped_column(String(100), nullable=False)
    heat: Mapped[int] = mapped_column(Integer, nullable=False)
    trend: Mapped[list] = mapped_column(JSON, nullable=False, default=list)  # 8个趋势数据点
    analysis: Mapped[str] = mapped_column(Text, nullable=False)
    ai_suggestion: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str | None] = mapped_column(String(30), nullable=True)  # xiaohongshu/baidu
    is_new: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project = relationship("Project", backref="hotspots")


# ── 视频剧本 (分镜脚本) ──
class VideoScript(Base):
    __tablename__ = "video_scripts"
    __table_args__ = (UniqueConstraint("project_id", "script_key", name="uq_video_scripts_project_script_key"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    script_key: Mapped[str] = mapped_column(String(20), nullable=False)  # ep1/ep2a/ep2b/ep3a/ep3b
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    episode: Mapped[int] = mapped_column(Integer, nullable=False)
    branch: Mapped[str | None] = mapped_column(String(5), nullable=True)  # A/B/null
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft/generated/published
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    roles: Mapped[list] = mapped_column(JSON, default=list)  # [{name, desc}]
    scenes: Mapped[list] = mapped_column(JSON, default=list)  # [{id, time, visual, audio}]
    source_text: Mapped[str | None] = mapped_column(Text, nullable=True)  # 原始文稿内容
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", backref="video_scripts")


# ── 观众互动 ──
class AudienceInteraction(Base):
    __tablename__ = "audience_interactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    episode: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="open")  # open/closed
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    intro: Mapped[str | None] = mapped_column(Text, nullable=True)
    option_a: Mapped[dict] = mapped_column(JSON, nullable=False)  # {label, slogan, desc, votes, color}
    option_b: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", backref="interactions")
    votes = relationship("AudienceVote", back_populates="interaction", lazy="selectin", cascade="all, delete-orphan")
    comments = relationship("AudienceComment", back_populates="interaction", lazy="selectin", cascade="all, delete-orphan")


class AudienceVote(Base):
    __tablename__ = "audience_votes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    interaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("audience_interactions.id"), nullable=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    choice: Mapped[str] = mapped_column(String(5), nullable=False)  # A/B
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    interaction = relationship("AudienceInteraction", back_populates="votes")


class AudienceComment(Base):
    __tablename__ = "audience_comments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    interaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("audience_interactions.id"), nullable=False)
    user_name: Mapped[str] = mapped_column(String(50), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    interaction = relationship("AudienceInteraction", back_populates="comments")


# ── 视频制作 ──
class VideoProduction(Base):
    __tablename__ = "video_productions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    script_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("video_scripts.id"), nullable=False)
    style: Mapped[str] = mapped_column(String(50), nullable=False)
    voice: Mapped[str] = mapped_column(String(50), nullable=False)
    bgm: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending/producing/done/failed
    progress: Mapped[int] = mapped_column(Integer, default=0)  # 0-100
    current_step: Mapped[str | None] = mapped_column(String(50), nullable=True)  # parse/frames/audio/render
    video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    duration: Mapped[str | None] = mapped_column(String(20), nullable=True)
    task_id: Mapped[str | None] = mapped_column(String(100), nullable=True)  # Celery task ID
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", backref="video_productions")
    script = relationship("VideoScript", backref="productions")


# ── 分支图谱 ──
class StorylineNode(Base):
    __tablename__ = "storyline_nodes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    node_key: Mapped[str] = mapped_column(String(30), nullable=False)  # ep1/vote1/ep2a/ep2b/ep3
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    subtitle: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(20), default="upcoming")  # upcoming/locked/completed/published
    date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    x: Mapped[int] = mapped_column(Integer, default=50)
    y: Mapped[int] = mapped_column(Integer, default=50)
    video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project = relationship("Project", backref="storyline_nodes")


class StorylineEdge(Base):
    __tablename__ = "storyline_edges"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    from_node: Mapped[str] = mapped_column(String(30), nullable=False)
    to_node: Mapped[str] = mapped_column(String(30), nullable=False)
    label: Mapped[str | None] = mapped_column(String(50), nullable=True)

    project = relationship("Project", backref="storyline_edges")
