/**
 * masterG - Background Service Worker
 * Handles extension lifecycle and tab management
 * 
 * Privacy Notice: This extension operates entirely locally.
 * - No data is collected or transmitted to external servers
 * - No user activity is tracked
 * - All preferences are stored locally using Chrome's storage API
 * 
 * Note: CONFIG is imported from config.js
 */

// Import config
importScripts('../config.js');

// Use CONFIG values with fallbacks
const APP_NAME = (typeof CONFIG !== 'undefined') ? CONFIG.name : 'masterG';
const THEMES = (typeof CONFIG !== 'undefined' && CONFIG.themes) ? CONFIG.themes : { DEFAULT: 'default' };
const STORAGE_KEYS = (typeof CONFIG !== 'undefined' && CONFIG.storageKeys) ? CONFIG.storageKeys : {
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
};

// Extension installation handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default theme on first install
    chrome.storage.local.set({ 
      [STORAGE_KEYS.THEME]: THEMES.DEFAULT,
      [STORAGE_KEYS.INSTALLED_AT]: new Date().toISOString(),
      [STORAGE_KEYS.VERSION]: chrome.runtime.getManifest().version
    });
    
    console.log(`${APP_NAME}: Extension installed successfully!`);
  } else if (details.reason === 'update') {
    console.log(`${APP_NAME}: Extension updated to version`, chrome.runtime.getManifest().version);
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'themeChanged') {
    // When theme changes, notify all tabs
    notifyAllTabs(message.theme, message.darkColor);
    sendResponse({ success: true });
  } else if (message.action === 'darkColorChanged') {
    // When dark color changes, notify all tabs
    notifyAllTabsDarkColor(message.darkColor);
    sendResponse({ success: true });
  }
  return true;
});

/**
 * Notify all tabs about theme change
 * @param {string} theme - The new theme
 * @param {string} darkColor - The dark color scheme
 */
async function notifyAllTabs(theme, darkColor) {
  try {
    const tabs = await chrome.tabs.query({});
    
    for (const tab of tabs) {
      // Only send to valid tabs (not chrome:// pages, etc.)
      if (tab.id && tab.url && !tab.url.startsWith('chrome://')) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'applyTheme',
            theme: theme,
            darkColor: darkColor
          });
        } catch (error) {
          // Tab might not have content script loaded, that's okay
        }
      }
    }
  } catch (error) {
    console.log(`${APP_NAME}: Error notifying tabs:`, error);
  }
}

/**
 * Notify all tabs about dark color change
 * @param {string} darkColor - The dark color scheme
 */
async function notifyAllTabsDarkColor(darkColor) {
  try {
    const tabs = await chrome.tabs.query({});
    
    for (const tab of tabs) {
      if (tab.id && tab.url && !tab.url.startsWith('chrome://')) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'applyDarkColor',
            darkColor: darkColor
          });
        } catch (error) {
          // Tab might not have content script loaded
        }
      }
    }
  } catch (error) {
    console.log(`${APP_NAME}: Error notifying tabs about color:`, error);
  }
}

// Handle tab updates (new page loads)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // When a page finishes loading, apply the saved theme
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEYS.THEME, STORAGE_KEYS.DARK_COLOR]);
      const theme = result[STORAGE_KEYS.THEME] || THEMES.DEFAULT;
      const darkColor = result[STORAGE_KEYS.DARK_COLOR] || (typeof CONFIG !== 'undefined' ? CONFIG.defaultDarkColor : 'navy');
      
      // Only send if not default (to avoid unnecessary messages)
      if (theme !== THEMES.DEFAULT) {
        try {
          await chrome.tabs.sendMessage(tabId, {
            action: 'applyTheme',
            theme: theme,
            darkColor: darkColor
          });
        } catch (error) {
          // Content script might not be ready yet
        }
      }
    } catch (error) {
      console.log(`${APP_NAME}: Could not apply theme to new tab`);
    }
  }
});

/* ===================================
   TIMER & POMODORO ALARM HANDLING
   =================================== */

