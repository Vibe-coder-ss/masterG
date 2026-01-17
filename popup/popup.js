/**
 * masterG - Popup Script
 * Handles theme selection and user preferences
 * 
 * Privacy Notice: All data is stored locally using Chrome's storage API.
 * No data is ever transmitted to external servers.
 * 
 * Note: CONFIG object is loaded from ../config.js
 */

document.addEventListener('DOMContentLoaded', () => {
  initializePopup();
});

/**
 * Initialize the popup and load saved preferences
 */
async function initializePopup() {
  // Apply configuration to UI elements
  applyConfig();
  
  // Generate color options from config
  generateColorOptions();
  
  // Load saved preferences
  await loadSavedPreferences();
  
  // Setup event listeners
  setupEventListeners();
}

/**
 * Apply configuration values to UI elements
 * All dynamic values come from config.js
 */
function applyConfig() {
  // Set app name
  const appName = document.getElementById('app-name');
  if (appName) {
    appName.textContent = CONFIG.name;
  }
  
  // Set version
  const appVersion = document.getElementById('app-version');
  if (appVersion) {
    appVersion.textContent = `v${CONFIG.version}`;
  }
  
  // Set GitHub link
  const githubLink = document.getElementById('github-link');
  if (githubLink) {
    githubLink.href = CONFIG.github.repo;
  }
  
  // Set copyright with dynamic name
  const copyright = document.getElementById('copyright');
  if (copyright) {
    const year = new Date().getFullYear();
    copyright.textContent = `© ${year} ${CONFIG.name}. All rights reserved.`;
  }
}

/**
 * Generate color options dynamically from config
 */
function generateColorOptions() {
  const colorOptionsContainer = document.getElementById('color-options');
  if (!colorOptionsContainer || !CONFIG.darkColors) return;
  
  // Clear existing options
  colorOptionsContainer.innerHTML = '';
  
  // Generate color option elements
  Object.keys(CONFIG.darkColors).forEach(colorKey => {
    const color = CONFIG.darkColors[colorKey];
    
    const label = document.createElement('label');
    label.className = 'color-option';
    
    label.innerHTML = `
      <input type="radio" name="darkColor" value="${color.id}" id="color-${color.id}">
      <span class="color-card">
        <span class="color-preview" style="background-color: ${color.background}"></span>
        <span class="color-name">${color.name}</span>
      </span>
    `;
    
    colorOptionsContainer.appendChild(label);
  });
}

/**
 * Load saved preferences from local storage
 */
async function loadSavedPreferences() {
  try {
    const result = await chrome.storage.local.get([
      CONFIG.storageKeys.THEME,
      CONFIG.storageKeys.DARK_COLOR
    ]);
    
    const savedTheme = result[CONFIG.storageKeys.THEME] || CONFIG.themes.DEFAULT;
    const savedDarkColor = result[CONFIG.storageKeys.DARK_COLOR] || CONFIG.defaultDarkColor;
    
    // Set the radio button for the saved theme
    const themeRadio = document.querySelector(`input[name="theme"][value="${savedTheme}"]`);
    if (themeRadio) {
      themeRadio.checked = true;
    }
    
    // Set the radio button for the saved dark color
    const colorRadio = document.querySelector(`input[name="darkColor"][value="${savedDarkColor}"]`);
    if (colorRadio) {
      colorRadio.checked = true;
    }
    
    // Show/hide color section based on theme
    toggleColorSection(savedTheme === CONFIG.themes.DARK);
    
    updateStatusBar('Preferences loaded');
  } catch (error) {
    console.error(`${CONFIG.name}: Error loading preferences:`, error);
    updateStatusBar('Using default settings');
  }
}

/**
 * Toggle visibility of color section
 * @param {boolean} show - Whether to show the color section
 */
function toggleColorSection(show) {
  const colorSection = document.getElementById('color-section');
  if (colorSection) {
    colorSection.style.display = show ? 'block' : 'none';
  }
}

/**
 * Setup event listeners for theme and color options
 */
function setupEventListeners() {
  // Theme radio buttons
  const themeRadios = document.querySelectorAll('input[name="theme"]');
  themeRadios.forEach(radio => {
    radio.addEventListener('change', async (e) => {
      const selectedTheme = e.target.value;
      
      // Show/hide color section based on dark theme selection
      toggleColorSection(selectedTheme === CONFIG.themes.DARK);
      
      // Get current dark color
      const result = await chrome.storage.local.get([CONFIG.storageKeys.DARK_COLOR]);
      const darkColor = result[CONFIG.storageKeys.DARK_COLOR] || CONFIG.defaultDarkColor;
      
      await saveAndApplyTheme(selectedTheme, darkColor);
    });
  });
  
  // Color radio buttons
  const colorRadios = document.querySelectorAll('input[name="darkColor"]');
  colorRadios.forEach(radio => {
    radio.addEventListener('change', async (e) => {
      const selectedColor = e.target.value;
      await saveAndApplyDarkColor(selectedColor);
    });
  });
}

/**
 * Save theme preference and apply it to the current tab
 * @param {string} theme - The selected theme ('dark', 'light', or 'default')
 * @param {string} darkColor - The selected dark color scheme
 */
async function saveAndApplyTheme(theme, darkColor) {
  try {
    // Save to local storage (no external data transmission)
    await chrome.storage.local.set({ [CONFIG.storageKeys.THEME]: theme });
    
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab && tab.id) {
      // Send message to content script to apply theme
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'applyTheme',
          theme: theme,
          darkColor: darkColor
        });
      } catch (error) {
        // Content script might not be loaded on some pages (chrome://, etc.)
        console.log(`${CONFIG.name}: Could not apply theme to this page`);
      }
    }
    
    // Also notify background script for any future page loads
    await chrome.runtime.sendMessage({
      action: 'themeChanged',
      theme: theme,
      darkColor: darkColor
    });
    
    updateStatusBar(`${capitalizeFirst(theme)} theme applied`);
    
  } catch (error) {
    console.error(`${CONFIG.name}: Error saving theme:`, error);
    updateStatusBar('Error applying theme');
  }
}

/**
 * Save dark color preference and apply it
 * @param {string} colorId - The selected color scheme ID
 */
async function saveAndApplyDarkColor(colorId) {
  try {
    // Save to local storage
    await chrome.storage.local.set({ [CONFIG.storageKeys.DARK_COLOR]: colorId });
    
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab && tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'applyDarkColor',
          darkColor: colorId
        });
      } catch (error) {
        console.log(`${CONFIG.name}: Could not apply color to this page`);
      }
    }
    
    // Notify background script
    await chrome.runtime.sendMessage({
      action: 'darkColorChanged',
      darkColor: colorId
    });
    
    const colorConfig = CONFIG.darkColors[colorId];
    const colorName = colorConfig ? colorConfig.name : colorId;
    updateStatusBar(`${colorName} color applied`);
    
  } catch (error) {
    console.error(`${CONFIG.name}: Error saving dark color:`, error);
    updateStatusBar('Error applying color');
  }
}

