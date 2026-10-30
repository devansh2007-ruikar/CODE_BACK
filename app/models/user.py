import enum
from sqlalchemy import Column, Integer, String, Enum as SAEnum
from sqlalchemy.orm import relationship

from app.database import Base


class UserRole(str, enum.Enum):
    CITIZEN = "CITIZEN"
    HERO = "HERO"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(
        SAEnum(UserRole, name="user_role", native_enum=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=UserRole.CITIZEN,
    )

    # Relationships
    reported_incidents = relationship(
        "Incident",
        back_populates="citizen",
        foreign_keys="Incident.citizen_id",
        cascade="all, delete-orphan",
    )
    claimed_incidents = relationship(
        "Incident",
        back_populates="hero",
        foreign_keys="Incident.hero_id",
    )
    status_changes = relationship(
        "StatusHistory",
        back_populates="changer",
        foreign_keys="StatusHistory.changed_by",
    )
