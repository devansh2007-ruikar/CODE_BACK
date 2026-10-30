import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    CheckConstraint,
    Enum as SAEnum,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


class IncidentStatus(str, enum.Enum):
    REPORTED = "REPORTED"
    CLAIMED = "CLAIMED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"


class Incident(Base):
    __tablename__ = "incidents"
    __table_args__ = (
        CheckConstraint("severity >= 1 AND severity <= 5", name="check_severity_range"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False, index=True)
    severity = Column(Integer, nullable=False)  # 1 to 5
    location = Column(String(255), nullable=False)
    status = Column(
        SAEnum(
            IncidentStatus,
            name="incident_status",
            native_enum=False,
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=IncidentStatus.REPORTED,
        index=True,
    )
    citizen_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    hero_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    citizen = relationship(
        "User",
        back_populates="reported_incidents",
        foreign_keys=[citizen_id],
    )
    hero = relationship(
        "User",
        back_populates="claimed_incidents",
        foreign_keys=[hero_id],
    )
    status_history = relationship(
        "StatusHistory",
        back_populates="incident",
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="StatusHistory.changed_at.asc()",
    )
