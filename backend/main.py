import uuid
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import init_db, SessionLocal, Incident, Citizen, Department, Task
from models import IncidentCreate, IncidentResponse, TaskResponse, DashboardStats
from ai_engine import run_ai_triage, haversine_distance, verify_resolution, analyze_image_content

app = FastAPI(title="NexGenGov - Backend Services")

# Enable CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get db session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Request body models
class TaskStatusUpdate(BaseModel):
    status: str
    resolution_proof: str | None = None

class ImageAnalysisRequest(BaseModel):
    image_base64: str

@app.post("/api/analyze-image")
def analyze_image_endpoint(payload: ImageAnalysisRequest):
    """
    Real-time AI Computer Vision endpoint to inspect uploaded/camera images,
    detect civic issues vs non-civic irrelevant items, and output bounding boxes.
    """
    result = analyze_image_content(payload.image_base64)
    return result


def seed_database_data(db):
    # 1. Seed All 8 Comprehensive Municipal Departments
    depts = [
        ("Public Works Department", "pwd@gov.in"),
        ("Water Supply & Sewerage Department", "water@gov.in"),
        ("Municipal Sanitation Department", "sanitation@gov.in"),
        ("Electricity & Street Lighting Department", "electricity@gov.in"),
        ("Horticulture & Urban Parks Department", "horticulture@gov.in"),
        ("Traffic & Road Safety Department", "traffic@gov.in"),
        ("Public Health & Vector Control Department", "health@gov.in"),
        ("Disaster Management & Flood Control", "disaster@gov.in")
    ]

    dept_ids = {}
    for name, email in depts:
        existing = db.query(Department).filter(Department.name == name).first()
        if not existing:
            d_id = str(uuid.uuid4())
            db.add(Department(id=d_id, name=name, email=email))
            dept_ids[name] = d_id
        else:
            dept_ids[name] = existing.id
    db.commit()

    # 2. Seed historical incidents to feed recurrence AI checker
    # Seed 2 resolved road damage incidents in the last 60 days near (28.6139, 77.2090)
    hist_count = db.query(Incident).filter(Incident.category == "Road Damage").count()
    if hist_count == 0:
        hist_incidents = [
            {
                "description": "Minor potholes on the crossroad.",
                "latitude": 28.6138,
                "longitude": 77.2091,
                "priority": 40,
                "status": "resolved",
                "days_ago": 45
            },
            {
                "description": "Crack in road pavement.",
                "latitude": 28.6139,
                "longitude": 77.2089,
                "priority": 55,
                "status": "resolved",
                "days_ago": 15
            }
        ]
        for inc in hist_incidents:
            i_id = str(uuid.uuid4())
            created_date = datetime.utcnow() - timedelta(days=inc["days_ago"])
            db.add(Incident(
                id=i_id,
                category="Road Damage",
                description=inc["description"],
                latitude=inc["latitude"],
                longitude=inc["longitude"],
                media_url="https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=400&q=80",
                priority_score=inc["priority"],
                status=inc["status"],
                root_cause_hypothesis="Local wearing course decay.",
                created_at=created_date,
                updated_at=created_date
            ))
            # Add historical completed task
            t_id = str(uuid.uuid4())
            db.add(Task(
                id=t_id,
                incident_id=i_id,
                department_id=dept_ids["Public Works Department"],
                title="Repair Pothole",
                description="Standard patch work completed by local crew.",
                status="completed",
                assigned_at=created_date,
                completed_at=created_date + timedelta(hours=6),
                started_at=created_date + timedelta(hours=1),
                escalation_deadline=created_date + timedelta(days=2)
            ))
        db.commit()

@app.on_event("startup")
def startup_event():
    # Initialize SQLite database schema
    init_db()
    
    # Seed database
    db = SessionLocal()
    try:
        seed_database_data(db)
    except Exception as e:
        print(f"Error seeding DB: {e}")
    finally:
        db.close()

