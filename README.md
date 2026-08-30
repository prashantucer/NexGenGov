# 🏛️ NexGenGov - National Governance Intelligence System (NGIS)
> **Autonomous Grievance Redressal & Spatial Governance Intelligence Platform**  
> *Developed under Smart India Hackathon (SIH 2024/2026 - Problem Statement: SIH_26_093)*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg?style=flat&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.2+-61DAFB.svg?style=flat&logo=React&logoColor=black)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Vite-8.2+-646CFF.svg?style=flat&logo=Vite&logoColor=white)](https://vitejs.dev)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-Multi--Modal%20Vision-4285F4.svg?style=flat&logo=Google&logoColor=white)](https://ai.google.dev)
[![Render](https://img.shields.io/badge/Backend-Render-black.svg?style=flat&logo=Render&logoColor=white)](https://render.com)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-black.svg?style=flat&logo=Vercel&logoColor=white)](https://vercel.com)

---

## 📌 Table of Contents
1. [Executive Summary & Problem Statement](#-executive-summary--problem-statement)
2. [Key Architecture & Core Features](#-key-architecture--core-features)
3. [8-Department Unified Governance Matrix](#-8-department-unified-governance-matrix)
4. [AI & Computer Vision Intelligence Engine](#-ai--computer-vision-intelligence-engine)
5. [Tech Stack](#-tech-stack)
6. [Project Directory Structure](#-project-directory-structure)
7. [Live Deployment & Architecture](#-live-deployment--architecture)
8. [Local Development Setup](#-local-development-setup)
9. [API Documentation](#-api-documentation)
10. [Authors & Acknowledgements](#-authors--acknowledgements)

---

## 🏛️ Executive Summary & Problem Statement

Public grievance redressal mechanisms (like CPGRAMS) traditionally suffer from manual triage delays, non-civic irrelevant submissions, repeated duplicate complaints for the same geographic spots, and lack of multi-department cross-coordination (e.g., road damage caused by underground water pipeline leakage).

**NexGenGov (NGIS)** transforms governance by integrating:
- **Real-time AI Multi-Modal Computer Vision** (Google Gemini 2.0 Flash + Offline Feature Extractor) to detect civic defect classes, draw localized bounding boxes, and reject non-civic photos.
- **Explainable Priority Scoring Algorithm (0-100)** incorporating base severity, historical recurrence, school/hospital sensitivity, and spatial clustering.
- **Automated Multi-Department Workflow Chaining** (e.g., Task 1: Water Dept fixes pipeline leak -> Task 2: PWD restores road surface).
- **Geospatial Intelligence Map Overlays** using Leaflet.js and Haversine spatial indexing with automated hotspot radius grouping.
- **Before-vs-After AI Resolution Verification** with cryptographic/visual audit comparison.

---

## 🚀 Key Architecture & Core Features

```
                                  [ Citizen / Field Officer ]
                                               │
                                 (Voice Dictation / Photo / GPS)
                                               ▼
                              ┌───────────────────────────────────┐
                              │     React 19 + Vite Frontend      │
                              │     (PWA + Leaflet.js Maps)       │
                              └─────────────────┬─────────────────┘
                                                │
                                                │ REST API / JSON
                                                ▼
                              ┌───────────────────────────────────┐
                              │      FastAPI Python Backend       │
                              └─────────────────┬─────────────────┘
                                                │
                ┌───────────────────────────────┼──────────────────────────────┐
                ▼                               ▼                              ▼
  ┌──────────────────────────┐    ┌──────────────────────────┐   ┌──────────────────────────┐
  │    AI Computer Vision    │    │  Spatial GIS Intelligence│   │  Multi-Department Engine │
  │ - Gemini 2.0/1.5 Flash   │    │ - Haversine Radius Check │   │ - 8 Department Matrix    │
  │ - Bounding Box Overlays  │    │ - Recurrence Clustered   │   │ - SLA Escalation Tracker │
  │ - Non-Civic Image Filter │    │ - 150m Hotspot Detection │   │ - Coordinated Task Chain │
  └──────────────────────────┘    └──────────────────────────┘   └──────────────────────────┘
```

### 1. 👥 Citizen Grievance Portal
- **Multilingual Support & Voice Dictation:** Hindi + English speech-to-text (Web Speech API) with quick sample chips.
- **Interactive Geospatial Pinning:** Leaflet.js interactive draggable map with GPS auto-detection and address geocoding search (OpenStreetMap Nominatim).
- **Holographic AI Scanner:** Live radar animation overlay drawing bounding boxes on detected potholes, garbage heaps, and pipeline bursts.
- **Real-time Ticket Tracking:** Track grievance status, SLA hours, and assigned departmental actions with ticket ID.

### 2. 🛡️ Officer Administration Dashboard
- **Geospatial Hotspot Map:** Visualizes active incidents, underground utility pipeline overlays, and dynamic 150m critical red-zone clusters.
- **Explainable Priority Breakdown:** Transparent math showing exact weights for Base Severity, Recurrence, School Proximity, Multi-Dept Coordination, and Spatial Cluster.
- **CSV Data Export & Audit Logging:** One-click CSV export of all filtered grievance tickets for administrative oversight.

### 3. 🏢 Departmental Action Portal
- **Dedicated Passcode Portals:** Separate workspaces for all 8 municipal departments.
- **Live SLA Countdown Clock:** Real-time remaining hours with automatic escalation badges when deadlines are exceeded.
- **Resolution Proof Upload & AI Audit:** Upload work completion photos and trigger automated Before-vs-After verification.

---

## 🏛️ 8-Department Unified Governance Matrix

| # | Department Name | Key Focus Areas | Default SLA |
|---|---|---|---|
| 1 | **Public Works Department (PWD)** | Road potholes, asphalt fractures, bridge repairs, footpaths | 72 Hours |
| 2 | **Water Supply & Sewerage Department** | Pipeline leaks, bursting water mains, open manholes, choked drains | 48 Hours |
| 3 | **Municipal Sanitation Department** | Solid waste dumps, plastic debris, street sweeping, carcass removal | 24 Hours |
| 4 | **Electricity & Street Lighting Department** | Non-functional streetlights, sparking transformers, hanging wires | 24 Hours |
| 5 | **Horticulture & Urban Parks Department** | Fallen trees, overgrown roadside branches, public garden upkeep | 48 Hours |
| 6 | **Traffic & Road Safety Department** | Broken traffic signals, missing road signage, illegal parking | 24 Hours |
| 7 | **Public Health & Vector Control Department** | Mosquito fogging, anti-larval sprays, stray animal disease control | 24 Hours |
| 8 | **Disaster Management & Flood Control** | Heavy waterlogging, wall collapses, structural emergency response | 12 Hours |

---

## 🤖 AI & Computer Vision Intelligence Engine

### Explainable Priority Score Formulation:
$$\text{Priority Score} = \text{Base Severity} + \text{Recurrence Check} + \text{School/Hospital Proximity} + \text{Coordination Factor} + \text{Spatial Cluster}$$

- **Base Severity (45–90):** Categorized by initial defect risk.
- **Recurrence (+20):** Similar unresolved incidents within 500m in the last 90 days.
- **Sensitive Zone (+15):** Within 75m of schools or hospitals.
- **Cross-Coordination (+10):** Requiring root-cause inter-departmental workflows.
- **Spatial Cluster (+16):** ≥3 active cases within 100m radius.

---

## 💻 Tech Stack

### Frontend:
- **Framework:** React 19 (React DOM 19)
- **Build Tool:** Vite 8
- **Styling:** Vanilla Modern CSS with Glassmorphism, Dark/Light Mode, and CSS custom tokens
- **Maps:** Leaflet.js with OpenStreetMap TileLayer
- **PWA:** Service Worker (`sw.js`) + Manifest (`manifest.json`)
- **Deployment:** Vercel

### Backend:
- **Framework:** FastAPI (Python 3.11)
- **ASGI Server:** Uvicorn + Gunicorn
- **Database & ORM:** SQLite / PostgreSQL with SQLAlchemy 2.0
- **AI & Vision:** Google Generative AI (`google-generativeai` with Gemini 2.0 Flash) & NumPy/PIL feature extractors
- **Deployment:** Render Web Service

---

## 📂 Project Directory Structure

```
NexGenGov/
├── backend/
│   ├── ai_engine.py          # AI Computer Vision, NLP intent & spatial algorithms
│   ├── database.py           # SQLAlchemy database schema & connection
│   ├── main.py               # FastAPI REST endpoints & SLA background checks
│   ├── models.py             # Pydantic request/response schemas
│   ├── requirements.txt      # Backend Python dependencies
│   └── Procfile              # Render startup process configuration
├── frontend/
│   ├── public/
│   │   ├── favicon.svg       # Ashoka Chakra Emblem icon
│   │   ├── manifest.json     # PWA Configuration
│   │   └── sw.js             # Service Worker (Network-first caching)
│   ├── src/
│   │   ├── assets/           # Media & illustration assets
│   │   ├── components/
│   │   │   ├── CitizenPortal.jsx     # Citizen grievance filing & tracking
│   │   │   ├── OfficerDashboard.jsx  # Administrative dashboard & analytics
│   │   │   ├── DepartmentPortal.jsx  # Work order queue & proof verification
│   │   │   └── MapView.jsx           # Leaflet.js interactive geospatial map
│   │   ├── App.jsx           # Main portal shell, header, footer & nav
│   │   ├── App.css           # Government design tokens & responsive CSS
│   │   ├── config.js         # Dynamic environment API URL resolver
│   │   ├── index.css         # CSS reset
│   │   └── main.jsx          # React DOM entrypoint & PWA registration
│   ├── package.json          # Node dependencies & scripts
│   ├── vercel.json           # Vercel SPA routing & cache control
│   └── vite.config.js        # Vite configuration
├── DEPLOYMENT_GUIDE.md       # Step-by-step production deployment instructions
├── render.yaml               # Render Infrastructure as Code (IaC) blueprint
└── README.md                 # Complete project documentation
```

---

## 🌐 Live Deployment & Architecture

| Service | Platform | Live URL |
|---|---|---|
| **Backend API** | Render | `https://nexgengov.onrender.com` |
| **Frontend Web App** | Vercel | `https://nex-gen-gov.vercel.app` |
| **API Docs (Swagger)** | Render | `https://nexgengov.onrender.com/docs` |

---

## 🛠️ Local Development Setup

### 1. Prerequisites
- **Node.js:** v18.0 or higher
- **Python:** v3.10 or higher
- **Git**

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt

# (Optional) Set your Gemini API key:
set GEMINI_API_KEY=your_gemini_api_key_here

# Run backend development server:
uvicorn main:app --reload --port 8000
```
*The backend API will be available at `http://127.0.0.1:8000` (Docs at `http://127.0.0.1:8000/docs`).*

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*The frontend web app will run at `http://localhost:5173`.*

---

## 📑 API Documentation

Interactive Swagger documentation is available at `/docs`.

### Core Endpoints:
- `GET /` & `GET /health` — Health check status probe
- `GET /api/system-status` — Vision engine mode and GIS readiness
- `GET /api/dashboard` — Live national registry metrics, unresolved incidents, hotspots, and SLA stats
- `POST /api/analyze-image` — AI multi-modal computer vision bounding box defect extractor
- `POST /api/incidents` — File new incident, trigger AI triage, and create coordinated task chains
- `POST /api/tasks/{task_id}/status` — Update departmental work order status and verify proof photo
- `POST /api/reset` — Reset database to official seed data

---

## 👥 Authors & Acknowledgements
- **Team GeekSquad** (SIH Problem Statement: SIH_26_093)
- Inspired by Digital India, CPGRAMS, and National Informatics Centre (NIC) open governance design standards.

---
*© 2026 NexGenGov. All rights reserved.*
