import React, { useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./routes";
import Navbar from "./components/Navbar";

const App = () => {
  const [cities, setCities] = useState([]); // parent state for cities

  return (
    <Router>
      {/* Pass cities to Navbar */}
      <Navbar cities={cities} />

      {/* Pass setCities to routes that need it */}
      <AppRoutes setCities={setCities} />
    </Router>
  );
};

export default App;
