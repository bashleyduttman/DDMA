// src/components/MapView.jsx
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  CircleMarker,
  Popup,
  useMap,
  useMapEvent,
  WMSTileLayer,
  Polygon,
} from "react-leaflet";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "../styles/MapView.css";
import { FloodContext } from "../context/FloodContext";

const alertColors = {
  High: "#FF4C4C",
  Medium: "#FFB84C",
  Low: "#4CAF50",
  Critical: "#8B0000",
  Moderate: "#FFA500"
};

const alertGradients = {
  High: "radial-gradient(circle, rgba(255,76,76,0.8) 0%, rgba(255,76,76,0.3) 50%, rgba(255,76,76,0.1) 100%)",
  Medium: "radial-gradient(circle, rgba(255,184,76,0.8) 0%, rgba(255,184,76,0.3) 50%, rgba(255,184,76,0.1) 100%)",
  Low: "radial-gradient(circle, rgba(76,175,80,0.8) 0%, rgba(76,175,80,0.3) 50%, rgba(76,175,80,0.1) 100%)",
  Critical: "radial-gradient(circle, rgba(139,0,0,0.9) 0%, rgba(139,0,0,0.4) 50%, rgba(139,0,0,0.1) 100%)",
  Moderate: "radial-gradient(circle, rgba(255,165,0,0.8) 0%, rgba(255,165,0,0.3) 50%, rgba(255,165,0,0.1) 100%)"
};

const adjustColor = (hex, factor) => {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.min(255, Math.max(0, r + factor));
  g = Math.min(255, Math.max(0, g + factor));
  b = Math.min(255, Math.max(0, b + factor));
  return `rgb(${r}, ${g}, ${b})`;
};

// Enhanced Custom Zoom with modern styling
const CustomZoom = () => {
  const map = useMap();
  return (
    <div className="leaflet-control custom-zoom">
      <button 
        className="zoom-btn zoom-in" 
        onClick={() => map.setZoom(map.getZoom() + 1)}
        title="Zoom In"
      >
        <span className="zoom-icon">+</span>
      </button>
      <button 
        className="zoom-btn zoom-out" 
        onClick={() => map.setZoom(map.getZoom() - 1)}
        title="Zoom Out"
      >
        <span className="zoom-icon">−</span>
      </button>
    </div>
  );
};

// Enhanced Zoom Handler with smooth transitions
const ZoomHandler = ({ cities, activeLayer }) => {
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useMapEvent("zoomend", (e) => {
    const map = e.target;
    const zoom = map.getZoom();
    const center = map.getCenter();

    if (zoom >= 12 && !isTransitioning) {
      setIsTransitioning(true);
      let nearestCity = null;
      let minDist = Infinity;
      
      cities.forEach((city) => {
        const dist = Math.sqrt(
          Math.pow(center.lat - city.coords[0], 2) +
          Math.pow(center.lng - city.coords[1], 2)
        );
        if (dist < minDist) {
          minDist = dist;
          nearestCity = city;
        }
      });
      
      if (nearestCity) {
        setTimeout(() => {
          navigate(`/city/${nearestCity.city}`, { 
            state: { 
              cityName: nearestCity.city, 
              areaName: nearestCity.area,
              risk: nearestCity.risk,
              activeLayer // pass the selected map layer
            } 
          });
        }, 300);
      }
    } else if (zoom <= 5) {
      navigate(`/`);
    }
    
    setTimeout(() => setIsTransitioning(false), 500);
  });
  return null;
};