@app.get("/api/system-status")
def get_system_status():
    """
    Returns live health, multi-modal vision engine mode (Gemini vs Local Fallback),
    and spatial GIS readiness.
    """
    from ai_engine import gemini_model, gemini_model_name, GEMINI_API_KEY
    vision_mode = f"Google Gemini {gemini_model_name} (Cloud)" if gemini_model else "Smart Local Deep Learning & Feature Extractor (Offline)"
    return {
        "status": "healthy",
        "platform": "NexGenGov - Autonomous Governance Intelligence Platform",
        "vision_engine": vision_mode,
        "api_key_configured": bool(GEMINI_API_KEY),
        "gis_engine": "Haversine Spatial Proximity & Dynamic Multi-City Corridor Active",
        "supported_cities": ["Delhi Central", "Prayagraj / Naini", "Dynamic GeoJSON Grid"]
    }

@app.post("/api/reset")
def reset_database():
    # Recreate SQLite database schemas to flush all active states
    from database import engine, Base
    try:
        Base.metadata.drop_all(bind=engine)
        init_db()
        db = SessionLocal()
        seed_database_data(db)
        db.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database reset error: {str(e)}")
    return {"status": "success", "message": "Database reset and default seeds loaded successfully."}


@app.post("/api/incidents", response_model=IncidentResponse)
def create_incident(incident_data: IncidentCreate, db: Session = Depends(get_db)):
    # 1. Run AI Triage Engine
    triage = run_ai_triage(
        description=incident_data.description,
        lat=incident_data.latitude,
        lon=incident_data.longitude,
        media_url=incident_data.media_url,
        db=db
    )

    if incident_data.media_url and triage["cv_analysis"]["class"] == "none":
        raise HTTPException(
            status_code=400,
            detail=f"Non-civic image detected ({triage['cv_analysis']['label']}). Please upload a clear photo of road damage, garbage, or water leaks."
        )

    # 2. Duplicate Complaint Detection (within 50 meters of the same category)
    active_incidents = db.query(Incident).filter(
        Incident.category == triage["category"],
        Incident.status != "resolved",
        Incident.status != "duplicate"
    ).all()
    
    duplicate_found = None
    for inc in active_incidents:
        dist = haversine_distance(incident_data.latitude, incident_data.longitude, inc.latitude, inc.longitude)
        if dist <= 50.0:
            duplicate_found = inc
            break

    if duplicate_found:
        incident_id = str(uuid.uuid4())
        db_incident = Incident(
            id=incident_id,
            citizen_id=None,
            category=triage["category"],
            description=incident_data.description,
            latitude=incident_data.latitude,
            longitude=incident_data.longitude,
            media_url=incident_data.media_url,
            priority_score=triage["priority_score"],
            priority_breakdown=triage["priority_breakdown"],
            duplicate_of_id=duplicate_found.id,
            reports_count=1,
            status="duplicate",
            root_cause_hypothesis=triage["root_cause_hypothesis"]
        )
        db.add(db_incident)
        
        # Increment parent report count
        duplicate_found.reports_count += 1
        db.commit()
        db.refresh(db_incident)
        return compile_incident_response(db_incident, db)

    # 3. Create standard incident database entity
    incident_id = str(uuid.uuid4())
    db_incident = Incident(
        id=incident_id,
        citizen_id=None,
        category=triage["category"],
        description=incident_data.description,
        latitude=incident_data.latitude,
        longitude=incident_data.longitude,
        media_url=incident_data.media_url,
        priority_score=triage["priority_score"],
        priority_breakdown=triage["priority_breakdown"],
        duplicate_of_id=None,
        reports_count=1,
        status="triaged",
        root_cause_hypothesis=triage["root_cause_hypothesis"]
    )
    db.add(db_incident)
    db.flush()

    # Create associated tasks with SLA
    primary_dept = db.query(Department).filter(Department.name == triage["primary_department"]).first()
    
    primary_sla = 24
    if primary_dept.name == "Public Works Department":
        primary_sla = 72
    elif primary_dept.name == "Water Supply & Sewerage Department":
        primary_sla = 48

    if triage["coordination_needed"] and triage["secondary_department"]:
        secondary_dept = db.query(Department).filter(Department.name == triage["secondary_department"]).first()
        secondary_sla = 24
        if secondary_dept.name == "Public Works Department":
            secondary_sla = 72
        elif secondary_dept.name == "Water Supply & Sewerage Department":
            secondary_sla = 48
            
        # Coordinated Task 1 (Secondary Dept) - ACTIVE
        task1_id = str(uuid.uuid4())
        db.add(Task(
            id=task1_id,
            incident_id=incident_id,
            department_id=secondary_dept.id,
            title=f"Repair Underlying Source: {triage['cv_class'].replace('-', ' ').title()}",
            description=f"Inspect and repair the source issue: {triage['root_cause_hypothesis']}.",
            status="assigned",
            sla_hours=secondary_sla,
            escalation_deadline=datetime.utcnow() + timedelta(hours=secondary_sla)
        ))
        
        # Coordinated Task 2 (Primary Dept) - PENDING
        task2_id = str(uuid.uuid4())
        db.add(Task(
            id=task2_id,
            incident_id=incident_id,
            department_id=primary_dept.id,
            title="Perform Surface Restoration",
            description="Resurface and restore the pavement. DO NOT start until underlying utility issues are reported fixed.",
            status="pending",
            sla_hours=primary_sla,
            escalation_deadline=datetime.utcnow() + timedelta(hours=primary_sla)
        ))
    else:
        # Standard Single Department Task - ACTIVE
        task_id = str(uuid.uuid4())
        db.add(Task(
            id=task_id,
            incident_id=incident_id,
            department_id=primary_dept.id,
            title=f"Resolve Reported Issue: {triage['category']}",
            description=f"Conduct maintenance to address the reported problem: {incident_data.description}.",
            status="assigned",
            sla_hours=primary_sla,
            escalation_deadline=datetime.utcnow() + timedelta(hours=primary_sla)
        ))

    db.commit()
    db.refresh(db_incident)

    return compile_incident_response(db_incident, db)

