// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "leaflet/dist/leaflet.css";

// High-DPI display compensation: DISABLED
// The transform scale approach was breaking click events, scroll detection, and auto-scroll functionality
// Users on high-DPI displays should adjust their browser zoom manually if needed
// (function applyHighDPIScaling() {
//   // DISABLED - was causing issues with:
//   // 1. Side menu tab clicks not working
//   // 2. Auto-scroll navigation broken
//   // 3. Scroll position tracking incorrect
//   // 4. getBoundingClientRect() calculations off
// })();

// Suppress native browser tooltips and use custom CSS tooltips instead
(function suppressNativeTooltips() {
  // Store original title attributes in data attribute
  document.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement;
    if (target) {
      // Check if target is a button, link, or has button role
      const isButton = target.tagName === 'BUTTON' || target.tagName === 'A' || 
                       (target.hasAttribute('role') && target.getAttribute('role') === 'button') ||
                       target.classList.contains('MuiButton-root') || 
                       target.classList.contains('MuiIconButton-root');
      
      // Check if target is a span wrapper with title (for disabled buttons)
      const isSpanWrapper = target.tagName === 'SPAN' && target.hasAttribute('title');
      
      // Check if target is inside MUI TablePagination (remove tooltips from pagination buttons)
      const isPaginationButton = target.closest('.MuiTablePagination-root') && 
                                 (target.tagName === 'BUTTON' || target.classList.contains('MuiIconButton-root'));
      
      if (isPaginationButton) {
        // Remove title attribute from pagination buttons to prevent any tooltips
        target.removeAttribute('title');
        target.removeAttribute('data-tooltip');
      } else if (isButton || isSpanWrapper) {
        const title = target.getAttribute('title');
        if (title) {
          target.setAttribute('data-tooltip', title);
          target.removeAttribute('title');
        }
      }
    }
  }, true);
  
  // Restore title on mouseout for accessibility (but not for pagination buttons)
  document.addEventListener('mouseout', (e) => {
    const target = e.target as HTMLElement;
    if (target && target.hasAttribute('data-tooltip')) {
      // Don't restore title for pagination buttons
      const isPaginationButton = target.closest('.MuiTablePagination-root') && 
                                 (target.tagName === 'BUTTON' || target.classList.contains('MuiIconButton-root'));
      
      if (!isPaginationButton) {
        const tooltip = target.getAttribute('data-tooltip');
        if (tooltip) {
          target.setAttribute('title', tooltip);
          target.removeAttribute('data-tooltip');
        }
      }
    }
  }, true);
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