/**
 * Update the status bar with a message
 * @param {string} message - The status message to display
 */
function updateStatusBar(message) {
  const statusText = document.querySelector('.status-text');
  if (statusText) {
    statusText.textContent = message;
  }
}

/**
 * Capitalize the first letter of a string
 * @param {string} str - The string to capitalize
 * @returns {string} The capitalized string
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ===================================
   TIMER FUNCTIONALITY
   =================================== */

// Timer state
let timerInterval = null;
let timerRemaining = 0; // in seconds
let timerTotal = 0;
let timerRunning = false;
let timerPaused = false;

/**
 * Initialize timer functionality
 */
function initTimer() {
  generateTimerPresets();
  setupTimerEventListeners();
  loadTimerState();
}

/**
 * Generate timer preset buttons from config
 */
function generateTimerPresets() {
  const presetsContainer = document.getElementById('timer-presets');
  if (!presetsContainer || !CONFIG.timerPresets) return;
  
  presetsContainer.innerHTML = '';
  
  CONFIG.timerPresets.forEach(preset => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.textContent = preset.label;
    btn.addEventListener('click', () => setTimerPreset(preset.minutes));
    presetsContainer.appendChild(btn);
  });
}

/**
 * Set timer from preset
 * @param {number} minutes - Minutes to set
 */
function setTimerPreset(minutes) {
  if (timerRunning) return;
  
  document.getElementById('timer-hours').value = Math.floor(minutes / 60);
  document.getElementById('timer-minutes').value = minutes % 60;
  document.getElementById('timer-seconds').value = 0;
  
  updateStatusBar(`Timer set to ${minutes} min`);
}

/**
 * Setup timer event listeners
 */
function setupTimerEventListeners() {
  document.getElementById('timer-start')?.addEventListener('click', startTimer);
  document.getElementById('timer-pause')?.addEventListener('click', pauseTimer);
  document.getElementById('timer-resume')?.addEventListener('click', resumeTimer);
  document.getElementById('timer-reset')?.addEventListener('click', resetTimer);
}

/**
 * Start the timer
 */
async function startTimer() {
  const hours = parseInt(document.getElementById('timer-hours').value) || 0;
  const minutes = parseInt(document.getElementById('timer-minutes').value) || 0;
  const seconds = parseInt(document.getElementById('timer-seconds').value) || 0;
  
  timerTotal = (hours * 3600) + (minutes * 60) + seconds;
  timerRemaining = timerTotal;
  
  if (timerTotal <= 0) {
    updateStatusBar('Please set a valid time');
    return;
  }
  
  timerRunning = true;
  timerPaused = false;
  
  // Update UI
  updateTimerUI('running');
  
  // Save state and start background alarm
  await saveTimerState();
  await chrome.runtime.sendMessage({
    action: 'startTimer',
    duration: timerTotal
  });
  
  // Start local interval for display
  startTimerInterval();
  
  updateStatusBar('Timer started');
}

/**
 * Start the timer interval for display updates
 */
function startTimerInterval() {
  if (timerInterval) clearInterval(timerInterval);
  
  timerInterval = setInterval(() => {
    if (timerRemaining > 0) {
      timerRemaining--;
      updateTimerDisplay();
      saveTimerState();
    } else {
      timerComplete();
    }
  }, 1000);
}

/**
 * Pause the timer
 */
async function pauseTimer() {
  timerPaused = true;
  timerRunning = false;
  
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  // Cancel background alarm
  await chrome.runtime.sendMessage({ action: 'pauseTimer' });
  
  updateTimerUI('paused');
  saveTimerState();
  updateStatusBar('Timer paused');
}

/**
 * Resume the timer
 */
async function resumeTimer() {
  timerRunning = true;
  timerPaused = false;
  
  // Restart background alarm
  await chrome.runtime.sendMessage({
    action: 'startTimer',
    duration: timerRemaining
  });
  
  startTimerInterval();
  updateTimerUI('running');
  saveTimerState();
  updateStatusBar('Timer resumed');
}

/**
 * Reset the timer
 */
async function resetTimer() {
  timerRunning = false;
  timerPaused = false;
  timerRemaining = 0;
  timerTotal = 0;
  
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  // Cancel background alarm
  await chrome.runtime.sendMessage({ action: 'resetTimer' });
  
  document.getElementById('timer-time').textContent = '00:00:00';
  document.getElementById('timer-display').classList.remove('running', 'completed');
  
  updateTimerUI('stopped');
  saveTimerState();
  updateStatusBar('Timer reset');
}

/**
 * Timer completed
 */
function timerComplete() {
  timerRunning = false;
  timerPaused = false;
  timerRemaining = 0;
  
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  document.getElementById('timer-display').classList.remove('running');
  document.getElementById('timer-display').classList.add('completed');
  
  // Play alert sound immediately
  playAlertSound();
  
  // Flash the display
  flashTimerDisplay();
  
  updateTimerUI('completed');
  updateStatusBar('⏰ Timer completed!');
}

/**
 * Flash the timer display for visual alert
 */
function flashTimerDisplay() {
  const display = document.getElementById('timer-display');
  if (!display) return;
  
  let flashCount = 0;
  const maxFlashes = 6;
  
  const flashInterval = setInterval(() => {
    if (flashCount >= maxFlashes) {
      clearInterval(flashInterval);
      display.classList.add('completed');
      return;
    }
    
    display.style.borderColor = flashCount % 2 === 0 ? '#ef4444' : '#6366f1';
    flashCount++;
  }, 300);
}

/**
 * Update timer display
 */
function updateTimerDisplay() {
  const hours = Math.floor(timerRemaining / 3600);
  const minutes = Math.floor((timerRemaining % 3600) / 60);
  const seconds = timerRemaining % 60;
  
  const display = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  document.getElementById('timer-time').textContent = display;
}

/**
 * Update timer UI based on state
 * @param {string} state - 'stopped', 'running', 'paused', 'completed'
 */