@app.get("/api/dashboard", response_model=DashboardStats)
def get_dashboard_data(db: Session = Depends(get_db)):
    # 1. Background SLA Checker: check overdue active tasks and escalate them
    active_tasks = db.query(Task).filter(Task.status.in_(["assigned", "in_progress"])).all()
    for t in active_tasks:
        if datetime.utcnow() > t.escalation_deadline:
            t.status = "escalated"
            
            # Find the incident and change status to escalated if it is not resolved
            incident = db.query(Incident).filter(Incident.id == t.incident_id).first()
            if incident and incident.status not in ["resolved", "duplicate"]:
                incident.status = "escalated"
    db.commit()

    incidents = db.query(Incident).order_by(Incident.created_at.desc()).all()
    
    total = len(incidents)
    resolved = sum(1 for i in incidents if i.status == "resolved")
    critical = sum(1 for i in incidents if i.priority_score >= 80 and i.status != "resolved" and i.status != "duplicate")
    
    coordinated = 0
    responses = []
    for inc in incidents:
        resp = compile_incident_response(inc, db)
        responses.append(resp)
        if len(resp.tasks) > 1 and inc.status != "resolved" and inc.status != "duplicate":
            coordinated += 1

    # 2. Hotspot Detection: (Radius 150m, count >= 3 unresolved incidents)
    unresolved_incidents = [inc for inc in incidents if inc.status not in ["resolved", "duplicate"]]
    hotspots = []
    processed_ids = set()
    
    for inc in unresolved_incidents:
        if inc.id in processed_ids:
            continue
        cluster = [inc]
        for other in unresolved_incidents:
            if other.id != inc.id and other.id not in processed_ids:
                dist = haversine_distance(inc.latitude, inc.longitude, other.latitude, other.longitude)
                if dist <= 150.0:
                    cluster.append(other)
        if len(cluster) >= 3:
            hotspots.append({
                "latitude": inc.latitude,
                "longitude": inc.longitude,
                "incident_count": len(cluster),
                "category": inc.category
            })
            for c_inc in cluster:
                processed_ids.add(c_inc.id)

    # 3. Analytics Calculations
    completed_tasks = db.query(Task).filter(Task.status == "completed").all()
    total_time_hours = 0.0
    for ct in completed_tasks:
        if ct.completed_at and ct.assigned_at:
            delta = ct.completed_at - ct.assigned_at
            total_time_hours += delta.total_seconds() / 3600.0
            
    avg_res_time = round(total_time_hours / len(completed_tasks), 1) if completed_tasks else 0.0

    departments = db.query(Department).all()
    dept_performance = {}
    for d in departments:
        tasks = db.query(Task).filter(Task.department_id == d.id).all()
        completed = sum(1 for t in tasks if t.status == "completed")
        pending = sum(1 for t in tasks if t.status in ["assigned", "in_progress", "pending"])
        escalated = sum(1 for t in tasks if t.status == "escalated")
        dept_performance[d.name] = {
            "completed": completed,
            "pending": pending,
            "escalated": escalated
        }

    analytics = {
        "average_resolution_time_hours": avg_res_time,
        "department_performance": dept_performance
    }

    return DashboardStats(
        total_incidents=total,
        critical_incidents=critical,
        coordinated_workflows=coordinated,
        resolved_incidents=resolved,
        incidents=responses,
        hotspots=hotspots,
        analytics=analytics
    )

