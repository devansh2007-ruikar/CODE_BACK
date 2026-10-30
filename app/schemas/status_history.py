from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class StatusHistoryResponse(BaseModel):
    id: int
    incident_id: int
    old_status: Optional[str] = None
    new_status: str
    changed_by: int
    changed_at: datetime

    model_config = ConfigDict(from_attributes=True)
