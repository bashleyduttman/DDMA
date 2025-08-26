import React, { useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./routes";
import Navbar from "./components/Navbar";
import { FloodProvider } from "./context/FloodContext";

const App = () => {
  const [cities, setCities] = useState([]); // parent state for cities

  return (
    <FloodProvider>
      <Router>
        {/* Pass cities to Navbar */}
        <Navbar cities={cities} />

        {/* Pass setCities to routes that need it */}
        <AppRoutes setCities={setCities} />
      </Router>
    </FloodProvider>
  );
};

export default App;