function updateTimerUI(state) {
  const startBtn = document.getElementById('timer-start');
  const pauseBtn = document.getElementById('timer-pause');
  const resumeBtn = document.getElementById('timer-resume');
  const resetBtn = document.getElementById('timer-reset');
  const inputGroup = document.getElementById('timer-input-group');
  const timerDisplay = document.getElementById('timer-display');
  
  switch (state) {
    case 'stopped':
      startBtn.style.display = 'flex';
      pauseBtn.style.display = 'none';
      resumeBtn.style.display = 'none';
      resetBtn.style.display = 'none';
      inputGroup.style.display = 'block';
      timerDisplay.classList.remove('running', 'completed');
      break;
    case 'running':
      startBtn.style.display = 'none';
      pauseBtn.style.display = 'flex';
      resumeBtn.style.display = 'none';
      resetBtn.style.display = 'flex';
      inputGroup.style.display = 'none';
      timerDisplay.classList.add('running');
      timerDisplay.classList.remove('completed');
      break;
    case 'paused':
      startBtn.style.display = 'none';
      pauseBtn.style.display = 'none';
      resumeBtn.style.display = 'flex';
      resetBtn.style.display = 'flex';
      inputGroup.style.display = 'none';
      timerDisplay.classList.remove('running');
      break;
    case 'completed':
      startBtn.style.display = 'flex';
      pauseBtn.style.display = 'none';
      resumeBtn.style.display = 'none';
      resetBtn.style.display = 'flex';
      inputGroup.style.display = 'block';
      break;
  }
}

/**
 * Save timer state to storage
 */
async function saveTimerState() {
  const state = {
    remaining: timerRemaining,
    total: timerTotal,
    running: timerRunning,
    paused: timerPaused,
    timestamp: Date.now()
  };
  
  await chrome.storage.local.set({ [CONFIG.storageKeys.TIMER_STATE]: state });
}

/**
 * Load timer state from storage
 */
async function loadTimerState() {
  try {
    const result = await chrome.storage.local.get([CONFIG.storageKeys.TIMER_STATE]);
    const state = result[CONFIG.storageKeys.TIMER_STATE];
    
    if (state && (state.running || state.paused)) {
      timerTotal = state.total;
      timerPaused = state.paused;
      
      if (state.running) {
        // Calculate remaining time based on elapsed time
        const elapsed = Math.floor((Date.now() - state.timestamp) / 1000);
        timerRemaining = Math.max(0, state.remaining - elapsed);
        
        if (timerRemaining > 0) {
          timerRunning = true;
          startTimerInterval();
          updateTimerUI('running');
        } else {
          timerComplete();
        }
      } else if (state.paused) {
        timerRemaining = state.remaining;
        updateTimerDisplay();
        updateTimerUI('paused');
      }
    }
  } catch (error) {
    console.log(`${CONFIG.name}: Could not load timer state`);
  }
}

/* ===================================
   STOPWATCH FUNCTIONALITY
   =================================== */

// Stopwatch state
let stopwatchInterval = null;
let stopwatchElapsed = 0; // in milliseconds
let stopwatchRunning = false;
let stopwatchPaused = false;
let stopwatchStartTime = 0;
let lapTimes = [];
let lastLapTime = 0;

/**
 * Initialize stopwatch functionality
 */
function initStopwatch() {
  setupStopwatchEventListeners();
  loadStopwatchState();
}

/**
 * Setup stopwatch event listeners
 */
function setupStopwatchEventListeners() {
  document.getElementById('stopwatch-start')?.addEventListener('click', startStopwatch);
  document.getElementById('stopwatch-pause')?.addEventListener('click', pauseStopwatch);
  document.getElementById('stopwatch-resume')?.addEventListener('click', resumeStopwatch);
  document.getElementById('stopwatch-lap')?.addEventListener('click', recordLap);
  document.getElementById('stopwatch-reset')?.addEventListener('click', resetStopwatch);
}

/**
 * Start the stopwatch
 */
function startStopwatch() {
  stopwatchRunning = true;
  stopwatchPaused = false;
  stopwatchStartTime = Date.now() - stopwatchElapsed;
  
  startStopwatchInterval();
  updateStopwatchUI('running');
  saveStopwatchState();
  updateStatusBar('Stopwatch started');
}

/**
 * Start stopwatch interval
 */
function startStopwatchInterval() {
  if (stopwatchInterval) clearInterval(stopwatchInterval);
  
  stopwatchInterval = setInterval(() => {
    stopwatchElapsed = Date.now() - stopwatchStartTime;
    updateStopwatchDisplay();
  }, 10); // Update every 10ms for smooth display
}

/**
 * Pause the stopwatch
 */
function pauseStopwatch() {
  stopwatchPaused = true;
  stopwatchRunning = false;
  
  if (stopwatchInterval) {
    clearInterval(stopwatchInterval);
    stopwatchInterval = null;
  }
  
  updateStopwatchUI('paused');
  saveStopwatchState();
  updateStatusBar('Stopwatch paused');
}

/**
 * Resume the stopwatch
 */
function resumeStopwatch() {
  stopwatchRunning = true;
  stopwatchPaused = false;
  stopwatchStartTime = Date.now() - stopwatchElapsed;
  
  startStopwatchInterval();
  updateStopwatchUI('running');
  saveStopwatchState();
  updateStatusBar('Stopwatch resumed');
}

/**
 * Record a lap time
 */
function recordLap() {
  const lapTime = stopwatchElapsed;
  const lapDiff = lapTime - lastLapTime;
  
  lapTimes.unshift({
    number: lapTimes.length + 1,
    time: lapTime,
    diff: lapDiff
  });
  
  lastLapTime = lapTime;
  
  updateLapDisplay();
  saveStopwatchState();
  updateStatusBar(`Lap ${lapTimes.length} recorded`);
}

/**
 * Reset the stopwatch
 */
function resetStopwatch() {
  stopwatchRunning = false;
  stopwatchPaused = false;
  stopwatchElapsed = 0;
  stopwatchStartTime = 0;
  lapTimes = [];
  lastLapTime = 0;
  
  if (stopwatchInterval) {
    clearInterval(stopwatchInterval);
    stopwatchInterval = null;
  }
  
  document.getElementById('stopwatch-time').textContent = '00:00:00';
  document.getElementById('stopwatch-ms').textContent = '.000';
  document.getElementById('lap-list').innerHTML = '';
  document.getElementById('lap-times').style.display = 'none';
  
  updateStopwatchUI('stopped');
  saveStopwatchState();
  updateStatusBar('Stopwatch reset');
}

/**
 * Update stopwatch display
 */
