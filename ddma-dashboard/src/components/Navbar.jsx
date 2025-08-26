// src/components/Navbar.jsx
import React from "react";
import { Link } from "react-router-dom";
import "../Styles/NavBar.css"

const Navbar = ({ cities }) => {
  return (
    <nav className="navbar">
      {/* Left side - Logo */}
      {/* <Link to="/" className="navbar-logo">
        Dashboard
      </Link> */}

      {/* Center - Cities info */}
      <div className="navbar-cities">
        {cities.map((city, idx) => (
          <span key={idx} className="navbar-city">
            {city}
          </span>
        ))}
      </div>

      {/* Right side - Links */}
      <div className="navbar-links">
        <Link to="/dashboard" className="navbar-link">
          Dashboard
        </Link>
        <Link to="/admin" className="navbar-link">
          Admin
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
