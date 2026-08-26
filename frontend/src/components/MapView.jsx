import React, { useEffect, useRef } from 'react';

const MapView = ({ 
  incidents = [], 
  selectedIncident = null, 
  onSelectIncident = null,
  clickable = false,
  onMapClick = null,
  citizenDraftLocation = null,
  hotspots = []
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef([]);
  const draftMarkerRef = useRef(null);
  const correlationLineRef = useRef(null);
  const hotspotsGroupRef = useRef([]);

  // New Delhi default center
  const defaultCenter = [28.6139, 77.2090];
  const defaultZoom = 17;

  useEffect(() => {
    // Check if Leaflet L is loaded globally
    if (!window.L) {
      console.warn("Leaflet L object not found on window. Map rendering skipped.");
      return;
    }

    const L = window.L;

    // Reset map container DOM node to prevent double-initialization errors
    if (mapContainerRef.current) {
      mapContainerRef.current.innerHTML = "";
      if (mapContainerRef.current._leaflet_id) {
        delete mapContainerRef.current._leaflet_id;
      }
    }

    // Initialize Map
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: true
    });
    
    mapInstanceRef.current = map;

    // Add TileLayer (OpenStreetMap Streets style)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    // Draw Blue Polyline representing the Water Pipeline
    const pipelineCoords = [
      [28.6135, 77.2090],
      [28.6137, 77.2090],
      [28.6139, 77.2090],
      [28.6141, 77.2090],
      [28.6143, 77.2090]
    ];
    
    const pipeline = L.polyline(pipelineCoords, {
      color: '#0F52BA',
      weight: 6,
      opacity: 0.85,
      dashArray: '2, 6'
    }).addTo(map);
    pipeline.bindPopup("Underground Water Main Pipeline (WP-9912)");

    // Draw School Marker (SVG icon)
    L.marker([28.6140, 77.2085], {
      icon: L.divIcon({
        html: `
          <div style="
            background: #002B49; 
            color: #FF9933; 
            border: 1.5px solid #FF9933; 
            border-radius: 4px; 
            padding: 3px 6px; 
            font-size: 8px; 
            font-weight: bold; 
            white-space: nowrap; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.2)
          ">
            GOVT. PRIMARY SCHOOL
          </div>
        `,
        className: 'custom-school-tag',
        iconSize: [110, 20],
        iconAnchor: [55, 10]
      })
    }).addTo(map).bindPopup("Government Primary School (Central Zone)");

    // Add click event for Citizen Selection if clickable
    if (clickable) {
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        if (onMapClick) {
          onMapClick(lat, lng);
        }
      });
    }

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [clickable]);

  // Handle Updates for Incident Markers & Draft pins
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.L) return;

    const L = window.L;

    // Clear previous incident markers
    markersGroupRef.current.forEach(m => map.removeLayer(m));
    markersGroupRef.current = [];

    // Clear previous hotspots
    hotspotsGroupRef.current.forEach(h => map.removeLayer(h));
    hotspotsGroupRef.current = [];

    // Clear correlation line
    if (correlationLineRef.current) {
      map.removeLayer(correlationLineRef.current);
      correlationLineRef.current = null;
    }

    // 1. Draw Active Incident Markers (skip duplicate cases to avoid map clutter)
    incidents.filter(inc => inc.status !== 'duplicate').forEach(inc => {
      const isSelected = selectedIncident && selectedIncident.id === inc.id;
      const isCritical = inc.priority_score >= 80;
      const isResolved = inc.status === 'resolved';
      
      let markerColor = '#FF9933'; // Orange
      if (isCritical) markerColor = '#DC2626'; // Red
      if (isResolved) markerColor = '#138808'; // Green
      
      const pulseHtml = isSelected 
        ? `<div style="position:relative;width:24px;height:24px;">
             <div style="position:absolute;width:24px;height:24px;border-radius:50%;background:${markerColor};opacity:0.3;animation:pulse 1.5s infinite;"></div>
             <div style="position:absolute;width:12px;height:12px;border-radius:50%;background:${markerColor};top:6px;left:6px;border:2px solid #FFF;"></div>
           </div>`
        : `<div style="width:12px;height:12px;border-radius:50%;background:${markerColor};border:2px solid #FFF;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`;

      const marker = L.marker([inc.latitude, inc.longitude], {
        icon: L.divIcon({
          html: pulseHtml,
          className: 'custom-incident-pin',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; font-size: 11px;">
          <strong style="color:#002B49">${inc.category}</strong><br/>
          Priority: <span style="color:${markerColor};font-weight:bold">${inc.priority_score}/100</span><br/>
          Status: <strong>${inc.status.toUpperCase()}</strong><br/>
          Reports: <strong>${inc.reports_count || 1}</strong>
        </div>
      `);

      if (onSelectIncident) {
        marker.on('click', () => {
          onSelectIncident(inc);
        });
      }

      markersGroupRef.current.push(marker);
    });

    // 2. Draw citizen draft pin
    if (draftMarkerRef.current) {
      map.removeLayer(draftMarkerRef.current);
      draftMarkerRef.current = null;
    }

    if (citizenDraftLocation) {
      const draftIconHtml = `
        <svg width="24" height="32" viewBox="0 0 24 32" style="position:absolute;top:-28px;left:-12px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12zm0 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" fill="#0F52BA"/>
        </svg>
      `;
      draftMarkerRef.current = L.marker([citizenDraftLocation.lat, citizenDraftLocation.lng], {
        icon: L.divIcon({
          html: draftIconHtml,
          className: 'custom-draft-pin',
          iconSize: [24, 32],
          iconAnchor: [12, 16]
        })
      }).addTo(map);
      draftMarkerRef.current.bindPopup("Selected Complaint Spot").openPopup();
      
      map.panTo([citizenDraftLocation.lat, citizenDraftLocation.lng]);
    }

    // 3. Draw dashed correlation line if pipeline leak is suspected
    if (selectedIncident && selectedIncident.root_cause_hypothesis && selectedIncident.root_cause_hypothesis.toLowerCase().includes("pipeline")) {
      const startPoint = [selectedIncident.latitude, selectedIncident.longitude];
      const endPoint = [selectedIncident.latitude, 77.2090];
      
      correlationLineRef.current = L.polyline([startPoint, endPoint], {
        color: '#FF9933',
        weight: 3,
        opacity: 0.9,
        dashArray: '5, 8'
      }).addTo(map);
      
      map.setView(startPoint, defaultZoom);
    }

    // 4. Draw Hotspot Overlays
    (hotspots || []).forEach(hs => {
      const circle = L.circle([hs.latitude, hs.longitude], {
        color: '#DC2626',
        fillColor: '#EF4444',
        fillOpacity: 0.2,
        radius: 150.0, // 150 meters
        weight: 1.5,
        dashArray: '4, 4'
      }).addTo(map);
      
      circle.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; font-size: 11px; padding: 4px;">
          <strong style="color:#DC2626">High Recurrence Hotspot Zone</strong><br/>
          Unresolved Cases: <strong>${hs.incident_count} complaints</strong>
        </div>
      `);
      hotspotsGroupRef.current.push(circle);
    });

  }, [incidents, selectedIncident, citizenDraftLocation, hotspots]);

  return (
    <div style={{ position: 'relative', width: '100%', background: '#F8FAFC', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ padding: '8px 16px', background: '#002B49', color: '#FFF', fontSize: '0.8rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', borderBottom: '1.5px solid var(--saffron-orange)' }}>
        <span>LEAFLET.JS GEOSPATIAL MAP OVERLAY</span>
        {clickable && <span style={{ color: '#FF9933' }}>Click anywhere on the map to pin location</span>}
      </div>
      <div ref={mapContainerRef} className="map-container" style={{ height: '400px', width: '100%' }}></div>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default MapView;
