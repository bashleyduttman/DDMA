 // src/pages/About.jsx
import React from "react";
import Navbar from "../components/Navbar";
import "../styles/About.css";

const About = () => {
  return (
    <div className="about-page">
      <Navbar />
      <div className="about-content">
        <h1>About the Platform</h1>
        <p>
          This Disaster Response Coordination Platform is designed to assist District
          Disaster Management Authorities (DDMAs) by providing a centralized
          dashboard during natural disasters such as floods and cyclones.
        </p>
        <p>
          The system integrates radar satellite data with geo-tagged SOS requests
          from social media, ensuring real-time situational awareness even under
          heavy cloud cover. Relief resources like shelters and hospitals are
          displayed to enable faster and smarter decision-making.
        </p>
        <p>
          Future versions will include AI-powered triage of social media posts and
          automated prioritization of rescue efforts.
        </p>
      </div>
    </div>
  );
};

export default About;
