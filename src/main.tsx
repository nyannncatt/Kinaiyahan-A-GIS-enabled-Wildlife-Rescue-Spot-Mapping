// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "leaflet/dist/leaflet.css";

// High-DPI display compensation: Scale down on high-DPI displays to match PC appearance
// ONLY apply on desktop/laptop screens, NOT on mobile devices
(function applyHighDPIScaling() {
  // Detect if this is a mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 900;
  
  // Only apply scaling on desktop/laptop, not mobile
  if (isMobile) {
    return; // Skip scaling on mobile devices
  }
  
  const devicePixelRatio = window.devicePixelRatio || 1;
  // Detect if this is likely a high-DPI laptop display (devicePixelRatio > 1.25)
  // Scale down by 0.8 (80%) so 100% browser zoom on laptop = 100% on PC
  if (devicePixelRatio > 1.25) {
    const applyScale = () => {
      const root = document.getElementById('root');
      if (root) {
        root.style.transform = 'scale(0.8)';
        root.style.transformOrigin = 'top left';
        // Adjust container dimensions to compensate for scaling
        const scale = 0.8;
        const updateDimensions = () => {
          // Check again if mobile (in case of resize)
          const isMobileNow = window.innerWidth <= 900;
          if (isMobileNow) {
            // Remove scaling on mobile
            root.style.transform = '';
            root.style.width = '';
            root.style.height = '';
            return;
          }
          const width = window.innerWidth / scale;
          const height = window.innerHeight / scale;
          root.style.width = `${width}px`;
          root.style.height = `${height}px`;
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
      }
    };
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyScale);
    } else {
      applyScale();
    }
  }
})();

// Prevent zooming and ensure 100% zoom level (with messaging for other values)
(function preventZoom() {
  // Create or get banner element
  const getBanner = () => {
    let banner = document.getElementById('zoom-banner') as HTMLDivElement | null;
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'zoom-banner';
      document.body.appendChild(banner);
    }
    return banner;
  };

  // Function to detect browser zoom level
  const getZoomLevel = () => {
    const visualViewport = window.visualViewport?.scale;
    if (visualViewport) {
      return Math.round(visualViewport * 100) / 100;
    }
    const zoom1 = window.outerWidth / window.innerWidth;
    const zoom2 = screen.width / window.innerWidth;
    return Math.round(((zoom1 || zoom2 || 1) + Number.EPSILON) * 100) / 100;
  };

  // Function to reset zoom by refreshing viewport
  const resetViewport = () => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no');
    }
  };

  // Update banner based on zoom level
  const updateBanner = () => {
    const zoom = getZoomLevel();
    const banner = getBanner();
    const isApprox = (value: number, target: number) => Math.abs(value - target) < 0.02;

    if (isApprox(zoom, 1)) {
      banner.style.display = 'none';
      return;
    }

    if (isApprox(zoom, 0.9)) {
      banner.textContent = 'Currently at 90% zoom. Site remains usable, but 100% is recommended for the best layout.';
      banner.style.background = 'rgba(56, 142, 60, 0.95)';
      banner.style.display = 'block';
      return;
    }

    banner.textContent = 'For the best experience, please set your browser zoom to 100%. (Tip: press Ctrl + 0)';
    banner.style.background = 'rgba(211, 47, 47, 0.95)';
    banner.style.display = 'block';
  };

  // Prevent zoom gestures (still block explicit attempts)
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

  document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
  });

  document.addEventListener('gesturechange', (e) => {
    e.preventDefault();
  });

  document.addEventListener('gestureend', (e) => {
    e.preventDefault();
  });

  document.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.keyCode === 187 || e.keyCode === 189)) {
      e.preventDefault();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === '0' || e.keyCode === 48)) {
      e.preventDefault();
    }
  });

  window.addEventListener('load', () => {
    resetViewport();
    updateBanner();
  });

  window.addEventListener('resize', () => {
    resetViewport();
    updateBanner();
  });

  window.addEventListener('orientationchange', () => {
    resetViewport();
    updateBanner();
  });

  setInterval(updateBanner, 500);
})();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);