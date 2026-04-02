import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { HashRouter } from "react-router-dom";

const basename = import.meta.env.BASE_URL;

// App version - increment this to force cache clear
const APP_VERSION = "1.3.0";
const STORED_VERSION = localStorage.getItem("app_version");

// Clear cache if version changed
if (STORED_VERSION !== APP_VERSION) {
  console.log("🔄 New app version detected: ", APP_VERSION);
  // Disabled aggressive clear to prevent user frustration from losing sessions/paths
  // localStorage.clear();
  // sessionStorage.clear();

  // Set new version
  localStorage.setItem("app_version", APP_VERSION);
  console.log("✅ App version updated to", APP_VERSION);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
