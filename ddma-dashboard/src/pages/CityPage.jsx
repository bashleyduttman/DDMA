import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Circle,
  Marker,
  Popup,
  Polygon,
  Polyline,
  useMap,
  LayerGroup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet.heat";
import "../styles/CityPage.css";

const alertColors = {
  High: "#FF4C4C",
  Medium: "#FFB84C",
  Low: "#4CAF50",
  Critical: "#8B0000",
  Moderate: "#FFA500"
};

const disasterTypes = [
  'Flood',
  'Earthquake',
  'Wildfire',
  'Cyclone',
  'Landslide'
];

const rescueTeamTypes = ['Emergency Response'];

// Enhanced API Service Class with rescue team functionality
class DisasterDataService {
  // Get city coordinates and basic info
  static async getCityCoordinates(cityName) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1&addressdetails=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
          boundingBox: data[0].boundingbox,
          displayName: data[0].display_name,
          osmId: data[0].osm_id,
          osmType: data[0].osm_type
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching city coordinates:', error);
      return null;
    }
  }

  // Get City Boundary from Overpass API
  static async getCityBoundary(cityName, osmId, osmType) {
    try {
      const query = `
        [out:json][timeout:30];
        (
          ${osmType}(${osmId});
        );
        out geom;
      `;
      
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`
      });
      
      const data = await response.json();
      
      if (data.elements && data.elements.length > 0) {
        const element = data.elements[0];
        if (element.geometry) {
          return element.geometry.map(coord => [coord.lat, coord.lon]);
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching city boundary:', error);
      return null;
    }
  }

  // Alternative method to get city boundary using bounding box
  static async getCityBoundaryAlternative(boundingBox) {
    const [south, north, west, east] = boundingBox;
    return [
      [parseFloat(south), parseFloat(west)],
      [parseFloat(south), parseFloat(east)],
      [parseFloat(north), parseFloat(east)],
      [parseFloat(north), parseFloat(west)]
    ];
  }

  // Generate rescue teams for the city (max 3 teams)
  static generateRescueTeams(cityCoords, boundingBox) {
    const [south, north, west, east] = boundingBox.map(Number);
    const teams = [];
    
    // Generate 2-3 rescue teams per city
    const teamCount = Math.floor(Math.random() * 2) + 2; // 2 or 3 teams
    
    for (let i = 0; i < teamCount; i++) {
      // Generate coordinates within city bounds but not at exact center
      const latOffset = (Math.random() - 0.5) * (north - south) * 0.6;
      const lonOffset = (Math.random() - 0.5) * (east - west) * 0.6;
      
      teams.push({
        id: `team-${i + 1}`,
        name: `Emergency Response Team ${i + 1}`,
        type: 'Emergency Response', // Single unified type
        coordinates: [
          cityCoords[0] + latOffset,
          cityCoords[1] + lonOffset
        ],
        status: Math.random() > 0.3 ? 'Available' : 'On Mission',
        personnel: Math.floor(Math.random() * 8) + 4, // 4-12 personnel
        equipment: this.generateTeamEquipment(), // Simplified equipment
        responseTime: Math.floor(Math.random() * 15) + 5, // 5-20 minutes
        specialization: 'Multi-purpose emergency response and disaster management',
        contactNumber: `+91-${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        lastDeployed: this.generateLastDeployedTime(),
        activeRoute: null
      });
    }
    
    return teams;
  }

  // Simplified equipment generation - general emergency equipment
  static generateTeamEquipment() {
    const allEquipment = [
      'Emergency Vehicles',
      'Medical Supplies',
      'Rescue Tools',
      'Communication Systems',
      'Safety Equipment',
      'Transport Vehicles',
      'Emergency Generators',
      'First Aid Kits',
      'Search Equipment',
      'Emergency Shelters'
    ];
    
    // Return 3-4 equipment items randomly
    const equipmentCount = Math.floor(Math.random() * 2) + 3;
    const shuffled = allEquipment.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, equipmentCount);
  }

  static generateLastDeployedTime() {
    const hours = Math.floor(Math.random() * 72) + 1; // 1-72 hours ago
    const date = new Date();
    date.setHours(date.getHours() - hours);
    return date.toISOString().split('T')[0] + ' ' + date.toTimeString().split(' ')[0];
  }

  // Calculate route between rescue team and affected area using OSRM
  static async calculateRoute(teamCoords, areaCenter) {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${teamCoords[1]},${teamCoords[0]};${areaCenter[1]},${areaCenter[0]}?overview=full&geometries=geojson`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]); // Flip for Leaflet
        
        return {
          coordinates: coordinates,
          distance: route.distance, // in meters
          duration: route.duration, // in seconds
          legs: route.legs
        };
      }
    } catch (error) {
      console.error('Error calculating route:', error);
    }
    
    // Fallback: direct line
    return {
      coordinates: [teamCoords, areaCenter],
      distance: this.calculateDirectDistance(teamCoords, areaCenter),
      duration: Math.floor(Math.random() * 1800) + 300, // 5-35 minutes estimate
      legs: []
    };
  }

  // Calculate direct distance between two points (Haversine formula)
  static calculateDirectDistance(coord1, coord2) {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = coord1[0] * Math.PI / 180;
    const lat2Rad = coord2[0] * Math.PI / 180;
    const deltaLatRad = (coord2[0] - coord1[0]) * Math.PI / 180;
    const deltaLonRad = (coord2[1] - coord1[1]) * Math.PI / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Find nearest rescue team to an affected area
  static findNearestRescueTeam(rescueTeams, areaCenter) {
    let nearestTeam = null;
    let shortestDistance = Infinity;
    
    rescueTeams.forEach(team => {
      const distance = this.calculateDirectDistance(team.coordinates, areaCenter);
      if (distance < shortestDistance && team.status === 'Available') {
        shortestDistance = distance;
        nearestTeam = team;
      }
    });
    
    return nearestTeam;
  }

  // Get disaster-prone areas with severity levels and disaster types
  static async getDisasterProneAreas(cityName, boundingBox) {
    try {
      const [south, north, west, east] = boundingBox;
      const query = `
        [out:json][timeout:30];
        (
          way["place"~"^(suburb|neighbourhood|district|quarter|village)$"]["name"~".*",i](${south},${west},${north},${east});
          relation["place"~"^(suburb|neighbourhood|district|quarter|village)$"]["name"~".*",i](${south},${west},${north},${east});
          way["landuse"~"^(residential|commercial|industrial)$"](${south},${west},${north},${east});
          way["natural"~"^(water|wetland|flood_prone)$"](${south},${west},${north},${east});
        );
        out geom;
      `;
      
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`
      });
      
      const data = await response.json();
      
      const areas = [];
      const severityLevels = ['High', 'Medium', 'Low', 'Critical', 'Moderate'];
      
      if (data.elements) {
        const limitedElements = data.elements.slice(0, 15);
        
        for (const element of limitedElements) {
          if (element.tags && (element.tags.name || element.tags.landuse || element.tags.natural) && element.geometry) {
            const severity = severityLevels[Math.floor(Math.random() * severityLevels.length)];
            const disasterInfo = this.getDisasterInfoForArea(element.tags);
            const center = this.calculateCenter(element.geometry);
            
            areas.push({
              id: `area-${element.id}`,
              name: element.tags.name || this.generateAreaName(element.tags),
              type: element.tags.place || element.tags.landuse || element.tags.natural,
              coordinates: element.geometry.map(coord => [coord.lat, coord.lon]),
              osmId: element.id,
              center: center,
              severity: severity,
              population: Math.floor(Math.random() * 100000) + 10000,
              primaryDisaster: disasterInfo.primary,
              secondaryDisasters: disasterInfo.secondary,
              vulnerabilityFactors: this.generateVulnerabilityFactors(element.tags, disasterInfo.primary),
              lastUpdated: new Date().toISOString().split('T')[0],
              riskProbability: this.calculateRiskProbability(disasterInfo.primary, element.tags),
              assignedTeam: null,
              routeInfo: null
            });
          }
        }
      }
      
      return areas;
    } catch (error) {
      console.error('Error fetching disaster-prone areas:', error);
      return [];
    }
  }

  // Get limited disaster info for each area (max 1 primary + 1 secondary)
  static getDisasterInfoForArea(tags) {
    let primary = this.determinePrimaryDisaster(tags);
    
    const otherDisasters = disasterTypes.filter(d => d !== primary);
    const secondary = Math.random() > 0.6 
      ? [otherDisasters[Math.floor(Math.random() * otherDisasters.length)]]
      : [];
    
    return {
      primary: primary,
      secondary: secondary
    };
  }

  // Enhanced disaster determination with geographical logic
  static determinePrimaryDisaster(tags) {
    if (tags.natural === 'water' || tags.natural === 'wetland' || tags.name?.toLowerCase().includes('river')) {
      return 'Flood';
    }
    if (tags.landuse === 'industrial') {
      return Math.random() > 0.5 ? 'Wildfire' : 'Flood';
    }
    if (tags.place === 'village' || tags.landuse === 'residential') {
      const risks = ['Flood', 'Earthquake', 'Landslide'];
      return risks[Math.floor(Math.random() * risks.length)];
    }
    
    return disasterTypes[Math.floor(Math.random() * disasterTypes.length)];
  }

  // Generate area name if not available
  static generateAreaName(tags) {
    if (tags.landuse) {
      return `${tags.landuse.charAt(0).toUpperCase() + tags.landuse.slice(1)} Area`;
    }
    if (tags.natural) {
      return `${tags.natural.charAt(0).toUpperCase() + tags.natural.slice(1)} Zone`;
    }
    return 'Unnamed Area';
  }

  // Generate disaster-specific vulnerability factors (limited to 2-3 factors)
  static generateVulnerabilityFactors(tags, primaryDisaster) {
    const factors = [];
    
    if (primaryDisaster === 'Flood') {
      factors.push('Low-lying terrain', 'Poor drainage system');
    } else if (primaryDisaster === 'Earthquake') {
      factors.push('Old building structures', 'Dense population');
    } else if (primaryDisaster === 'Wildfire') {
      factors.push('Dry vegetation nearby', 'Limited water access');
    } else if (primaryDisaster === 'Cyclone') {
      factors.push('Coastal proximity', 'Weak infrastructure');
    } else if (primaryDisaster === 'Landslide') {
      factors.push('Steep terrain', 'Loose soil conditions');
    }

    const generalFactors = [
      'Limited evacuation routes',
      'Elderly population concentration',
      'Limited emergency services access'
    ];
    
    const randomGeneral = generalFactors[Math.floor(Math.random() * generalFactors.length)];
    factors.push(randomGeneral);
    
    return factors.slice(0, 3);
  }

  static calculateRiskProbability(disasterType, tags) {
    let baseProbability = Math.random() * 0.6 + 0.2;
    
    if (disasterType === 'Flood' && (tags.natural === 'water' || tags.natural === 'wetland')) {
      baseProbability = Math.min(baseProbability + 0.3, 0.9);
    }
    if (disasterType === 'Wildfire' && tags.landuse === 'industrial') {
      baseProbability = Math.min(baseProbability + 0.2, 0.9);
    }
    
    return Math.round(baseProbability * 100);
  }

  static calculateCenter(geometry) {
    if (!geometry || geometry.length === 0) return null;
    
    const latSum = geometry.reduce((sum, coord) => sum + coord.lat, 0);
    const lonSum = geometry.reduce((sum, coord) => sum + coord.lon, 0);
    
    return [latSum / geometry.length, lonSum / geometry.length];
  }
}

