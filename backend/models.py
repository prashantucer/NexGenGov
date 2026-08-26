from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class IncidentCreate(BaseModel):
    description: str
    latitude: float
    longitude: float
    media_url: Optional[str] = None

class TaskResponse(BaseModel):
    id: str
    incident_id: str
    department_name: str
    title: str
    description: str
    status: str
    sla_hours: int
    assigned_at: datetime
    escalation_deadline: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    resolution_proof_url: Optional[str] = None
    resolution_verification: Optional[str] = None

    class Config:
        from_attributes = True

class IncidentResponse(BaseModel):
    id: str
    category: str
    description: Optional[str]
    latitude: float
    longitude: float
    media_url: Optional[str]
    priority_score: int
    priority_breakdown: Optional[str] = None
    duplicate_of_id: Optional[str] = None
    reports_count: int = 1
    status: str
    root_cause_hypothesis: Optional[str]
    created_at: datetime
    tasks: List[TaskResponse] = []

    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    total_incidents: int
    critical_incidents: int
    coordinated_workflows: int
    resolved_incidents: int
    incidents: List[IncidentResponse]
    hotspots: List[dict] = []
    analytics: dict = {}
