import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { HashRouter } from "react-router-dom";

const basename = import.meta.env.BASE_URL;

// App version - increment this to force cache clear
const APP_VERSION = "1.4.2";
const STORED_VERSION = localStorage.getItem("app_version");

// Clear cache if version changed
if (STORED_VERSION !== APP_VERSION) {
  console.log("🔄 New app version detected: ", APP_VERSION);
  localStorage.setItem("app_version", APP_VERSION);
  
  // Clear any existing reload flags
  sessionStorage.removeItem('chunk_retry_count');
  
  console.log("✅ App version updated to", APP_VERSION);
}

// Global handler for ChunkLoadError (MIME type text/html error)
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // Check if it's a script loading error
    const isScriptError = event.target && (event.target as any).tagName === 'SCRIPT';
    const isChunkError = event.message && (
      event.message.includes('Loading chunk') || 
      event.message.includes('ChunkLoadError') ||
      event.message.includes('Failed to load module') ||
      event.message.includes('Failed to fetch') ||
      event.message.includes('dynamically imported')
    );

    if (isScriptError || isChunkError) {
      console.warn("⚠️ Chunk loading failed. Attempting to refresh app version...", event);
      
      const retryCount = Number(sessionStorage.getItem('chunk_retry_count') || 0);
      if (retryCount < 1) {
        sessionStorage.setItem('chunk_retry_count', (retryCount + 1).toString());
        window.location.reload();
      } else {
        console.error("❌ Multiple chunk load failures detected. Please check your internet connection.");
      }
    }
  }, true);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
