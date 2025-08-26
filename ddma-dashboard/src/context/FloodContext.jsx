import React, { createContext, useState } from "react";

export const FloodContext = createContext();

export const FloodProvider = ({ children }) => {
  const [floodRatio, setFloodRatio] = useState(null);
  return (
    <FloodContext.Provider value={{ floodRatio, setFloodRatio }}>
      {children}
    </FloodContext.Provider>
  );
};