// src/components/AlertsPanel.jsx
import React from "react";
import "../styles/Sidebar.css";

// Example static alerts (will connect to API later)
const alerts = [
  { id: 1, city: "Chennai", alert: "Flood Alert", severity: "High" },
  { id: 2, city: "Kolkata", alert: "Cyclone Alert", severity: "Medium" },
  { id: 3, city: "Mumbai", alert: "Heavy Rainfall", severity: "Low" },
];

const Sidebar = () => {
  return (
    <div className="alerts-panel">
      <h2>City Alerts</h2>
      <ul>
        {alerts.map((item) => (
          <li key={item.id} className={`alert ${item.severity.toLowerCase()}`}>
            <strong>{item.city}</strong> - {item.alert}
            <span className="severity">({item.severity})</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
