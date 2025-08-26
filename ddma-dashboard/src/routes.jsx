// src/routes.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import AdminUpload from "./pages/AdminUpload";
import CityPage from "./pages/CityPage";

const AppRoutes = ({ setCities }) => {
  return (
    <Routes>
      <Route path="/dashboard" element={<Dashboard setCities={setCities} />} />
      <Route path="/admin" element={<AdminUpload />} />
      <Route path="/" element={<Dashboard setCities={setCities} />} />
      <Route path="/city/:cityName" element={<CityPage />} />
    </Routes>
  );
};

export default AppRoutes;
