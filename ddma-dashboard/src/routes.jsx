// src/routes.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import About from "./pages/About";
import CityPage from "./pages/CityPage"
const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/about" element={<About />} />
      <Route path="/city/:cityName" element={<CityPage />} />
    </Routes>
  );
};

export default AppRoutes;
