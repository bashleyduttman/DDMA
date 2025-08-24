// src/pages/Dashboard.jsx
import React from "react";
import Navbar from "../components/Navbar";
import MapView from "../components/MapView";
import Sidebar from "../components/SideBar";
import "../styles/Dashboard.css";

const Dashboard = () => {
  return (
    <div className="dashboard">
      {/* Top Navbar */}
      {/* <Navbar /> */}

      {/* Main content: Map + Alerts Panel */}
      <div className="dashboard-content">
        <div className="map-section">
          <MapView />
        </div>
        <div className="alerts-section">
          <Sidebar />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