function updateStopwatchDisplay() {
  const totalSeconds = Math.floor(stopwatchElapsed / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ms = stopwatchElapsed % 1000;
  
  document.getElementById('stopwatch-time').textContent = 
    `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  document.getElementById('stopwatch-ms').textContent = 
    `.${ms.toString().padStart(3, '0')}`;
}

/**
 * Update lap times display
 */
function updateLapDisplay() {
  const lapList = document.getElementById('lap-list');
  const lapContainer = document.getElementById('lap-times');
  
  if (lapTimes.length > 0) {
    lapContainer.style.display = 'block';
    
    lapList.innerHTML = lapTimes.map(lap => `
      <li class="lap-item">
        <span class="lap-number">Lap ${lap.number}</span>
        <span class="lap-diff">+${formatTime(lap.diff)}</span>
        <span class="lap-time">${formatTime(lap.time)}</span>
      </li>
    `).join('');
  } else {
    lapContainer.style.display = 'none';
  }
}

/**
 * Update stopwatch UI based on state
 * @param {string} state - 'stopped', 'running', 'paused'
 */
function updateStopwatchUI(state) {
  const startBtn = document.getElementById('stopwatch-start');
  const pauseBtn = document.getElementById('stopwatch-pause');
  const resumeBtn = document.getElementById('stopwatch-resume');
  const lapBtn = document.getElementById('stopwatch-lap');
  const resetBtn = document.getElementById('stopwatch-reset');
  
  switch (state) {
    case 'stopped':
      startBtn.style.display = 'flex';
      pauseBtn.style.display = 'none';
      resumeBtn.style.display = 'none';
      lapBtn.style.display = 'none';
      resetBtn.style.display = 'none';
      break;
    case 'running':
      startBtn.style.display = 'none';
      pauseBtn.style.display = 'flex';
      resumeBtn.style.display = 'none';
      lapBtn.style.display = 'flex';
      resetBtn.style.display = 'flex';
      break;
    case 'paused':
      startBtn.style.display = 'none';
      pauseBtn.style.display = 'none';
      resumeBtn.style.display = 'flex';
      lapBtn.style.display = 'none';
      resetBtn.style.display = 'flex';
      break;
  }
}

/**
 * Save stopwatch state to storage
 */
async function saveStopwatchState() {
  const state = {
    elapsed: stopwatchElapsed,
    running: stopwatchRunning,
    paused: stopwatchPaused,
    startTime: stopwatchStartTime,
    lapTimes: lapTimes,
    lastLapTime: lastLapTime,
    timestamp: Date.now()
  };
  
  await chrome.storage.local.set({ [CONFIG.storageKeys.STOPWATCH_STATE]: state });
}

/**
 * Load stopwatch state from storage
 */
async function loadStopwatchState() {
  try {
    const result = await chrome.storage.local.get([CONFIG.storageKeys.STOPWATCH_STATE]);
    const state = result[CONFIG.storageKeys.STOPWATCH_STATE];
    
    if (state) {
      lapTimes = state.lapTimes || [];
      lastLapTime = state.lastLapTime || 0;
      
      if (state.running) {
        // Calculate elapsed time
        const additionalTime = Date.now() - state.timestamp;
        stopwatchElapsed = state.elapsed + additionalTime;
        stopwatchStartTime = Date.now() - stopwatchElapsed;
        stopwatchRunning = true;
        
        startStopwatchInterval();
        updateStopwatchUI('running');
      } else if (state.paused) {
        stopwatchElapsed = state.elapsed;
        stopwatchPaused = true;
        
        updateStopwatchDisplay();
        updateStopwatchUI('paused');
      }
      
      updateLapDisplay();
    }
  } catch (error) {
    console.log(`${CONFIG.name}: Could not load stopwatch state`);
  }
}

/* ===================================
   UTILITY FUNCTIONS
   =================================== */

/**
 * Pad number with leading zero
 * @param {number} num - Number to pad
 * @returns {string} Padded string
 */
function pad(num) {
  return num.toString().padStart(2, '0');
}

/**
 * Format milliseconds to time string
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted time
 */
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;
  
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${milliseconds.toString().padStart(3, '0')}`;
  }
  return `${pad(minutes)}:${pad(seconds)}.${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Play alert sound using Web Audio API
 */
function playAlertSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Resume audio context if suspended (required by some browsers)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    const settings = CONFIG.timer || { alertSoundFrequency: 800, alertSoundDuration: 200, alertBeepCount: 5 };
    const frequency = settings.alertSoundFrequency || 800;
    const beepDuration = (settings.alertSoundDuration || 200) / 1000;
    const beepCount = settings.alertBeepCount || 5;
    
    let time = audioContext.currentTime;
    
    // Play multiple beeps with increasing pitch
    for (let i = 0; i < beepCount; i++) {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Slightly increase pitch for each beep
      oscillator.frequency.value = frequency + (i * 50);
      oscillator.type = 'sine';
      
      // Smooth envelope for pleasant sound
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(0.4, time + 0.02);
      gainNode.gain.setValueAtTime(0.4, time + beepDuration * 0.7);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + beepDuration);
      
      oscillator.start(time);
      oscillator.stop(time + beepDuration);
      
      time += beepDuration + 0.12; // Gap between beeps
    }
    
    // Final longer, higher tone
    const finalOsc = audioContext.createOscillator();
    const finalGain = audioContext.createGain();
    
    finalOsc.connect(finalGain);
    finalGain.connect(audioContext.destination);
    
    finalOsc.frequency.value = frequency * 1.5;
    finalOsc.type = 'sine';
    
    finalGain.gain.setValueAtTime(0, time);
    finalGain.gain.linearRampToValueAtTime(0.5, time + 0.02);
    finalGain.gain.setValueAtTime(0.5, time + 0.3);
    finalGain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
    
    finalOsc.start(time);
    finalOsc.stop(time + 0.5);
    
    console.log(`${CONFIG.name}: Alert sound played`);
    
  } catch (error) {
    console.log(`${CONFIG.name}: Could not play alert sound`, error);
  }
}

// Initialize timer, stopwatch, pomodoro, and clipboard when popup loads
document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure CONFIG is loaded
  setTimeout(() => {
    initPomodoro();
    initTimer();
    initStopwatch();
    initClipboard();
  }, 100);
});

/* ===================================
   CLIPBOARD FUNCTIONALITY
   =================================== */

// Clipboard state
let clipboardHistory = [];
let clipboardSettings = {
  maxItems: 10,
  autoCapture: true
};

/**
 * Initialize clipboard functionality
 */
async function initClipboard() {
  await loadClipboardSettings();
  await loadClipboardHistory();
  setupClipboardEventListeners();
  renderClipboardList();
}

/**
 * Load clipboard settings
 */
async function loadClipboardSettings() {
  try {
    const result = await chrome.storage.local.get([CONFIG.storageKeys.CLIPBOARD_SETTINGS]);
    const saved = result[CONFIG.storageKeys.CLIPBOARD_SETTINGS];
    
    if (saved) {
      clipboardSettings = { ...clipboardSettings, ...saved };
    } else {
      clipboardSettings.maxItems = CONFIG.clipboard?.defaultMaxItems || 10;
      clipboardSettings.autoCapture = CONFIG.clipboard?.autoCapture !== false;
    }
    
    document.getElementById('clipboard-max-items').value = clipboardSettings.maxItems;
    document.getElementById('clipboard-auto-capture').checked = clipboardSettings.autoCapture;
    
    // Update auto-capture status indicator
    updateAutoCaptureStatus();
  } catch (error) {
    console.log(`${CONFIG.name}: Could not load clipboard settings`);
  }
}

/**
 * Update auto-capture status indicator
 */
function updateAutoCaptureStatus() {
  // The status is shown via the toggle in settings
  // Could add a visual indicator if needed
}

/**
 * Load clipboard history
 */
async function loadClipboardHistory() {
  try {
    const result = await chrome.storage.local.get([CONFIG.storageKeys.CLIPBOARD_HISTORY]);
    clipboardHistory = result[CONFIG.storageKeys.CLIPBOARD_HISTORY] || [];
  } catch (error) {
    console.log(`${CONFIG.name}: Could not load clipboard history`);
    clipboardHistory = [];
  }
}

/**
 * Save clipboard history
 */
async function saveClipboardHistory() {
  try {
    await chrome.storage.local.set({
      [CONFIG.storageKeys.CLIPBOARD_HISTORY]: clipboardHistory
    });
  } catch (error) {
    console.log(`${CONFIG.name}: Could not save clipboard history`);
  }
}

/**
 * Save clipboard settings
 */
async function saveClipboardSettings() {
  const maxItems = parseInt(document.getElementById('clipboard-max-items').value) || 10;
  const autoCapture = document.getElementById('clipboard-auto-capture').checked;
  
  clipboardSettings.maxItems = Math.min(Math.max(maxItems, 5), 50);
  clipboardSettings.autoCapture = autoCapture;
  
  document.getElementById('clipboard-max-items').value = clipboardSettings.maxItems;
  
  await chrome.storage.local.set({
    [CONFIG.storageKeys.CLIPBOARD_SETTINGS]: clipboardSettings
  });
  
  // Trim history if needed
  if (clipboardHistory.length > clipboardSettings.maxItems) {
    clipboardHistory = clipboardHistory.slice(0, clipboardSettings.maxItems);
    await saveClipboardHistory();
    renderClipboardList();
  }
  
  const autoCaptureStatus = autoCapture ? 'ON' : 'OFF';
  updateStatusBar(`Settings saved (Auto-capture: ${autoCaptureStatus})`);
  
  document.getElementById('clipboard-settings').style.display = 'none';
  document.getElementById('clipboard-settings-toggle').classList.remove('active');
}

/**
 * Setup clipboard event listeners
 */
function setupClipboardEventListeners() {
  // Settings toggle
  document.getElementById('clipboard-settings-toggle')?.addEventListener('click', () => {
    const settings = document.getElementById('clipboard-settings');
    const toggle = document.getElementById('clipboard-settings-toggle');
    
    if (settings.style.display === 'none') {
      settings.style.display = 'block';
      toggle.classList.add('active');
    } else {
      settings.style.display = 'none';
      toggle.classList.remove('active');
    }
  });
  
  // Save settings
  document.getElementById('save-clipboard-settings')?.addEventListener('click', saveClipboardSettings);
  
  // Capture clipboard
  document.getElementById('clipboard-capture')?.addEventListener('click', captureClipboard);
  
  // Clear all
  document.getElementById('clipboard-clear')?.addEventListener('click', clearClipboardHistory);
  
  // Adjust buttons for clipboard settings
  document.querySelectorAll('.clipboard-settings .adjust-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const action = btn.dataset.action;
      const input = document.getElementById(targetId);
      
      if (input) {
        let value = parseInt(input.value) || 10;
        const min = parseInt(input.min) || 5;
        const max = parseInt(input.max) || 50;
        
        if (action === 'increase') {
          value = Math.min(value + 5, max);
        } else {
          value = Math.max(value - 5, min);
        }
        
        input.value = value;
      }
    });
  });
}

/**
 * Capture current clipboard content
 */
async function captureClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    
    if (!text || text.trim() === '') {
      updateStatusBar('Clipboard is empty');
      return;
    }
    
    // Check for duplicates (don't add if same as most recent)
    if (clipboardHistory.length > 0 && clipboardHistory[0].text === text) {
      updateStatusBar('Already in history');
      return;
    }
    
    // Truncate if too long
    const maxLength = CONFIG.clipboard?.maxItemLength || 5000;
    const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    
    // Add to history
    const newItem = {
      id: Date.now(),
      text: truncatedText,
      timestamp: new Date().toISOString(),
      length: text.length
    };
    
    clipboardHistory.unshift(newItem);
    
    // Trim to max items
    if (clipboardHistory.length > clipboardSettings.maxItems) {
      clipboardHistory = clipboardHistory.slice(0, clipboardSettings.maxItems);
    }
    
    await saveClipboardHistory();
    renderClipboardList();
    
    updateStatusBar('📋 Clipboard captured!');
    
  } catch (error) {
    console.log(`${CONFIG.name}: Could not read clipboard`, error);
    updateStatusBar('Could not read clipboard');
  }
}

/**
 * Copy an item back to clipboard
 * @param {number} id - Item ID
 */
async function copyToClipboard(id) {
  const item = clipboardHistory.find(i => i.id === id);
  if (!item) return;
  
  try {
    await navigator.clipboard.writeText(item.text);
    
    // Visual feedback
    const itemElement = document.querySelector(`[data-clipboard-id="${id}"]`);
    if (itemElement) {
      itemElement.classList.add('copied');
      setTimeout(() => itemElement.classList.remove('copied'), 1000);
    }
    
    updateStatusBar('Copied to clipboard!');
    
  } catch (error) {
    console.log(`${CONFIG.name}: Could not copy to clipboard`, error);
    updateStatusBar('Could not copy');
  }
}

/**
 * Delete an item from history
 * @param {number} id - Item ID
 */
async function deleteClipboardItem(id) {
  clipboardHistory = clipboardHistory.filter(i => i.id !== id);
  await saveClipboardHistory();
  renderClipboardList();
  updateStatusBar('Item deleted');
}

/**
 * Clear all clipboard history
 */
async function clearClipboardHistory() {
  if (clipboardHistory.length === 0) {
    updateStatusBar('History already empty');
    return;
  }
  
  clipboardHistory = [];
  await saveClipboardHistory();
  renderClipboardList();
  updateStatusBar('Clipboard history cleared');
}

/**
 * Render the clipboard list
 */
function renderClipboardList() {
  const listContainer = document.getElementById('clipboard-list');
  const emptyState = document.getElementById('clipboard-empty');
  
  if (!listContainer) return;
  
  // Clear existing items (except empty state)
  const existingItems = listContainer.querySelectorAll('.clipboard-item');
  existingItems.forEach(item => item.remove());
  
  if (clipboardHistory.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  
  if (emptyState) emptyState.style.display = 'none';
  
  clipboardHistory.forEach(item => {
    const itemElement = document.createElement('div');
    itemElement.className = 'clipboard-item';
    itemElement.dataset.clipboardId = item.id;
    
    const timeAgo = getTimeAgo(new Date(item.timestamp));
    const preview = item.text.replace(/\n/g, ' ').substring(0, 100);
    
    // Show source info if available (from auto-capture)
    const sourceInfo = item.source?.title 
      ? `<span class="clipboard-item-source" title="${escapeHtml(item.source.url || '')}">🌐 ${escapeHtml(item.source.title.substring(0, 20))}${item.source.title.length > 20 ? '...' : ''}</span>`
      : '';
    
    itemElement.innerHTML = `
      <div class="clipboard-item-content">
        <div class="clipboard-item-text">${escapeHtml(preview)}${item.text.length > 100 ? '...' : ''}</div>
        <div class="clipboard-item-meta">
          <span class="clipboard-item-time">📅 ${timeAgo}</span>
          <span class="clipboard-item-length">${item.length} chars</span>
          ${sourceInfo}
        </div>
      </div>
      <div class="clipboard-item-actions">
        <button class="clipboard-action-btn copy-btn" title="Copy">📋</button>
        <button class="clipboard-action-btn delete delete-btn" title="Delete">🗑️</button>
      </div>
    `;
    
    // Event listeners
    itemElement.querySelector('.copy-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      copyToClipboard(item.id);
    });
    
    itemElement.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteClipboardItem(item.id);
    });
    
    // Click on item to copy
    itemElement.addEventListener('click', () => copyToClipboard(item.id));
    
    listContainer.appendChild(itemElement);
  });
}

/**
 * Get relative time string
 * @param {Date} date - The date
 * @returns {string} Relative time string
 */
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ===================================
   POMODORO TIMER FUNCTIONALITY
   =================================== */

// Pomodoro state
let pomodoroInterval = null;
let pomodoroRemaining = 0;
let pomodoroRunning = false;
let pomodoroPaused = false;
let pomodoroMode = 'focus'; // 'focus' or 'break'
let pomodoroSessions = 0;
let pomodoroSettings = {
  focusTime: 25,      // In seconds for testing
  breakTime: 5,       // In seconds for testing
  longBreakTime: 15   // In seconds for testing
};
// Flag to indicate if using seconds (for testing) or minutes (production)
const useSeconds = CONFIG.pomodoro?.useSeconds ?? true;

/**
 * Initialize Pomodoro functionality
 */
async function initPomodoro() {
  await loadPomodoroSettings();
  await loadPomodoroState();
  setupPomodoroEventListeners();
  updatePomodoroDisplay();
}

/**
 * Load Pomodoro settings
 */
async function loadPomodoroSettings() {
  try {
    const result = await chrome.storage.local.get([CONFIG.storageKeys.POMODORO_SETTINGS]);
    const saved = result[CONFIG.storageKeys.POMODORO_SETTINGS];
    
    if (saved) {
      pomodoroSettings = { ...pomodoroSettings, ...saved };
    } else {
      // Use defaults from config (now in seconds for testing)
      pomodoroSettings = {
        focusTime: CONFIG.pomodoro.defaultFocusSeconds,
        breakTime: CONFIG.pomodoro.defaultBreakSeconds,
        longBreakTime: CONFIG.pomodoro.defaultLongBreakSeconds
      };
    }
    
    // Update UI inputs
    document.getElementById('focus-time').value = pomodoroSettings.focusTime;
    document.getElementById('break-time').value = pomodoroSettings.breakTime;
    document.getElementById('long-break-time').value = pomodoroSettings.longBreakTime;
    
    // Update unit labels based on mode
    const unitLabel = useSeconds ? 'sec' : 'min';
    document.getElementById('focus-unit').textContent = unitLabel;
    document.getElementById('break-unit').textContent = unitLabel;
    document.getElementById('long-break-unit').textContent = unitLabel;
    
    // Update initial display (no multiplication needed for seconds mode)
    pomodoroRemaining = useSeconds ? pomodoroSettings.focusTime : pomodoroSettings.focusTime * 60;
    
  } catch (error) {
    console.log(`${CONFIG.name}: Could not load Pomodoro settings`);
  }
}

/**
 * Save Pomodoro settings
 */
async function savePomodoroSettings() {
  const focusTime = parseInt(document.getElementById('focus-time').value) || 25;
  const breakTime = parseInt(document.getElementById('break-time').value) || 5;
  const longBreakTime = parseInt(document.getElementById('long-break-time').value) || 15;
  
  // Validate ranges
  pomodoroSettings.focusTime = Math.min(Math.max(focusTime, 1), 120);
  pomodoroSettings.breakTime = Math.min(Math.max(breakTime, 1), 60);
  pomodoroSettings.longBreakTime = Math.min(Math.max(longBreakTime, 1), 60);
  
  // Update inputs with validated values
  document.getElementById('focus-time').value = pomodoroSettings.focusTime;
  document.getElementById('break-time').value = pomodoroSettings.breakTime;
  document.getElementById('long-break-time').value = pomodoroSettings.longBreakTime;
  
  // Save to storage
  await chrome.storage.local.set({
    [CONFIG.storageKeys.POMODORO_SETTINGS]: pomodoroSettings
  });
  
  // Update display if not running (no multiplication for seconds mode)
  if (!pomodoroRunning && !pomodoroPaused) {
    pomodoroRemaining = useSeconds ? pomodoroSettings.focusTime : pomodoroSettings.focusTime * 60;
    updatePomodoroDisplay();
  }
  
  updateStatusBar('Pomodoro settings saved');
  
  // Hide settings panel
  document.getElementById('pomodoro-settings').style.display = 'none';
  document.getElementById('pomodoro-settings-toggle').classList.remove('active');
}

/**
 * Setup Pomodoro event listeners
 */
function setupPomodoroEventListeners() {
  // Settings toggle
  document.getElementById('pomodoro-settings-toggle')?.addEventListener('click', () => {
    const settings = document.getElementById('pomodoro-settings');
    const toggle = document.getElementById('pomodoro-settings-toggle');
    
    if (settings.style.display === 'none') {
      settings.style.display = 'block';
      toggle.classList.add('active');
    } else {
      settings.style.display = 'none';
      toggle.classList.remove('active');
    }
  });
  
  // Save settings button
  document.getElementById('save-pomodoro-settings')?.addEventListener('click', savePomodoroSettings);
  
  // Adjust buttons
  document.querySelectorAll('.adjust-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const action = btn.dataset.action;
      const input = document.getElementById(targetId);
      
      if (input) {
        let value = parseInt(input.value) || 0;
        const min = parseInt(input.min) || 1;
        const max = parseInt(input.max) || 120;
        
        if (action === 'increase') {
          value = Math.min(value + 1, max);
        } else {
          value = Math.max(value - 1, min);
        }
        
        input.value = value;
      }
    });
  });
  
  // Control buttons
  document.getElementById('pomodoro-start')?.addEventListener('click', startPomodoro);
  document.getElementById('pomodoro-pause')?.addEventListener('click', pausePomodoro);
  document.getElementById('pomodoro-resume')?.addEventListener('click', resumePomodoro);
  document.getElementById('pomodoro-skip')?.addEventListener('click', skipPomodoro);
  document.getElementById('pomodoro-reset')?.addEventListener('click', resetPomodoro);
}

/**
 * Start Pomodoro timer (starts with focus mode by default)
 */
async function startPomodoro() {
  await startPomodoroPhase('focus');
}

/**
 * Start a specific Pomodoro phase
 * @param {string} mode - 'focus' or 'break'
 */
async function startPomodoroPhase(mode) {
  pomodoroMode = mode;
  
  // Set the appropriate time based on mode
  if (mode === 'focus') {
    pomodoroRemaining = useSeconds ? pomodoroSettings.focusTime : pomodoroSettings.focusTime * 60;
  } else {
    // Check if it should be a long break
    if (pomodoroSessions >= CONFIG.pomodoro.sessionsBeforeLongBreak) {
      pomodoroRemaining = useSeconds ? pomodoroSettings.longBreakTime : pomodoroSettings.longBreakTime * 60;
      pomodoroSessions = 0; // Reset sessions after long break
    } else {
      pomodoroRemaining = useSeconds ? pomodoroSettings.breakTime : pomodoroSettings.breakTime * 60;
    }
  }
  
  pomodoroRunning = true;
  pomodoroPaused = false;
  
  updatePomodoroDisplay();
  updatePomodoroUI('running');
  startPomodoroInterval();
  
  // Save state and start background alarm
  await savePomodoroState();
  await chrome.runtime.sendMessage({
    action: 'startPomodoro',
    duration: pomodoroRemaining,
    mode: pomodoroMode
  });
  
  updateStatusBar(`${pomodoroMode === 'focus' ? '🎯 Focus' : '☕ Break'} started (${pomodoroRemaining}s)`);
}

/**
 * Start Pomodoro interval
 */
function startPomodoroInterval() {
  if (pomodoroInterval) clearInterval(pomodoroInterval);
  
  pomodoroInterval = setInterval(() => {
    if (pomodoroRemaining > 0) {
      pomodoroRemaining--;
      updatePomodoroDisplay();
      savePomodoroState();
    } else {
      pomodoroComplete();
    }
  }, 1000);
}

/**
 * Pause Pomodoro
 */
async function pausePomodoro() {
  pomodoroPaused = true;
  pomodoroRunning = false;
  
  if (pomodoroInterval) {
    clearInterval(pomodoroInterval);
    pomodoroInterval = null;
  }
  
  await chrome.runtime.sendMessage({ action: 'pausePomodoro' });
  updatePomodoroUI('paused');
  savePomodoroState();
  updateStatusBar('Pomodoro paused');
}

/**
 * Resume Pomodoro
 */
async function resumePomodoro() {
  pomodoroRunning = true;
  pomodoroPaused = false;
  
  startPomodoroInterval();
  
  await chrome.runtime.sendMessage({
    action: 'startPomodoro',
    duration: pomodoroRemaining,
    mode: pomodoroMode
  });
  
  updatePomodoroUI('running');
  savePomodoroState();
  updateStatusBar('Pomodoro resumed');
}

/**
 * Skip current Pomodoro phase
 */
async function skipPomodoro() {
  pomodoroComplete();
}

/**
 * Reset Pomodoro
 */
async function resetPomodoro() {
  pomodoroRunning = false;
  pomodoroPaused = false;
  pomodoroMode = 'focus';
  pomodoroSessions = 0;
  // Use seconds directly for testing
  pomodoroRemaining = useSeconds ? pomodoroSettings.focusTime : pomodoroSettings.focusTime * 60;
  
  if (pomodoroInterval) {
    clearInterval(pomodoroInterval);
    pomodoroInterval = null;
  }
  
  await chrome.runtime.sendMessage({ action: 'resetPomodoro' });
  
  updatePomodoroDisplay();
  updatePomodoroUI('stopped');
  updateSessionDots();
  savePomodoroState();
  updateStatusBar('Pomodoro reset');
}

/**
 * Pomodoro phase completed
 */
async function pomodoroComplete() {
  pomodoroRunning = false;
  pomodoroPaused = false;
  
  if (pomodoroInterval) {
    clearInterval(pomodoroInterval);
    pomodoroInterval = null;
  }
  
  // Play alert sound
  playAlertSound();
  
  if (pomodoroMode === 'focus') {
    // Focus session completed
    pomodoroSessions++;
    updateSessionDots();
    
    // Check if it's time for a long break
    if (pomodoroSessions >= CONFIG.pomodoro.sessionsBeforeLongBreak) {
      pomodoroMode = 'break';
      // Use seconds directly for testing
      pomodoroRemaining = useSeconds ? pomodoroSettings.longBreakTime : pomodoroSettings.longBreakTime * 60;
      pomodoroSessions = 0;
      updateStatusBar('🎉 Long break time!');
    } else {
      pomodoroMode = 'break';
      pomodoroRemaining = useSeconds ? pomodoroSettings.breakTime : pomodoroSettings.breakTime * 60;
      updateStatusBar('☕ Break time!');
    }
  } else {
    // Break completed
    pomodoroMode = 'focus';
    pomodoroRemaining = useSeconds ? pomodoroSettings.focusTime : pomodoroSettings.focusTime * 60;
    updateStatusBar('🎯 Ready to focus!');
  }
  
  updatePomodoroDisplay();
  updatePomodoroUI('completed');
  savePomodoroState();
  
  // Notify background
  await chrome.runtime.sendMessage({
    action: 'pomodoroPhaseComplete',
    mode: pomodoroMode
  });
}

/**
 * Update Pomodoro display
 */
function updatePomodoroDisplay() {
  const minutes = Math.floor(pomodoroRemaining / 60);
  const seconds = pomodoroRemaining % 60;
  
  document.getElementById('pomodoro-time').textContent = 
    `${pad(minutes)}:${pad(seconds)}`;
  
  const display = document.getElementById('pomodoro-display');
  const status = document.getElementById('pomodoro-status');
  
  display.classList.remove('focus', 'break');
  display.classList.add(pomodoroMode);
  
  if (pomodoroMode === 'focus') {
    if (pomodoroRunning) {
      status.textContent = '🎯 Focus Time';
    } else if (pomodoroPaused) {
      status.textContent = '⏸ Paused';
    } else {
      status.textContent = 'Ready to Focus';
    }
  } else {
    if (pomodoroRunning) {
      status.textContent = '☕ Break Time';
    } else if (pomodoroPaused) {
      status.textContent = '⏸ Paused';
    } else {
      status.textContent = 'Break Ready';
    }
  }
}

/**
 * Update session dots display
 */
function updateSessionDots() {
  const dots = document.getElementById('session-dots');
  if (!dots) return;
  
  const totalDots = CONFIG.pomodoro.sessionsBeforeLongBreak;
  let dotsHtml = '';
  
  for (let i = 0; i < totalDots; i++) {
    if (i < pomodoroSessions) {
      dotsHtml += '● ';
    } else {
      dotsHtml += '○ ';
    }
  }
  
  dots.textContent = dotsHtml.trim();
}

/**
 * Update Pomodoro UI state
 */
function updatePomodoroUI(state) {
  const startBtn = document.getElementById('pomodoro-start');
  const pauseBtn = document.getElementById('pomodoro-pause');
  const resumeBtn = document.getElementById('pomodoro-resume');
  const skipBtn = document.getElementById('pomodoro-skip');
  const resetBtn = document.getElementById('pomodoro-reset');
  const display = document.getElementById('pomodoro-display');
  
  // Update start button text based on mode
  if (startBtn) {
    startBtn.innerHTML = pomodoroMode === 'focus' 
      ? '<span class="btn-icon">▶</span> Start Focus'
      : '<span class="btn-icon">▶</span> Start Break';
  }
  
  switch (state) {
    case 'stopped':
      startBtn.style.display = 'flex';
      pauseBtn.style.display = 'none';
      resumeBtn.style.display = 'none';
      skipBtn.style.display = 'none';
      resetBtn.style.display = 'none';
      display.classList.remove('running');
      break;
    case 'running':
      startBtn.style.display = 'none';
      pauseBtn.style.display = 'flex';
      resumeBtn.style.display = 'none';
      skipBtn.style.display = 'flex';
      resetBtn.style.display = 'flex';
      display.classList.add('running');
      break;
    case 'paused':
      startBtn.style.display = 'none';
      pauseBtn.style.display = 'none';
      resumeBtn.style.display = 'flex';
      skipBtn.style.display = 'flex';
      resetBtn.style.display = 'flex';
      display.classList.remove('running');
      break;
    case 'completed':
      startBtn.style.display = 'flex';
      pauseBtn.style.display = 'none';
      resumeBtn.style.display = 'none';
      skipBtn.style.display = 'none';
      resetBtn.style.display = 'flex';
      display.classList.remove('running');
      break;
  }
}

/**
 * Save Pomodoro state
 */
async function savePomodoroState() {
  const state = {
    remaining: pomodoroRemaining,
    running: pomodoroRunning,
    paused: pomodoroPaused,
    mode: pomodoroMode,
    sessions: pomodoroSessions,
    timestamp: Date.now()
  };
  
  await chrome.storage.local.set({ [CONFIG.storageKeys.POMODORO_STATE]: state });
}

/**
 * Load Pomodoro state
 */
async function loadPomodoroState() {
  try {
    const result = await chrome.storage.local.get([CONFIG.storageKeys.POMODORO_STATE]);
    const state = result[CONFIG.storageKeys.POMODORO_STATE];
    
    if (state) {
      pomodoroMode = state.mode || 'focus';
      pomodoroSessions = state.sessions || 0;
      pomodoroPaused = state.paused || false;
      
      updateSessionDots();
      
      if (state.running) {
        // Calculate remaining time
        const elapsed = Math.floor((Date.now() - state.timestamp) / 1000);
        pomodoroRemaining = Math.max(0, state.remaining - elapsed);
        
        if (pomodoroRemaining > 0) {
          pomodoroRunning = true;
          startPomodoroInterval();
          updatePomodoroUI('running');
        } else {
          pomodoroComplete();
        }
      } else if (state.paused) {
        pomodoroRemaining = state.remaining;
        updatePomodoroDisplay();
        updatePomodoroUI('paused');
      } else {
        // Use seconds directly for testing
        const defaultTime = useSeconds ? pomodoroSettings.focusTime : pomodoroSettings.focusTime * 60;
        pomodoroRemaining = state.remaining || defaultTime;
        updatePomodoroDisplay();
      }
    }
  } catch (error) {
    console.log(`${CONFIG.name}: Could not load Pomodoro state`);
  }
}

// Listen for timer/pomodoro completion from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'timerComplete') {
    timerComplete();
    sendResponse({ success: true });
  }
  if (message.action === 'pomodoroComplete') {
    pomodoroComplete();
    sendResponse({ success: true });
  }
  if (message.action === 'startNextPomodoroPhase') {
    // Start the next phase (called from alert popup)
    // message.nextMode tells us which phase to start
    startPomodoroPhase(message.nextMode || 'focus');
    sendResponse({ success: true });
  }
  if (message.action === 'syncPomodoroState') {
    // Sync state from background (when started from alert popup)
    syncPomodoroFromState(message.state);
    sendResponse({ success: true });
  }
  if (message.action === 'clipboardUpdated') {
    // Clipboard was updated from content script
    clipboardHistory = message.history || [];
    renderClipboardList();
    updateStatusBar('📋 Auto-captured!');
    sendResponse({ success: true });
  }
  return true;
});

/**
 * Sync Pomodoro state from background
 * @param {Object} state - The state object from background
 */
function syncPomodoroFromState(state) {
  if (!state) return;
  
  pomodoroMode = state.mode || 'focus';
  pomodoroRemaining = state.remaining || 0;
  pomodoroSessions = state.sessions || 0;
  pomodoroRunning = state.running || false;
  pomodoroPaused = state.paused || false;
  
  if (pomodoroRunning) {
    // Calculate actual remaining time
    const elapsed = Math.floor((Date.now() - state.timestamp) / 1000);
    pomodoroRemaining = Math.max(0, state.remaining - elapsed);
    
    // Start the interval for display updates
    startPomodoroInterval();
    updatePomodoroUI('running');
  }
  
  updatePomodoroDisplay();
  updateSessionDots();
  
  console.log(`${CONFIG.name}: Pomodoro state synced - ${pomodoroMode} mode, ${pomodoroRemaining}s remaining`);
}