// Alarm names
const TIMER_ALARM_NAME = 'masterG-timer-alarm';
const POMODORO_ALARM_NAME = 'masterG-pomodoro-alarm';

// Track current Pomodoro mode
let currentPomodoroMode = 'focus';

// Timeout IDs for short timers (Chrome alarms have ~30 sec minimum)
let timerTimeout = null;
let pomodoroTimeout = null;

// Track if offscreen document exists
let offscreenDocumentCreated = false;

// Listen for timer-related messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle async operations properly
  (async () => {
    switch (message.action) {
      // Timer actions
      case 'startTimer':
        await startTimerAlarm(message.duration);
        sendResponse({ success: true });
        break;
      case 'pauseTimer':
      case 'resetTimer':
        await cancelTimerAlarm();
        sendResponse({ success: true });
        break;
      
      // Pomodoro actions
      case 'startPomodoro':
        currentPomodoroMode = message.mode || 'focus';
        await startPomodoroAlarm(message.duration);
        sendResponse({ success: true });
        break;
      case 'pausePomodoro':
      case 'resetPomodoro':
        await cancelPomodoroAlarm();
        sendResponse({ success: true });
        break;
      case 'pomodoroPhaseComplete':
        currentPomodoroMode = message.mode;
        sendResponse({ success: true });
        break;
      case 'startNextPomodoroPhase':
        // Start the next Pomodoro phase
        await handleStartNextPomodoroPhase(message.nextMode);
        sendResponse({ success: true });
        break;
      // Clipboard actions
      case 'captureClipboard':
        await handleClipboardCapture(message);
        sendResponse({ success: true });
        break;
      
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  })();
  return true; // Keep the message channel open for async response
});

/**
 * Handle clipboard capture from content script
 * @param {Object} message - Message containing clipboard text
 */
async function handleClipboardCapture(message) {
  const { text, url, title } = message;
  
  if (!text || !text.trim()) {
    console.log(`${APP_NAME}: Empty clipboard, ignoring`);
    return;
  }
  
  try {
    // Get current clipboard history
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.CLIPBOARD_HISTORY,
      STORAGE_KEYS.CLIPBOARD_SETTINGS
    ]);
    
    let history = result[STORAGE_KEYS.CLIPBOARD_HISTORY] || [];
    const settings = result[STORAGE_KEYS.CLIPBOARD_SETTINGS] || { maxItems: 10 };
    
    // Check for duplicates (don't add if same as most recent)
    if (history.length > 0 && history[0].text === text) {
      console.log(`${APP_NAME}: Duplicate clipboard item, ignoring`);
      return;
    }
    
    // Create new item
    const newItem = {
      id: Date.now(),
      text: text.trim(),
      timestamp: new Date().toISOString(),
      length: text.length,
      source: {
        url: url || '',
        title: title || ''
      }
    };
    
    // Add to beginning of history
    history.unshift(newItem);
    
    // Trim to max items
    const maxItems = settings.maxItems || 10;
    if (history.length > maxItems) {
      history = history.slice(0, maxItems);
    }
    
    // Save updated history
    await chrome.storage.local.set({
      [STORAGE_KEYS.CLIPBOARD_HISTORY]: history
    });
    
    console.log(`${APP_NAME}: Clipboard captured (${text.length} chars)`);
    
    // Try to notify popup if it's open
    try {
      await chrome.runtime.sendMessage({
        action: 'clipboardUpdated',
        history: history
      });
    } catch (error) {
      // Popup not open, that's okay
    }
    
  } catch (error) {
    console.log(`${APP_NAME}: Error saving clipboard`, error);
  }
}

/**
 * Start a timer alarm
 * @param {number} duration - Duration in seconds
 */
