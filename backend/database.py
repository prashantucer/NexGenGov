import os
from datetime import datetime, timedelta
from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "sqlite:///./nexgengov_ai.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Citizen(Base):
    __tablename__ = "citizens"
    id = Column(String, primary_key=True, index=True)
    phone_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(String, primary_key=True, index=True)
    citizen_id = Column(String, ForeignKey("citizens.id"), nullable=True)
    category = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    media_url = Column(String, nullable=True)
    priority_score = Column(Integer, default=50)
    priority_breakdown = Column(Text, nullable=True) # JSON String
    duplicate_of_id = Column(String, ForeignKey("incidents.id"), nullable=True)
    reports_count = Column(Integer, default=1)
    status = Column(String, default="submitted") # submitted, triaged, in-progress, resolved, duplicate
    root_cause_hypothesis = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class Department(Base):
    __tablename__ = "departments"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    email = Column(String, nullable=True)

class Task(Base):
    __tablename__ = "tasks"
    id = Column(String, primary_key=True, index=True)
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=False)
    department_id = Column(String, ForeignKey("departments.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="assigned") # assigned, in-progress, completed, escalated, pending
    sla_hours = Column(Integer, default=24)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    escalation_deadline = Column(DateTime, nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    resolution_proof_url = Column(Text, nullable=True)
    resolution_verification = Column(Text, nullable=True) # JSON String

def init_db():
    Base.metadata.create_all(bind=engine)
