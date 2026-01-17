/**
 * masterG - Content Script
 * Applies theme changes to web pages
 * 
 * Privacy Notice: This script runs locally in your browser.
 * No data is collected, tracked, or transmitted to any external servers.
 * 
 * Note: Uses configuration from config.js (injected before this script)
 */

(function() {
  'use strict';

  // Theme class names - using CONFIG if available, fallback for safety
  const THEME_CLASSES = (typeof CONFIG !== 'undefined' && CONFIG.cssClasses) ? {
    DARK: CONFIG.cssClasses.DARK_MODE,
    LIGHT: CONFIG.cssClasses.LIGHT_MODE
  } : {
    DARK: 'masterG-dark-mode',
    LIGHT: 'masterG-light-mode'
  };

  // Theme values
  const THEMES = (typeof CONFIG !== 'undefined' && CONFIG.themes) ? CONFIG.themes : {
    DARK: 'dark',
    LIGHT: 'light',
    DEFAULT: 'default'
  };

  // Dark color schemes
  const DARK_COLORS = (typeof CONFIG !== 'undefined' && CONFIG.darkColors) ? CONFIG.darkColors : {
    navy: {
      id: 'navy',
      background: '#1a1a2e',
      cardBg: '#252542',
      text: '#d1d5db',
      textMuted: '#9ca3af',
      border: '#3f3f5a',
      accent: '#6366f1'
    }
  };

  // Default dark color
  const DEFAULT_DARK_COLOR = (typeof CONFIG !== 'undefined') ? CONFIG.defaultDarkColor : 'navy';

  // Light background
  const LIGHT_BACKGROUND = (typeof CONFIG !== 'undefined') ? CONFIG.lightBackground : '#ffffff';

  // Storage keys
  const STORAGE_KEYS = (typeof CONFIG !== 'undefined' && CONFIG.storageKeys) ? CONFIG.storageKeys : {
    THEME: 'theme',
    DARK_COLOR: 'darkColor'
  };

  // App name for logging
  const APP_NAME = (typeof CONFIG !== 'undefined') ? CONFIG.name : 'masterG';

  // Store current state
  let currentTheme = THEMES.DEFAULT;
  let currentDarkColor = DEFAULT_DARK_COLOR;

  /**
   * Initialize the content script
   */
  async function init() {
    // Apply theme immediately to prevent flash
    await loadAndApplyTheme();

    // Listen for theme change messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'applyTheme') {
        currentDarkColor = message.darkColor || currentDarkColor;
        applyTheme(message.theme);
        sendResponse({ success: true });
      } else if (message.action === 'applyDarkColor') {
        currentDarkColor = message.darkColor;
        if (currentTheme === THEMES.DARK) {
          applyDarkColorScheme(message.darkColor);
        }
        sendResponse({ success: true });
      }
      return true;
    });

    // Re-apply theme when body loads (for SPAs and dynamic pages)
    observeBodyChanges();
  }

  /**
   * Load saved theme and apply it
   */
  async function loadAndApplyTheme() {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEYS.THEME, STORAGE_KEYS.DARK_COLOR]);
      const savedTheme = result[STORAGE_KEYS.THEME] || THEMES.DEFAULT;
      currentDarkColor = result[STORAGE_KEYS.DARK_COLOR] || DEFAULT_DARK_COLOR;
      applyTheme(savedTheme);
    } catch (error) {
      console.log(`${APP_NAME}: Could not load theme preference`);
    }
  }

  /**
   * Apply the selected theme to the page
   * @param {string} theme - The theme to apply ('dark', 'light', or 'default')
   */
  function applyTheme(theme) {
    currentTheme = theme;

    // Remove any existing masterG theme classes from both html and body
    document.documentElement.classList.remove(THEME_CLASSES.DARK, THEME_CLASSES.LIGHT);
    
    if (document.body) {
      document.body.classList.remove(THEME_CLASSES.DARK, THEME_CLASSES.LIGHT);
    }

    // Remove any existing color scheme CSS variables
    removeDarkColorVariables();

    switch (theme) {
      case THEMES.DARK:
        document.documentElement.classList.add(THEME_CLASSES.DARK);
        if (document.body) {
          document.body.classList.add(THEME_CLASSES.DARK);
        }
        // Apply the selected dark color scheme
        applyDarkColorScheme(currentDarkColor);
        setColorScheme('dark');
        break;

      case THEMES.LIGHT:
        document.documentElement.classList.add(THEME_CLASSES.LIGHT);
        if (document.body) {
          document.body.classList.add(THEME_CLASSES.LIGHT);
        }
        setMetaThemeColor(LIGHT_BACKGROUND);
        setColorScheme('light');
        break;

      case THEMES.DEFAULT:
      default:
        // Remove forced themes and let the website use its default styling
        removeMetaThemeColor();
        removeColorScheme();
        break;
    }

    // Force repaint to ensure styles are applied
    forceRepaint();

    console.log(`${APP_NAME}: ${theme} theme applied`);
  }

  /**
   * Apply dark color scheme by setting CSS variables
   * @param {string} colorId - The color scheme ID
   */
  function applyDarkColorScheme(colorId) {
    const colorScheme = DARK_COLORS[colorId] || DARK_COLORS[DEFAULT_DARK_COLOR];
    
    if (!colorScheme) {
      console.log(`${APP_NAME}: Color scheme not found: ${colorId}`);
      return;
    }

    // Set CSS custom properties on the document root
    const root = document.documentElement;
    root.style.setProperty('--masterG-bg', colorScheme.background);
    root.style.setProperty('--masterG-card-bg', colorScheme.cardBg);
    root.style.setProperty('--masterG-text', colorScheme.text);
    root.style.setProperty('--masterG-text-muted', colorScheme.textMuted);
    root.style.setProperty('--masterG-border', colorScheme.border);
    root.style.setProperty('--masterG-accent', colorScheme.accent);

    // Update meta theme color
    setMetaThemeColor(colorScheme.background);

    console.log(`${APP_NAME}: Applied ${colorScheme.name || colorId} color scheme`);
  }

  /**
   * Remove dark color CSS variables
   */
  function removeDarkColorVariables() {
    const root = document.documentElement;
    root.style.removeProperty('--masterG-bg');
    root.style.removeProperty('--masterG-card-bg');
    root.style.removeProperty('--masterG-text');
    root.style.removeProperty('--masterG-text-muted');
    root.style.removeProperty('--masterG-border');
    root.style.removeProperty('--masterG-accent');
  }

  /**
   * Force a repaint of the page
   */
  function forceRepaint() {
    // Trigger a small style change to force repaint
    document.documentElement.style.display = 'none';
    document.documentElement.offsetHeight; // Trigger reflow
    document.documentElement.style.display = '';
  }

  /**
   * Set the color-scheme property
   * @param {string} scheme - 'dark' or 'light'
   */
  function setColorScheme(scheme) {
    document.documentElement.style.setProperty('color-scheme', scheme, 'important');
  }

  /**
   * Remove color-scheme property
   */
  function removeColorScheme() {
    document.documentElement.style.removeProperty('color-scheme');
  }

  /**
   * Set the meta theme-color for browser UI
   * @param {string} color - The color to set
   */
  function setMetaThemeColor(color) {
    let metaThemeColor = document.querySelector('meta[name="theme-color"][data-masterG]');
    
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      metaThemeColor.setAttribute('data-masterG', 'true');
      if (document.head) {
        document.head.appendChild(metaThemeColor);
      }
    }
    
    metaThemeColor.content = color;
  }

  /**
   * Remove the masterG meta theme-color
   */
  function removeMetaThemeColor() {
    const metaThemeColor = document.querySelector('meta[name="theme-color"][data-masterG]');
    if (metaThemeColor) {
      metaThemeColor.remove();
    }
  }

  /**
   * Observe body changes for SPA support
   * Re-applies theme when body content changes significantly
   */
  function observeBodyChanges() {
    // Wait for body to be available
    if (!document.body) {
      const observer = new MutationObserver((mutations, obs) => {
        if (document.body) {
          obs.disconnect();
          applyThemeToBody();
          setupBodyObserver();
        }
      });
      observer.observe(document.documentElement, { childList: true });
    } else {
      setupBodyObserver();
    }
  }

  /**
   * Apply theme class to body element
   */
  function applyThemeToBody() {
    if (document.body && currentTheme !== THEMES.DEFAULT) {
      const themeClass = currentTheme === THEMES.DARK ? THEME_CLASSES.DARK : THEME_CLASSES.LIGHT;
      if (!document.body.classList.contains(themeClass)) {
        document.body.classList.add(themeClass);
      }
    }
  }

  /**
   * Setup observer for body attribute changes
   */
  function setupBodyObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          // Re-apply our theme class if it was removed
          applyThemeToBody();
        }
      });
    });

    if (document.body) {
      observer.observe(document.body, { 
        attributes: true,
        attributeFilter: ['class']
      });
    }
  }

  // Initialize immediately - don't wait for DOMContentLoaded
  // This helps prevent flash of unstyled content
  init();

  // Also handle DOMContentLoaded for body access
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applyThemeToBody();
    });
  }

  // Listen for storage changes to sync across tabs
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      // Handle theme change
      if (changes[STORAGE_KEYS.THEME]) {
        applyTheme(changes[STORAGE_KEYS.THEME].newValue || THEMES.DEFAULT);
      }
      
      // Handle dark color change
      if (changes[STORAGE_KEYS.DARK_COLOR]) {
        currentDarkColor = changes[STORAGE_KEYS.DARK_COLOR].newValue || DEFAULT_DARK_COLOR;
        if (currentTheme === THEMES.DARK) {
          applyDarkColorScheme(currentDarkColor);
        }
      }
    }
  });

})();
