import React, { useState, useContext } from "react";
import axios from "axios";
import { FloodContext } from "../context/FloodContext";
import "../Styles/AdminUpload.css";

const AdminUpload = () => {
  const [files, setFiles] = useState({ before: null, current: null, after: null });
  const [previews, setPreviews] = useState({ before: null, current: null, after: null });
  const [uploading, setUploading] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [error, setError] = useState(null);
  const { setFloodRatio } = useContext(FloodContext);

  const API_URL = "http://127.0.0.1:8000/detect-flood/";

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    setFiles((prev) => ({ ...prev, [type]: file }));

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviews((prev) => ({ ...prev, [type]: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setApiResponse(null);

    if (!files.before || !files.current || !files.after) {
      alert("Please upload all three images!");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("before", files.before);
      formData.append("current", files.current);
      formData.append("after", files.after);

      const response = await axios.post(API_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log(response.data);

      setApiResponse(response.data);
      if (response.data?.flood_ratio !== undefined) {
        setFloodRatio(response.data.flood_ratio);
        sessionStorage.setItem("devprayagFloodRatio", response.data.flood_ratio);
      }
      alert("✅ Images processed successfully!");
    } catch (err) {
      console.error(err);
      let errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      setError(errorMsg);
      alert("❌ Upload failed. Check console for details.");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFiles({ before: null, current: null, after: null });
    setPreviews({ before: null, current: null, after: null });
    setError(null);
    setApiResponse(null);
  };

  return (
    <div className="admin-upload-container">
      <h1 className="admin-upload-title">Admin - Upload Affected Area Images</h1>

      {error && (
        <div className="error-message">
          <strong>❌ Error:</strong>
          <pre style={{ whiteSpace: "pre-wrap" }}>{error}</pre>
        </div>
      )}

      {apiResponse && (
        <div className="success-message">
          <strong>✅ Success!</strong>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(apiResponse, null, 2)}</pre>
        </div>
      )}

      <form onSubmit={handleSubmit} className="admin-upload-form">
        {["before", "current", "after"].map((type) => (
          <div key={type} className="upload-section">
            <label>
              <strong>
                {type === "before"
                  ? "Before Disaster"
                  : type === "current"
                  ? "Current Situation"
                  : "After Disaster"}
              </strong>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, type)}
              disabled={uploading}
            />
            {previews[type] && (
              <div className="admin-preview">
                <img src={previews[type]} alt={`${type} preview`} />
                <p>
                  {files[type]?.name} ({(files[type]?.size / 1024 / 1024).toFixed(2)}MB)
                </p>
              </div>
            )}
          </div>
        ))}

        <div className="form-actions">
          <button type="submit" disabled={uploading}>
            {uploading ? "🔄 Processing..." : "🚀 Upload & Analyze"}
          </button>
          <button type="button" onClick={resetForm} disabled={uploading}>
            Reset Form
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminUpload;