async function startTimerAlarm(duration) {
  // Cancel any existing alarm/timeout
  await chrome.alarms.clear(TIMER_ALARM_NAME);
  if (timerTimeout) {
    clearTimeout(timerTimeout);
    timerTimeout = null;
  }
  
  // Store the end time for accurate tracking
  const endTime = Date.now() + (duration * 1000);
  await chrome.storage.local.set({ timerEndTime: endTime });
  
  // For short durations (< 30 seconds), use setTimeout instead of Chrome alarms
  // Chrome alarms have a minimum delay of ~30 seconds
  if (duration < 30) {
    console.log(`${APP_NAME}: Using setTimeout for short timer (${duration}s)`);
    timerTimeout = setTimeout(async () => {
      console.log(`${APP_NAME}: Timer timeout triggered!`);
      await triggerTimerAlert();
      await chrome.storage.local.remove([STORAGE_KEYS.TIMER_STATE, 'timerEndTime']);
    }, duration * 1000);
  } else {
    // Use Chrome alarm for longer durations
    chrome.alarms.create(TIMER_ALARM_NAME, {
      delayInMinutes: duration / 60
    });
  }
  
  console.log(`${APP_NAME}: Timer set for ${duration} seconds`);
}

/**
 * Cancel the timer alarm
 */
async function cancelTimerAlarm() {
  await chrome.alarms.clear(TIMER_ALARM_NAME);
  if (timerTimeout) {
    clearTimeout(timerTimeout);
    timerTimeout = null;
  }
  await chrome.storage.local.remove(['timerEndTime']);
  console.log(`${APP_NAME}: Timer cancelled`);
}

/**
 * Start a Pomodoro alarm
 * @param {number} duration - Duration in seconds
 */
async function startPomodoroAlarm(duration) {
  // Cancel any existing alarm/timeout
  await chrome.alarms.clear(POMODORO_ALARM_NAME);
  if (pomodoroTimeout) {
    clearTimeout(pomodoroTimeout);
    pomodoroTimeout = null;
  }
  
  const endTime = Date.now() + (duration * 1000);
  await chrome.storage.local.set({ pomodoroEndTime: endTime });
  
  // For short durations (< 30 seconds), use setTimeout instead of Chrome alarms
  if (duration < 30) {
    console.log(`${APP_NAME}: Using setTimeout for short Pomodoro (${duration}s, ${currentPomodoroMode} mode)`);
    pomodoroTimeout = setTimeout(async () => {
      console.log(`${APP_NAME}: Pomodoro timeout triggered! Mode: ${currentPomodoroMode}`);
      await triggerPomodoroAlert();
      await chrome.storage.local.remove(['pomodoroEndTime']);
    }, duration * 1000);
  } else {
    // Use Chrome alarm for longer durations
    chrome.alarms.create(POMODORO_ALARM_NAME, {
      delayInMinutes: duration / 60
    });
  }
  
  console.log(`${APP_NAME}: Pomodoro set for ${duration} seconds (${currentPomodoroMode} mode)`);
}

/**
 * Cancel the Pomodoro alarm
 */
async function cancelPomodoroAlarm() {
  await chrome.alarms.clear(POMODORO_ALARM_NAME);
  if (pomodoroTimeout) {
    clearTimeout(pomodoroTimeout);
    pomodoroTimeout = null;
  }
  await chrome.storage.local.remove(['pomodoroEndTime']);
  console.log(`${APP_NAME}: Pomodoro cancelled`);
}

/**
 * Handle starting the next Pomodoro phase
 * @param {string} nextMode - 'focus' or 'break'
 */
