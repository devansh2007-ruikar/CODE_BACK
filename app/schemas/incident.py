from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.models.incident import IncidentStatus
from app.schemas.status_history import StatusHistoryResponse


class IncidentBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Incident title")
    description: str = Field(..., min_length=1, description="Detailed description of the incident")
    category: str = Field(..., min_length=1, max_length=100, description="Category of the incident")
    severity: int = Field(..., ge=1, le=5, description="Severity rating from 1 (minor) to 5 (catastrophic)")
    location: str = Field(..., min_length=1, max_length=255, description="Location of the incident")


class IncidentCreate(IncidentBase):
    pass


class IncidentStatusUpdate(BaseModel):
    status: IncidentStatus = Field(..., description="Target status for incident state transition")


class IncidentResponse(IncidentBase):
    id: int
    status: IncidentStatus
    citizen_id: int
    hero_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IncidentDetailResponse(IncidentResponse):
    status_history: List[StatusHistoryResponse] = []

