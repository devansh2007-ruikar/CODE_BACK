from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.dependencies import (
    get_current_user,
    require_citizen,
    require_hero,
)
from app.database import get_db
from app.models.incident import Incident, IncidentStatus
from app.models.status_history import StatusHistory
from app.models.user import User, UserRole
from app.schemas.incident import (
    IncidentCreate,
    IncidentResponse,
    IncidentDetailResponse,
    IncidentStatusUpdate,
)
from app.schemas.status_history import StatusHistoryResponse

router = APIRouter(prefix="/incidents", tags=["Incidents"])

# Strict transition flow: REPORTED -> CLAIMED -> IN_PROGRESS -> RESOLVED
STRICT_TRANSITION_MAP = {
    IncidentStatus.REPORTED: IncidentStatus.CLAIMED,
    IncidentStatus.CLAIMED: IncidentStatus.IN_PROGRESS,
    IncidentStatus.IN_PROGRESS: IncidentStatus.RESOLVED,
}


@router.post(
    "",
    response_model=IncidentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new incident (Citizen only)",
)
async def create_incident(
    incident_in: IncidentCreate,
    current_user: User = Depends(require_citizen),
    db: AsyncSession = Depends(get_db),
):
    """Citizen creates a new incident report."""
    incident = Incident(
        title=incident_in.title,
        description=incident_in.description,
        category=incident_in.category,
        severity=incident_in.severity,
        location=incident_in.location,
        status=IncidentStatus.REPORTED,
        citizen_id=current_user.id,
        hero_id=None,
    )
    db.add(incident)
    await db.commit()
    await db.refresh(incident)
    return incident


@router.get(
    "",
    response_model=List[IncidentResponse],
    summary="List incidents with pagination and filtering",
)
async def list_incidents(
    response: Response,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    status: Optional[IncidentStatus] = Query(None, description="Filter by incident status"),
    category: Optional[str] = Query(None, description="Filter by category"),
    severity: Optional[int] = Query(None, ge=1, le=5, description="Filter by severity (1-5)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve incidents directly filtered and paginated in the ORM.
    
    - Citizens: Only view incidents they reported.
    - Heroes: View all open incidents (REPORTED, CLAIMED, IN_PROGRESS) by default,
      or filter by any specific status.
    """
    stmt = select(Incident).options(selectinload(Incident.status_history))

    # Base access filtering
    if current_user.role == UserRole.CITIZEN:
        stmt = stmt.where(Incident.citizen_id == current_user.id)
    elif current_user.role == UserRole.HERO:
        if status is None:
            # "If Hero, return all open incidents"
            stmt = stmt.where(
                Incident.status.in_([
                    IncidentStatus.REPORTED,
                    IncidentStatus.CLAIMED,
                    IncidentStatus.IN_PROGRESS,
                ])
            )

    # Direct ORM Query Filtering
    if status is not None:
        stmt = stmt.where(Incident.status == status)

    if category is not None:
        stmt = stmt.where(Incident.category.ilike(f"%{category}%"))

    if severity is not None:
        stmt = stmt.where(Incident.severity == severity)

    # Count total matching rows for pagination headers
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_count = (await db.execute(count_stmt)).scalar() or 0
    response.headers["X-Total-Count"] = str(total_count)
    response.headers["X-Page"] = str(page)
    response.headers["X-Limit"] = str(limit)

    # Order and ORM pagination
    offset = (page - 1) * limit
    stmt = stmt.order_by(Incident.id.desc()).offset(offset).limit(limit)

    result = await db.execute(stmt)
    incidents = result.scalars().all()
    return incidents


@router.get(
    "/{incident_id}",
    response_model=IncidentDetailResponse,
    summary="Get incident details by ID",
)
async def get_incident(
    incident_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve details for a single incident."""
    stmt = (
        select(Incident)
        .where(Incident.id == incident_id)
        .options(selectinload(Incident.status_history))
    )
    result = await db.execute(stmt)
    incident = result.scalar_one_or_none()

    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID {incident_id} not found.",
        )

    # Citizens can only view their own incidents
    if current_user.role == UserRole.CITIZEN and incident.citizen_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only view incidents you reported.",
        )

    return incident