@app.post("/api/tasks/{task_id}/status", response_model=IncidentResponse)
def update_task_status(task_id: str, payload: TaskStatusUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    task.status = payload.status
    incident = db.query(Incident).filter(Incident.id == task.incident_id).first()
    
    if payload.status == "in_progress":
        task.started_at = datetime.utcnow()
        if incident.status not in ["resolved", "duplicate"]:
            incident.status = "in-progress"
        db.commit()
        
    elif payload.status == "completed":
        task.completed_at = datetime.utcnow()
        if payload.resolution_proof:
            task.resolution_proof_url = payload.resolution_proof
            # Call visual verification
            import json
            before_img = incident.media_url or ""
            after_img = payload.resolution_proof
            verification_result = verify_resolution(before_img, after_img)
            task.resolution_verification = json.dumps(verification_result)
        db.commit()
        
        # Handover logic & Incident resolution logic
        all_tasks = db.query(Task).filter(Task.incident_id == incident.id).all()
        
        # 1. Check if there are other tasks that are pending/queued and activate them
        for t in all_tasks:
            if t.status == "pending":
                t.status = "assigned" # Activate
                t.assigned_at = datetime.utcnow()
                t.escalation_deadline = datetime.utcnow() + timedelta(hours=t.sla_hours)
        
        # 2. Check if all tasks for this incident are completed
        all_completed = all(t.status == "completed" for t in all_tasks)
        if all_completed:
            incident.status = "resolved"
        else:
            if incident.status not in ["duplicate"]:
                incident.status = "in-progress"
            
        incident.updated_at = datetime.utcnow()
        db.commit()
        
    return compile_incident_response(incident, db)

@app.get("/")
@app.get("/health")
def health_check():
    """Root health-check endpoint for Render and deployment probes."""
    return {
        "status": "healthy",
        "service": "NexGenGov Autonomous Governance Intelligence API",
        "version": "1.0.0",
        "endpoints": ["/api/dashboard", "/api/incidents", "/api/system-status", "/docs"]
    }

def compile_incident_response(inc: Incident, db: Session) -> IncidentResponse:
    tasks = db.query(Task).filter(Task.incident_id == inc.id).all()
    task_responses = []
    for t in tasks:
        dept = db.query(Department).filter(Department.id == t.department_id).first()
        task_responses.append(TaskResponse(
            id=t.id,
            incident_id=t.incident_id,
            department_name=dept.name if dept else "Unknown Department",
            title=t.title,
            description=t.description,
            status=t.status,
            sla_hours=t.sla_hours,
            assigned_at=t.assigned_at,
            escalation_deadline=t.escalation_deadline,
            started_at=t.started_at,
            completed_at=t.completed_at,
            resolution_proof_url=t.resolution_proof_url,
            resolution_verification=t.resolution_verification
        ))
    
    return IncidentResponse(
        id=inc.id,
        category=inc.category,
        description=inc.description,
        latitude=inc.latitude,
        longitude=inc.longitude,
        media_url=inc.media_url,
        priority_score=inc.priority_score,
        priority_breakdown=inc.priority_breakdown,
        duplicate_of_id=inc.duplicate_of_id,
        reports_count=inc.reports_count,
        status=inc.status,
        root_cause_hypothesis=inc.root_cause_hypothesis,
        created_at=inc.created_at,
        tasks=task_responses
    )

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)

