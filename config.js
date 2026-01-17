/**
 * masterG - Central Configuration
 * 
 * All configurable values should be defined here.
 * Update this file to change values across the entire extension.
 */

const CONFIG = {
  // Extension Information
  name: 'masterG',
  version: '1.0.0',
  
  // Links - UPDATE THESE TO CHANGE EVERYWHERE
  github: {
    repo: 'https://github.com/Vibe-coder-ss/masterG',
    issues: 'https://github.com/Vibe-coder-ss/masterG/issues',
    discussions: 'https://github.com/Vibe-coder-ss/masterG/discussions'
  },
  
  // Theme Options
  themes: {
    DARK: 'dark',
    LIGHT: 'light',
    DEFAULT: 'default'
  },
  
  // Dark Color Schemes - Users can choose their preferred dark color
  // All text colors are set to high visibility (bright white/light colors)
  darkColors: {
    charcoal: {
      id: 'charcoal',
      name: 'Charcoal',
      emoji: '⚫',
      background: '#121212',
      cardBg: '#1e1e1e',
      text: '#f5f5f5',
      textMuted: '#b0b0b0',
      border: '#333333',
      accent: '#888888'
    },
    midnight: {
      id: 'midnight',
      name: 'Midnight Blue',
      emoji: '🔵',
      background: '#0a1628',
      cardBg: '#152238',
      text: '#f0f4f8',
      textMuted: '#a8c0d8',
      border: '#2a4060',
      accent: '#5c9eff'
    },
    navy: {
      id: 'navy',
      name: 'Navy Purple',
      emoji: '🟣',
      background: '#15152a',
      cardBg: '#202040',
      text: '#f0f0f8',
      textMuted: '#b0b0c8',
      border: '#404060',
      accent: '#8080ff'
    },
    slate: {
      id: 'slate',
      name: 'Dark Slate',
      emoji: '🩶',
      background: '#1a1a1a',
      cardBg: '#262626',
      text: '#f0f0f0',
      textMuted: '#a8a8a8',
      border: '#404040',
      accent: '#6ab0f3'
    },
    forest: {
      id: 'forest',
      name: 'Forest Night',
      emoji: '🌲',
      background: '#0a1810',
      cardBg: '#152820',
      text: '#e8f5e8',
      textMuted: '#a0c8a8',
      border: '#305038',
      accent: '#50d070'
    }
  },
  
  // Default dark color scheme
  defaultDarkColor: 'navy',
  
  // CSS Class Names
  cssClasses: {
    DARK_MODE: 'masterG-dark-mode',
    LIGHT_MODE: 'masterG-light-mode'
  },
  
  // Light background color
  lightBackground: '#ffffff',
  
  // Storage Keys
  storageKeys: {
    THEME: 'theme',
    DARK_COLOR: 'darkColor',
    INSTALLED_AT: 'installedAt',
    VERSION: 'version',
    TIMER_STATE: 'timerState',
    STOPWATCH_STATE: 'stopwatchState',
    POMODORO_STATE: 'pomodoroState',
    POMODORO_SETTINGS: 'pomodoroSettings',
    CLIPBOARD_HISTORY: 'clipboardHistory',
    CLIPBOARD_SETTINGS: 'clipboardSettings'
  },
  
  // Timer & Stopwatch Settings
  timer: {
    defaultMinutes: 5,
    maxMinutes: 999,
    alertSoundFrequency: 800,  // Hz for beep sound
    alertSoundDuration: 200,   // ms per beep
    alertBeepCount: 5          // number of beeps
  },
  
  // Preset timer options (in minutes)
  timerPresets: [
    { label: '1 min', minutes: 1 },
    { label: '5 min', minutes: 5 },
    { label: '10 min', minutes: 10 },
    { label: '15 min', minutes: 15 },
    { label: '25 min', minutes: 25 },
    { label: '30 min', minutes: 30 },
    { label: '45 min', minutes: 45 },
    { label: '60 min', minutes: 60 }
  ],
  
  // Clipboard Settings
  clipboard: {
    defaultMaxItems: 10,
    minItems: 5,
    maxItems: 50,
    maxItemLength: 5000,  // Max characters per item
    autoCapture: true     // Auto-capture on Ctrl/Cmd+C
  },
  
  // Pomodoro Timer Settings
  // NOTE: Using SECONDS for testing (change to minutes for production)
  pomodoro: {
    defaultFocusSeconds: 25,      // 25 seconds for testing (use 25 * 60 for production)
    defaultBreakSeconds: 5,       // 5 seconds for testing (use 5 * 60 for production)
    defaultLongBreakSeconds: 15,  // 15 seconds for testing (use 15 * 60 for production)
    sessionsBeforeLongBreak: 4,
    minSeconds: 1,
    maxFocusSeconds: 120,
    maxBreakSeconds: 60,
    useSeconds: true              // Set to false for production (minutes)
  }
};

// Freeze config to prevent accidental modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.github);
Object.freeze(CONFIG.themes);
Object.freeze(CONFIG.darkColors);
Object.freeze(CONFIG.cssClasses);
Object.freeze(CONFIG.storageKeys);
Object.keys(CONFIG.darkColors).forEach(key => Object.freeze(CONFIG.darkColors[key]));

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