// Enhanced Blinking Marker with ripple effect and improved click handling
const BlinkingMarker = ({ cityData, radiusKm = 5, activeLayer }) => {
  const [pulse, setPulse] = useState(false);
  const [ripple, setRipple] = useState(0);
  const baseColor = alertColors[cityData.risk] || "#999";
  const navigate = useNavigate();

  useEffect(() => {
    const pulseInterval = setInterval(() => setPulse((prev) => !prev), 800);
    const rippleInterval = setInterval(() => setRipple((prev) => (prev + 1) % 3), 1200);
    return () => {
      clearInterval(pulseInterval);
      clearInterval(rippleInterval);
    };
  }, []);

  const borderColor = pulse ? adjustColor(baseColor, 80) : adjustColor(baseColor, -30);
  if (!cityData.coords) return null;

  // Enhanced click handler with event prevention
  const handleClick = (e) => {
    if (e) {
      e.originalEvent?.stopPropagation();
      e.originalEvent?.preventDefault();
    }
    navigate(`/city/${cityData.city}`, { 
      state: { 
        cityName: cityData.city, 
        areaName: cityData.area,
        risk: cityData.risk,
        activeLayer // pass the selected map layer
      } 
    });
  };

  // Shared event handlers object for consistency
  const clickEventHandlers = {
    click: handleClick,
    mousedown: (e) => e.originalEvent?.stopPropagation(),
    mouseup: (e) => e.originalEvent?.stopPropagation()
  };

  return (
    <>
      {/* Main alert radius - clickable */}
      <Circle
        center={cityData.coords}
        radius={radiusKm * 1000}
        pathOptions={{ 
          color: baseColor, 
          weight: 2, 
          fillColor: baseColor, 
          fillOpacity: 0.15,
          dashArray: "5, 10",
          interactive: true // Ensure it's interactive
        }}
        eventHandlers={clickEventHandlers}
        className="alert-radius clickable-marker"
      />
      
      {/* Ripple effects - non-interactive to avoid interference */}
      {[0, 1, 2].map((index) => (
        <Circle
          key={index}
          center={cityData.coords}
          radius={(radiusKm * 1000) + (ripple === index ? 2000 : 0)}
          pathOptions={{
            color: baseColor,
            weight: 1,
            fillColor: "transparent",
            fillOpacity: 0,
            opacity: ripple === index ? 0.6 : 0.2,
            interactive: false // Make ripples non-interactive
          }}
          className={`ripple-${index} ${ripple === index ? 'active' : ''}`}
        />
      ))}
      
      {/* Central marker - clickable */}
      <CircleMarker
        center={cityData.coords}
        radius={15}
        pathOptions={{ 
          color: borderColor, 
          weight: 4, 
          fillColor: baseColor, 
          fillOpacity: 0.8,
          interactive: true // Ensure it's interactive
        }}
        eventHandlers={clickEventHandlers}
        className={`city-marker ${cityData.risk.toLowerCase()} clickable-marker`}
      >
        <Popup className="city-popup" closeOnClick={false}>
          <div className="popup-content">
            <div className="popup-header">
              <h3 className="city-name">{cityData.city}</h3>
              <span className={`risk-badge ${cityData.risk.toLowerCase()}`}>
                {cityData.risk}
              </span>
            </div>
            <div className="popup-body">
              <p className="area-name">📍 {cityData.area}</p>
              <p className="radius-info">🔄 Alert Radius: {radiusKm} km</p>
              <div className="click-hint">
                <button 
                  className="popup-nav-btn"
                  onClick={handleClick}
                  style={{
                    background: baseColor,
                    border: 'none',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginTop: '8px'
                  }}
                >
                  View Details →
                </button>
              </div>
            </div>
          </div>
        </Popup>
      </CircleMarker>
      
      {/* Pulse ring - non-interactive */}
      <CircleMarker
        center={cityData.coords}
        radius={pulse ? 25 : 20}
        pathOptions={{
          color: baseColor,
          weight: 2,
          fillColor: "transparent",
          fillOpacity: 0,
          opacity: pulse ? 0.8 : 0.4,
          interactive: false // Make pulse non-interactive
        }}
        className="pulse-ring"
      />
    </>
  );
};

// Map Legend Component
const MapLegend = () => {
  return (
    <div className="map-legend">
      <div className="legend-header">
        <h4>🚨 Alert Levels</h4>
      </div>
      <div className="legend-items">
        {Object.entries(alertColors).map(([level, color]) => (
          <div key={level} className="legend-item">
            <div 
              className="legend-color" 
              style={{ backgroundColor: color }}
            ></div>
            <span className="legend-label">{level}</span>
          </div>
        ))}
      </div>
      <div className="legend-footer">
        <small>🔍 Click markers to view details</small>
      </div>
    </div>
  );
};

// Map Controls Component
const MapControls = ({ onLayerToggle, activeLayer }) => {
  return (
    <div className="map-controls">
      <div className="control-group">
        <h4>🗺️ Map Layers</h4>
        <button 
          className={`control-btn ${activeLayer === 'standard' ? 'active' : ''}`}
          onClick={() => onLayerToggle('standard')}
        >
          Standard
        </button>
        <button 
          className={`control-btn ${activeLayer === 'satellite' ? 'active' : ''}`}
          onClick={() => onLayerToggle('satellite')}
        >
          Satellite
        </button>
        <button 
          className={`control-btn ${activeLayer === 'terrain' ? 'active' : ''}`}
          onClick={() => onLayerToggle('terrain')}
        >
          Terrain
        </button>
      </div>
    </div>
  );
};

// Loading Component
const MapLoading = () => {
  return (
    <div className="map-loading">
      <div className="loading-spinner">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      <h3>Loading Emergency Data...</h3>
      <p>Fetching real-time alerts and coordinates</p>
    </div>
  );
};

// Toast Alert Component
const FloodToast = ({ floodRatio, onClose }) => {
  if (floodRatio < 0.1 || floodRatio > 0.49) return null;

  // Map severity based on ratio
  let severity = "Low Risk";
  if (floodRatio >= 0.3 && floodRatio <= 0.49) {
    severity = "Mild Risk";
  } else if (floodRatio >= 0.1 && floodRatio < 0.3) {
    severity = "Low Risk";
  }

  return (
    <div className="flood-toast">
      <span>
        ⚠️ Flood Risk Detected! ({severity}, Flood Ratio: {(floodRatio * 100).toFixed(0)}%)
      </span>
      <button className="toast-close" onClick={onClose}>×</button>
    </div>
  );
};