// Custom zoom buttons
const CustomZoom = () => {
  const map = useMap();
  return (
    <div className="leaflet-control custom-zoom">
      <button onClick={() => map.setZoom(map.getZoom() + 1)}>+</button>
      <button onClick={() => map.setZoom(map.getZoom() - 1)}>-</button>
    </div>
  );
};

// Navigate back on zoom out - Updated with lower threshold
const CityZoomHandler = () => {
  const navigate = useNavigate();
  const map = useMap();
  map.on("zoomend", () => {
    // Changed from <= 10 to <= 7 to allow more zoom out before navigating back
    if (map.getZoom() <= 7) navigate("/");
  });
  return null;
};

// Black city marker icon
const createCityIcon = () =>
  L.divIcon({
    html: `<div style="
      background-color: black;
      width: 12px;
      height: 12px;
      display: block;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    className: "",
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -8],
  });

// Rescue team marker icon
const createRescueTeamIcon = (status) => {
  const statusColor = status === 'Available' ? '#4CAF50' : '#FF9800';
  
  return L.divIcon({
    html: `<div style="
      background-color: ${statusColor};
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      font-size: 16px;
    ">🚨</div>`, // Single emergency icon for all teams
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
};

const CityPage = () => {
  const { cityName } = useParams();
  const [cityData, setCityData] = useState(null);
  const [cityBoundary, setCityBoundary] = useState(null);
  const [disasterProneAreas, setDisasterProneAreas] = useState([]);
  const [rescueTeams, setRescueTeams] = useState([]);
  const [activeRoutes, setActiveRoutes] = useState([]); // Store active routes
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCityData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Get city coordinates and basic info
        const cityInfo = await DisasterDataService.getCityCoordinates(cityName);
        if (!cityInfo) {
          throw new Error(`Could not find coordinates for ${cityName}`);
        }

        // 2. Get city boundary
        let boundary = null;
        if (cityInfo.osmId && cityInfo.osmType) {
          boundary = await DisasterDataService.getCityBoundary(
            cityName, 
            cityInfo.osmId, 
            cityInfo.osmType
          );
        }
        
        if (!boundary) {
          boundary = await DisasterDataService.getCityBoundaryAlternative(cityInfo.boundingBox);
        }

        // 3. Get disaster-prone areas within the city
        const areas = await DisasterDataService.getDisasterProneAreas(
          cityName, 
          cityInfo.boundingBox
        );

        // 4. Generate rescue teams for the city
        const teams = DisasterDataService.generateRescueTeams(
          [cityInfo.lat, cityInfo.lon],
          cityInfo.boundingBox
        );

        // Set the data
        setCityData({
          coords: [cityInfo.lat, cityInfo.lon],
          boundingBox: cityInfo.boundingBox,
          displayName: cityInfo.displayName
        });

        setCityBoundary(boundary);
        setDisasterProneAreas(areas);
        setRescueTeams(teams);

      } catch (err) {
        console.error('Error loading city data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadCityData();
  }, [cityName]);

  // Handle routing rescue team to affected area
  const handleRouteTeam = async (areaId) => {
    const area = disasterProneAreas.find(a => a.id === areaId);
    if (!area || !area.center) return;

    const nearestTeam = DisasterDataService.findNearestRescueTeam(rescueTeams, area.center);
    if (!nearestTeam) {
      alert('No available rescue teams found!');
      return;
    }

    try {
      // Calculate route
      const routeInfo = await DisasterDataService.calculateRoute(nearestTeam.coordinates, area.center);
      
      // Update team status
      setRescueTeams(prevTeams => 
        prevTeams.map(team => 
          team.id === nearestTeam.id 
            ? { ...team, status: 'On Mission', activeRoute: areaId }
            : team
        )
      );

      // Update area with assigned team info
      setDisasterProneAreas(prevAreas =>
        prevAreas.map(a =>
          a.id === areaId
            ? { ...a, assignedTeam: nearestTeam, routeInfo: routeInfo }
            : a
        )
      );

      // Add route to active routes
      setActiveRoutes(prevRoutes => [
        ...prevRoutes.filter(route => route.areaId !== areaId), // Remove existing route for this area
        {
          areaId: areaId,
          teamId: nearestTeam.id,
          coordinates: routeInfo.coordinates,
          distance: routeInfo.distance,
          duration: routeInfo.duration
        }
      ]);

    } catch (error) {
      console.error('Error routing team:', error);
      alert('Failed to calculate route. Please try again.');
    }
  };

  // Clear route and make team available again
  const handleClearRoute = (areaId) => {
    const area = disasterProneAreas.find(a => a.id === areaId);
    if (!area || !area.assignedTeam) return;

    // Make team available again
    setRescueTeams(prevTeams => 
      prevTeams.map(team => 
        team.id === area.assignedTeam.id 
          ? { ...team, status: 'Available', activeRoute: null }
          : team
      )
    );

    // Clear area assignment
    setDisasterProneAreas(prevAreas =>
      prevAreas.map(a =>
        a.id === areaId
          ? { ...a, assignedTeam: null, routeInfo: null }
          : a
      )
    );

    // Remove route from active routes
    setActiveRoutes(prevRoutes => 
      prevRoutes.filter(route => route.areaId !== areaId)
    );
  };

  if (loading) {
    return (
      <div className="city-page">
        <div className="loading">Loading {cityName} disaster management data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="city-page">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="city-page">
      <div className="city-sidebar">
        <h2>{cityName}</h2>
        <p className="city-description">{cityData?.displayName}</p>
        
        {/* Rescue Teams Section */}
        <div className="rescue-teams-overview">
          <h3>🚨 Emergency Response Teams</h3>
          <div className="teams-count">
            <span className="count">{rescueTeams.length}</span>
            <span className="label">Active Teams</span>
          </div>
          
          <div className="teams-status">
            <div className="status-item">
              <span className="status-dot available"></span>
              <span>Available: {rescueTeams.filter(t => t.status === 'Available').length}</span>
            </div>
            <div className="status-item">
              <span className="status-dot on-mission"></span>
              <span>On Mission: {rescueTeams.filter(t => t.status === 'On Mission').length}</span>
            </div>
          </div>

          <div className="teams-list">
            {rescueTeams.map((team, idx) => (
              <div key={team.id} className="team-card">
                <div className="team-header">
                  <h4>{team.name}</h4>
                  <span className={`team-status ${team.status.toLowerCase().replace(' ', '-')}`}>
                    {team.status}
                  </span>
                </div>
                <div className="team-details">
                  <p><strong>Personnel:</strong> {team.personnel}</p>
                  <p><strong>Response Time:</strong> ~{team.responseTime} min</p>
                  <p><strong>Equipment:</strong> {team.equipment.slice(0, 2).join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="affected-areas-summary">
          <h3>Disaster-Prone Areas</h3>
          <div className="areas-count">
            <span className="count">{disasterProneAreas.length}</span>
            <span className="label">Areas Identified</span>
          </div>
          
          <div className="severity-legend">
            <h4>Risk Levels</h4>
            {Object.entries(alertColors).map(([level, color]) => (
              <div key={level} className="severity-item">
                <span 
                  className="severity-color" 
                  style={{ backgroundColor: color }}
                ></span>
                <span className="severity-name">{level} Risk</span>
              </div>
            ))}
          </div>

          <div className="disaster-types">
            <h4>Disaster Types Monitored</h4>
            <div className="disaster-type-list">
              {disasterTypes.map((disaster, idx) => (
                <span key={idx} className="disaster-type-tag">{disaster}</span>
              ))}
            </div>
          </div>

          {/* Active Routes Summary */}
          <div className="active-routes-summary">
            <h4>🛣️ Active Rescue Routes</h4>
            <div className="routes-count">
              <span className="count">{activeRoutes.length}</span>
              <span className="label">Teams Deployed</span>
            </div>
          </div>
        </div>

        <div className="data-sources">
          <h4>Data Sources:</h4>
          <ul>
            <li>OpenStreetMap Real-time Data</li>
            <li>Overpass API</li>
            <li>OSRM Routing Service</li>
            <li>Disaster Response Database</li>
          </ul>
        </div>
      </div>

      <div className="city-map">
        {cityData && (
          <MapContainer
            center={cityData.coords}
            zoom={11}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            />

            {/* City Boundary */}
            {cityBoundary && (
              <Polygon
                positions={cityBoundary}
                pathOptions={{
                  color: "black",
                  fillColor: "transparent",
                  fillOpacity: 0,
                  weight: 3,
                  dashArray: "10, 5"
                }}
              >
                <Popup>
                  <strong>{cityName}</strong><br />
                  City Administrative Boundary
                </Popup>
              </Polygon>
            )}

            {/* Disaster-Prone Areas with Risk Colors */}
            {disasterProneAreas.map((area, idx) => (
              <Polygon
                key={idx}
                positions={area.coordinates}
                pathOptions={{
                  color: alertColors[area.severity] || alertColors.Medium,
                  fillColor: alertColors[area.severity] || alertColors.Medium,
                  fillOpacity: 0.4,
                  weight: 2,
                }}
              >
                <Popup>
                  <div>
                    <strong>{area.name}</strong><br />
                    <strong>Risk Level:</strong> <span style={{color: alertColors[area.severity]}}>{area.severity}</span><br />
                    <strong>Type:</strong> {area.type}<br />
                    <strong>Population:</strong> ~{area.population.toLocaleString()}<br />
                    <strong>Primary Disaster:</strong> {area.primaryDisaster}<br />
                    <strong>Risk Probability:</strong> {area.riskProbability}%<br />
                    {area.secondaryDisasters.length > 0 && (
                      <>
                        <strong>Secondary Risk:</strong> {area.secondaryDisasters[0]}<br />
                      </>
                    )}
                    <strong>Vulnerability Factors:</strong>
                    <ul style={{margin: '5px 0', paddingLeft: '15px'}}>
                      {area.vulnerabilityFactors.map((factor, i) => (
                        <li key={i} style={{fontSize: '12px'}}>{factor}</li>
                      ))}
                    </ul>
                    <strong>Last Updated:</strong> {area.lastUpdated}<br />
                    
                    {/* Rescue Team Assignment */}
                    {area.assignedTeam ? (
                      <div style={{marginTop: '10px', padding: '5px', backgroundColor: '#e8f5e8', borderRadius: '4px'}}>
                        <strong>🚨 Assigned Team:</strong> {area.assignedTeam.name}<br />
                        <strong>ETA:</strong> {Math.round(area.routeInfo.duration / 60)} minutes<br />
                        <strong>Distance:</strong> {(area.routeInfo.distance / 1000).toFixed(1)} km<br />
                        <button 
                          onClick={() => handleClearRoute(area.id)}
                          style={{
                            marginTop: '5px',
                            padding: '4px 8px',
                            backgroundColor: '#ff4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Clear Route
                        </button>
                      </div>
                    ) : (
                      <div style={{marginTop: '10px'}}>
                        <button 
                          onClick={() => handleRouteTeam(area.id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          🚨 Deploy Nearest Team
                        </button>
                      </div>
                    )}
                  </div>
                </Popup>
              </Polygon>
            ))}

            {/* Rescue Teams Markers */}
            {rescueTeams.map((team, idx) => (
              <Marker 
                key={team.id} 
                position={team.coordinates} 
                icon={createRescueTeamIcon(team.status)}
              >
                <Popup>
                  <div>
                    <strong>{team.name}</strong><br />
                    <strong>Status:</strong> <span style={{
                      color: team.status === 'Available' ? '#4CAF50' : '#FF9800',
                      fontWeight: 'bold'
                    }}>{team.status}</span><br />
                    <strong>Type:</strong> {team.type}<br />
                    <strong>Personnel:</strong> {team.personnel}<br />
                    <strong>Response Time:</strong> ~{team.responseTime} minutes<br />
                    <strong>Equipment:</strong>
                    <ul style={{margin: '5px 0', paddingLeft: '15px'}}>
                      {team.equipment.map((eq, i) => (
                        <li key={i} style={{fontSize: '12px'}}>{eq}</li>
                      ))}
                    </ul>
                    <strong>Specialization:</strong><br />
                    <span style={{fontSize: '12px', fontStyle: 'italic'}}>{team.specialization}</span><br />
                    <strong>Contact:</strong> {team.contactNumber}<br />
                    <strong>Last Deployed:</strong> {team.lastDeployed}<br />
                    
                    {team.activeRoute && (
                      <div style={{marginTop: '8px', padding: '5px', backgroundColor: '#fff3cd', borderRadius: '4px'}}>
                        <strong>🛣️ Currently responding to emergency</strong>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Active Routes */}
            {activeRoutes.map((route, idx) => (
              <Polyline
                key={`${route.teamId}-${route.areaId}`}
                positions={route.coordinates}
                pathOptions={{
                  color: '#FF4444',
                  weight: 4,
                  opacity: 0.8,
                  dashArray: '10, 10'
                }}
              >
                <Popup>
                  <div>
                    <strong>🚨 Emergency Response Route</strong><br />
                    <strong>Distance:</strong> {(route.distance / 1000).toFixed(1)} km<br />
                    <strong>ETA:</strong> {Math.round(route.duration / 60)} minutes<br />
                    <strong>Team ID:</strong> {route.teamId}<br />
                  </div>
                </Popup>
              </Polyline>
            ))}

            {/* City Center Marker (Black) */}
            <Marker position={cityData.coords} icon={createCityIcon()}>
              <Popup>
                <div>
                  <strong>{cityName}</strong><br />
                  <em>City Center</em><br />
                  Coordinates: {cityData.coords[0].toFixed(4)}, {cityData.coords[1].toFixed(4)}<br />
                  <strong>Disaster Management Hub</strong><br />
                  <strong>Active Rescue Teams:</strong> {rescueTeams.length}<br />
                  <strong>Emergency Contacts:</strong><br />
                  📞 Emergency: 112<br />
                  🚒 Fire: 101<br />
                  👮 Police: 100<br />
                  🏥 Medical: 108
                </div>
              </Popup>
            </Marker>

            <CityZoomHandler />
            <CustomZoom />
          </MapContainer>
        )}
      </div>
    </div>
  );
};

export default CityPage;