async function handleStartNextPomodoroPhase(nextMode) {
  console.log(`${APP_NAME}: Starting next Pomodoro phase: ${nextMode}`);
  
  // Get current settings from storage
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.POMODORO_SETTINGS,
    STORAGE_KEYS.POMODORO_STATE
  ]);
  
  console.log(`${APP_NAME}: Loaded settings:`, result[STORAGE_KEYS.POMODORO_SETTINGS]);
  console.log(`${APP_NAME}: Loaded state:`, result[STORAGE_KEYS.POMODORO_STATE]);
  
  const settings = result[STORAGE_KEYS.POMODORO_SETTINGS] || {
    focusTime: 25,
    breakTime: 5,
    longBreakTime: 15
  };
  
  const currentState = result[STORAGE_KEYS.POMODORO_STATE] || {};
  let sessions = currentState.sessions || 0;
  
  // Determine duration based on mode
  let duration;
  if (nextMode === 'focus') {
    duration = settings.focusTime;
    console.log(`${APP_NAME}: Focus duration: ${duration}s`);
  } else {
    // Check if it should be a long break (after 4 focus sessions)
    if (sessions >= 4) {
      duration = settings.longBreakTime;
      console.log(`${APP_NAME}: Long break duration: ${duration}s (sessions: ${sessions})`);
      sessions = 0; // Reset after long break
    } else {
      duration = settings.breakTime;
      console.log(`${APP_NAME}: Break duration: ${duration}s (sessions: ${sessions})`);
    }
  }
  
  // Update current mode
  currentPomodoroMode = nextMode;
  
  // Save new state
  const newState = {
    remaining: duration,
    running: true,
    paused: false,
    mode: nextMode,
    sessions: sessions,
    timestamp: Date.now()
  };
  
  await chrome.storage.local.set({ [STORAGE_KEYS.POMODORO_STATE]: newState });
  console.log(`${APP_NAME}: Saved new state:`, newState);
  
  // Start the alarm/timeout
  await startPomodoroAlarm(duration);
  
  // Try to notify popup to sync its state
  try {
    await chrome.runtime.sendMessage({
      action: 'syncPomodoroState',
      state: newState
    });
    console.log(`${APP_NAME}: Notified popup to sync state`);
  } catch (error) {
    console.log(`${APP_NAME}: Popup not open, state saved in storage`);
  }
  
  console.log(`${APP_NAME}: ✅ ${nextMode} phase started for ${duration}s`);
}

// Handle alarm triggers
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === TIMER_ALARM_NAME) {
    console.log(`${APP_NAME}: Timer alarm triggered!`);
    
    // Trigger all alert methods
    await triggerTimerAlert();
    
    // Clear timer state
    await chrome.storage.local.remove([STORAGE_KEYS.TIMER_STATE, 'timerEndTime']);
  }
  
  if (alarm.name === POMODORO_ALARM_NAME) {
    console.log(`${APP_NAME}: Pomodoro alarm triggered! Mode: ${currentPomodoroMode}`);
    
    // Trigger Pomodoro alert
    await triggerPomodoroAlert();
    
    // Clear pomodoro end time (but not full state, as we need to track sessions)
    await chrome.storage.local.remove(['pomodoroEndTime']);
  }
});

/**
 * Trigger all timer alert methods
 */
async function triggerTimerAlert() {
  console.log(`${APP_NAME}: Triggering timer alert...`);
  
  // 1. Set badge to show timer completed
  try {
    await chrome.action.setBadgeText({ text: '!' });
    await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
  } catch (e) {
    console.log(`${APP_NAME}: Could not set badge`, e);
  }
  
  // 2. Open alert popup window FIRST (this plays sound and is most visible)
  await openAlertPopup('timer');
  
  // 3. Show Chrome notification as backup
  await showTimerNotification();
  
  // 4. Try to notify the extension popup if it's open
  try {
    await chrome.runtime.sendMessage({ action: 'timerComplete' });
  } catch (error) {
    // Popup not open, that's okay
  }
  
  // 5. Also try playing sound via offscreen document as additional backup
  await playAlertSoundViaOffscreen();
  
  // 6. Clear badge after 30 seconds
  setTimeout(async () => {
    try {
      await chrome.action.setBadgeText({ text: '' });
    } catch (e) {}
  }, 30000);
}

/**
 * Trigger Pomodoro alert methods
 */