@router.patch(
    "/{incident_id}/claim",
    response_model=IncidentResponse,
    summary="Claim an incident (Hero only, atomic)",
)
async def claim_incident(
    incident_id: int,
    current_user: User = Depends(require_hero),
    db: AsyncSession = Depends(get_db),
):
    """Hero claims an incident.
    
    Concurrency Guard:
    Executes an atomic database update:
    UPDATE incidents SET status='CLAIMED', hero_id=:hero_id
    WHERE id=:id AND status='REPORTED' AND hero_id IS NULL.
    Returns 409 Conflict if 0 rows are updated.
    Automatically logs the status change into StatusHistory.
    """
    stmt = (
        update(Incident)
        .where(
            Incident.id == incident_id,
            Incident.status == IncidentStatus.REPORTED,
            Incident.hero_id.is_(None),
        )
        .values(
            status=IncidentStatus.CLAIMED,
            hero_id=current_user.id,
        )
        .execution_options(synchronize_session=False)
    )

    result = await db.execute(stmt)

    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Incident cannot be claimed. It is either already claimed, not in REPORTED status, or does not exist.",
        )

    # Automatically log status change into StatusHistory
    history = StatusHistory(
        incident_id=incident_id,
        old_status=IncidentStatus.REPORTED.value,
        new_status=IncidentStatus.CLAIMED.value,
        changed_by=current_user.id,
    )
    db.add(history)
    await db.commit()

    # Fetch updated incident with relationships
    fetch_stmt = (
        select(Incident)
        .where(Incident.id == incident_id)
        .options(selectinload(Incident.status_history))
    )
    updated_result = await db.execute(fetch_stmt)
    updated_incident = updated_result.scalar_one()

    return updated_incident


@router.patch(
    "/{incident_id}/status",
    response_model=IncidentResponse,
    summary="Update incident status (Hero only, strict state flow)",
)
async def update_incident_status(
    incident_id: int,
    status_update: IncidentStatusUpdate,
    current_user: User = Depends(require_hero),
    db: AsyncSession = Depends(get_db),
):
    """Hero updates incident status following strict state flow:
    REPORTED -> CLAIMED -> IN_PROGRESS -> RESOLVED.
    Rejects any invalid jumps with 400 Bad Request.
    Automatically logs status change into StatusHistory.
    """
    fetch_stmt = (
        select(Incident)
        .where(Incident.id == incident_id)
        .options(selectinload(Incident.status_history))
    )
    result = await db.execute(fetch_stmt)
    incident = result.scalar_one_or_none()

    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID {incident_id} not found.",
        )

    # State Machine validation: strictly enforce REPORTED -> CLAIMED -> IN_PROGRESS -> RESOLVED
    expected_next = STRICT_TRANSITION_MAP.get(incident.status)
    if expected_next is None or status_update.status != expected_next:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid status transition from '{incident.status.value}' to '{status_update.status.value}'. "
                f"Strictly allowed transition is to '{expected_next.value if expected_next else 'None (terminal)'}'."
            ),
        )

    old_status_val = incident.status.value
    new_status_val = status_update.status.value

    # Update incident state
    incident.status = status_update.status
    if incident.hero_id is None:
        incident.hero_id = current_user.id

    # Automatically log status change into StatusHistory table
    history = StatusHistory(
        incident_id=incident.id,
        old_status=old_status_val,
        new_status=new_status_val,
        changed_by=current_user.id,
    )
    db.add(history)
    await db.commit()
    await db.refresh(incident)

    return incident


@router.get(
    "/{incident_id}/history",
    response_model=List[StatusHistoryResponse],
    summary="Get status change history for an incident",
)
async def get_incident_history(
    incident_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full audit history of status changes for an incident."""
    # Verify incident exists and citizen access check
    incident = await db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID {incident_id} not found.",
        )

    if current_user.role == UserRole.CITIZEN and incident.citizen_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only view history for incidents you reported.",
        )

    stmt = (
        select(StatusHistory)
        .where(StatusHistory.incident_id == incident_id)
        .order_by(StatusHistory.changed_at.asc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()
