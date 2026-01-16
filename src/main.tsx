import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";

const basename = import.meta.env.BASE_URL;

// App version - increment this to force cache clear
const APP_VERSION = "1.1.0";
const STORED_VERSION = localStorage.getItem("app_version");

// Clear cache if version changed
if (STORED_VERSION !== APP_VERSION) {
  console.log("🔄 New app version detected, performing full clear...");
  console.log("Old version:", STORED_VERSION, "New version:", APP_VERSION);

  // Clear absolutely everything to ensure no stale sessions from old projects
  localStorage.clear();
  sessionStorage.clear();

  // Set new version
  localStorage.setItem("app_version", APP_VERSION);
  console.log("✅ Full cache and session cleared");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