async function triggerPomodoroAlert() {
  console.log(`${APP_NAME}: Triggering Pomodoro alert for mode: ${currentPomodoroMode}`);
  
  // 1. Set badge
  try {
    await chrome.action.setBadgeText({ text: '🍅' });
    await chrome.action.setBadgeBackgroundColor({ 
      color: currentPomodoroMode === 'focus' ? '#ef4444' : '#22c55e' 
    });
    console.log(`${APP_NAME}: Badge set`);
  } catch (e) {
    console.log(`${APP_NAME}: Could not set badge`, e);
  }
  
  // 2. Open alert popup FIRST (most important)
  try {
    await openAlertPopup('pomodoro');
    console.log(`${APP_NAME}: Alert popup opened`);
  } catch (e) {
    console.log(`${APP_NAME}: Error opening alert popup`, e);
  }
  
  // 3. Show notification
  try {
    await showPomodoroNotification();
    console.log(`${APP_NAME}: Notification shown`);
  } catch (e) {
    console.log(`${APP_NAME}: Error showing notification`, e);
  }
  
  // 4. Notify extension popup if open
  try {
    await chrome.runtime.sendMessage({ action: 'pomodoroComplete', mode: currentPomodoroMode });
  } catch (error) {
    // Popup not open, that's okay
  }
  
  // 5. Play sound via offscreen
  try {
    await playAlertSoundViaOffscreen();
  } catch (e) {
    console.log(`${APP_NAME}: Error playing sound`, e);
  }
  
  // 6. Clear badge after 30 seconds
  setTimeout(async () => {
    try {
      await chrome.action.setBadgeText({ text: '' });
    } catch (e) {}
  }, 30000);
}

/**
 * Show Pomodoro notification
 */
async function showPomodoroNotification() {
  try {
    // currentPomodoroMode is the mode that just COMPLETED
    const isFocusComplete = currentPomodoroMode === 'focus';
    
    const title = isFocusComplete 
      ? '🎯 Focus Session Complete!' 
      : '☕ Break is Over!';
    
    const message = isFocusComplete
      ? 'Great work! Time for a break.'
      : 'Ready to focus again?';
    
    await chrome.notifications.create('masterG-pomodoro-notification', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: title,
      message: message,
      priority: 2,
      requireInteraction: true,
      silent: false
    });
    
    console.log(`${APP_NAME}: Pomodoro notification shown (${currentPomodoroMode} completed)`);
  } catch (error) {
    console.log(`${APP_NAME}: Could not show Pomodoro notification`, error);
  }
}

/**
 * Show timer completion notification
 */
async function showTimerNotification() {
  try {
    await chrome.notifications.create('masterG-timer-notification', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: '⏰ Timer Complete!',
      message: 'Your masterG timer has finished. Click to dismiss.',
      priority: 2,
      requireInteraction: true,
      silent: false
    });
    
    console.log(`${APP_NAME}: Notification shown`);
  } catch (error) {
    console.log(`${APP_NAME}: Could not show notification`, error);
  }
}

/**
 * Open alert popup window
 * @param {string} type - 'timer' or 'pomodoro'
 */
async function openAlertPopup(type = 'timer') {
  console.log(`${APP_NAME}: Opening alert popup for ${type}...`);
  
  const popupWidth = 500;
  const popupHeight = 420;
  let left = 100;
  let top = 100;
  
  // Try to get display info for centering
  try {
    const displays = await chrome.system.display.getInfo();
    if (displays && displays.length > 0) {
      const primaryDisplay = displays.find(d => d.isPrimary) || displays[0];
      if (primaryDisplay && primaryDisplay.workArea) {
        left = Math.round(primaryDisplay.workArea.left + (primaryDisplay.workArea.width - popupWidth) / 2);
        top = Math.round(primaryDisplay.workArea.top + (primaryDisplay.workArea.height - popupHeight) / 2);
      }
    }
  } catch (e) {
    console.log(`${APP_NAME}: Could not get display info, using defaults`, e);
  }
  
  // Build URL with type parameter
  const alertUrl = chrome.runtime.getURL(`alert/alert.html?type=${type}&mode=${currentPomodoroMode}`);
  console.log(`${APP_NAME}: Alert URL: ${alertUrl}`);
  
  try {
    // Create popup window
    const popupWindow = await chrome.windows.create({
      url: alertUrl,
      type: 'popup',
      width: popupWidth,
      height: popupHeight,
      focused: true,
      left: left,
      top: top
    });
    
    console.log(`${APP_NAME}: Alert popup created`, popupWindow);
    
    // Ensure the window is focused and on top
    if (popupWindow && popupWindow.id) {
      setTimeout(async () => {
        try {
          await chrome.windows.update(popupWindow.id, { 
            focused: true,
            drawAttention: true
          });
        } catch (e) {
          // Window might have been closed
        }
      }, 100);
      
      setTimeout(async () => {
        try {
          await chrome.windows.update(popupWindow.id, { focused: true });
        } catch (e) {
          // Window might have been closed
        }
      }, 500);
    }
    
  } catch (error) {
    console.log(`${APP_NAME}: Could not open alert popup, trying fallback`, error);
    // Fallback: open as a new tab
    await openAlertTab(type);
  }
}