const MapView = () => {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeLayer, setActiveLayer] = useState('standard');
  const mapRef = useRef();
  const { floodRatio, setFloodRatio } = useContext(FloodContext);
  const [showToast, setShowToast] = useState(true);

  // On mount, restore floodRatio from sessionStorage if present
  useEffect(() => {
    const stored = sessionStorage.getItem("devprayagFloodRatio");
    if (stored !== null && !isNaN(Number(stored))) {
      setFloodRatio(Number(stored));
    }
  }, [setFloodRatio]);

  const indiaBounds = [
    [6.4627, 68.1097],
    [35.5133, 97.3956],
  ];

  const tileLayerUrls = {
    standard: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    terrain: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
  };

  const tileLayerAttributions = {
    standard: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    satellite: '&copy; <a href="https://www.esri.com/">Esri</a>',
    terrain: '&copy; <a href="https://opentopomap.org/">OpenTopoMap</a>'
  };

  useEffect(() => {
    // Only Devprayag is dynamic for admin upload
    const staticCities = [
      { city: "Chennai", area: "Marina Beach", risk: "High", coords: [13.0500, 80.2824] },
      { city: "Kolkata", area: "Howrah", risk: "Medium", coords: [22.5958, 88.2636] },
      { city: "Mumbai", area: "Colaba", risk: "Critical", coords: [18.9067, 72.8147] },
      { city: "Navi Mumbai", area: "Vashi", risk: "Low", coords: [19.0707, 73.0000] },
      // { city: "Delhi", area: "Connaught Place", risk: "High", coords: [28.6315, 77.2167] },
      { city: "Bangalore", area: "MG Road", risk: "Moderate", coords: [12.9758, 77.6055] },
      { city: "Hyderabad", area: "Charminar", risk: "Medium", coords: [17.3616, 78.4747] },
      { city: "Pune", area: "Shivaji Nagar", risk: "Low", coords: [18.5308, 73.8478] },
      // Devprayag will be conditionally added below
    ];
    // Only add Devprayag if floodRatio > 0.5
    if (floodRatio !== null && floodRatio > 0.5) {
      staticCities.push({
        city: "Devprayag",
        area: "Sangam",
        risk: "High",
        coords: [30.1461, 78.5986]
      });
    }
    setCities(staticCities);
    setLoading(false);
  }, [floodRatio]); // re-run when floodRatio changes

  useEffect(() => {
    if (floodRatio >= 0.1 && floodRatio <= 0.49) setShowToast(true);
    else setShowToast(false);
  }, [floodRatio]);

  const handleLayerToggle = (layerType) => {
    setActiveLayer(layerType);
  };

  // Always show all markers except Devprayag, which is conditional above
  const shouldShowMarkers = true;

  if (loading) {
    return <MapLoading />;
  }

  return (
    <div className="map-container">
      {/* Toast Alert */}
      {showToast && floodRatio >= 0.1 && floodRatio <= 0.49 && (
        <FloodToast floodRatio={floodRatio} onClose={() => setShowToast(false)} />
      )}

      {/* Header */}
      <div className="map-header">
        <div className="header-content">
          <h1 className="map-title">
            🚨 AAPDA - Automated Aid &amp; Proactive Disaster Assistance
          </h1>
          <p className="map-subtitle">
            Real-time monitoring of emergency situations across India
          </p>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-number">{cities.length}</span>
            <span className="stat-label">Active Alerts</span>
          </div>
        </div>
      </div>

      <MapContainer
        ref={mapRef}
        center={[20.5937, 78.9629]}
        zoom={5}
        minZoom={4}
        maxZoom={18}
        maxBounds={indiaBounds}
        scrollWheelZoom={true}
        zoomControl={false}
        style={{ height: "calc(100vh - 80px)", width: "100%" }}
        className="main-map"
      >
        <TileLayer
          url={tileLayerUrls[activeLayer]}
          attribution={tileLayerAttributions[activeLayer]}
        />

        {shouldShowMarkers &&
          cities.map((city) => (
            <BlinkingMarker 
              key={`${city.city}-${city.area}`} 
              cityData={city} 
              radiusKm={city.risk === 'Critical' ? 8 : city.risk === 'High' ? 6 : 4}
              activeLayer={activeLayer}
            />
          ))
        }

        <ZoomHandler cities={cities} activeLayer={activeLayer} />
        <CustomZoom />
      </MapContainer>

      <MapLegend />
      <MapControls 
        onLayerToggle={handleLayerToggle} 
        activeLayer={activeLayer} 
      />
    </div>
  );
};

export default MapView;