/**
 * Fallback: Open alert as a new tab
 * @param {string} type - 'timer' or 'pomodoro'
 */
async function openAlertTab(type = 'timer') {
  try {
    const alertUrl = chrome.runtime.getURL(`alert/alert.html?type=${type}&mode=${currentPomodoroMode}`);
    
    const tab = await chrome.tabs.create({
      url: alertUrl,
      active: true
    });
    
    // Focus the window containing the tab
    if (tab.windowId) {
      await chrome.windows.update(tab.windowId, { focused: true });
    }
    
    console.log(`${APP_NAME}: Alert tab opened as fallback`);
  } catch (error) {
    console.log(`${APP_NAME}: Could not open alert tab`, error);
  }
}

/**
 * Create offscreen document if it doesn't exist
 */
async function ensureOffscreenDocument() {
  if (offscreenDocumentCreated) {
    return true;
  }
  
  try {
    // Check if offscreen document already exists
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });
    
    if (existingContexts.length > 0) {
      offscreenDocumentCreated = true;
      return true;
    }
    
    // Create offscreen document
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL('offscreen/offscreen.html'),
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Play timer alert sound'
    });
    
    offscreenDocumentCreated = true;
    console.log(`${APP_NAME}: Offscreen document created`);
    return true;
    
  } catch (error) {
    console.log(`${APP_NAME}: Could not create offscreen document`, error);
    return false;
  }
}

/**
 * Play alert sound via offscreen document
 */
async function playAlertSoundViaOffscreen() {
  try {
    const hasOffscreen = await ensureOffscreenDocument();
    
    if (hasOffscreen) {
      await chrome.runtime.sendMessage({
        action: 'playAlertSound',
        settings: {
          frequency: 800,
          duration: 200,
          beepCount: 5
        }
      });
      console.log(`${APP_NAME}: Sound message sent to offscreen`);
    }
  } catch (error) {
    console.log(`${APP_NAME}: Could not play sound via offscreen`, error);
  }
}

// Handle notification clicks
chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (notificationId === 'masterG-timer-notification') {
    // Clear the notification
    await chrome.notifications.clear(notificationId);
    
    // Try to open the popup
    try {
      await chrome.action.openPopup();
    } catch (error) {
      // openPopup might not work, that's okay
    }
  }
});

// Handle notification button clicks (if any)
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (notificationId === 'masterG-timer-notification') {
    await chrome.notifications.clear(notificationId);
  }
});

// Handle notification closed
chrome.notifications.onClosed.addListener((notificationId, byUser) => {
  console.log(`${APP_NAME}: Notification closed`, { notificationId, byUser });
});

/**
 * Relay message to popup
 */
async function relayToPopup(action, data = {}) {
  try {
    await chrome.runtime.sendMessage({ action, ...data });
  } catch (error) {
    // Popup might not be open
    console.log(`${APP_NAME}: Could not relay message to popup`);
  }
}

console.log(`${APP_NAME}: Background service worker initialized`);
