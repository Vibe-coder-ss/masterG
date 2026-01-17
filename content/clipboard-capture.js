/**
 * masterG - Clipboard Auto-Capture Content Script
 * Automatically captures copied text when user presses Ctrl/Cmd+C
 * 
 * Privacy Notice: Copied text is stored locally only.
 * No data is transmitted to external servers.
 */

(function() {
  'use strict';

  // Debounce timer to avoid duplicate captures
  let lastCaptureTime = 0;
  const DEBOUNCE_MS = 500;

  /**
   * Check if auto-capture is enabled
   */
  async function isAutoCaptureEnabled() {
    try {
      const storageKey = (typeof CONFIG !== 'undefined' && CONFIG.storageKeys) 
        ? CONFIG.storageKeys.CLIPBOARD_SETTINGS 
        : 'clipboardSettings';
      
      const result = await chrome.storage.local.get([storageKey]);
      const settings = result[storageKey];
      
      // Default to true if not set
      return settings?.autoCapture !== false;
    } catch (error) {
      return true; // Default to enabled
    }
  }

  /**
   * Send copied text to background script for storage
   * @param {string} text - The copied text
   */
  async function sendToBackground(text) {
    try {
      await chrome.runtime.sendMessage({
        action: 'captureClipboard',
        text: text,
        url: window.location.href,
        title: document.title
      });
      console.log('masterG: Clipboard captured');
    } catch (error) {
      // Extension might be reloading or not available
      console.log('masterG: Could not send clipboard to background');
    }
  }

  /**
   * Handle copy event
   * @param {ClipboardEvent} event - The copy event
   */
  async function handleCopy(event) {
    // Debounce to avoid duplicate captures
    const now = Date.now();
    if (now - lastCaptureTime < DEBOUNCE_MS) {
      return;
    }
    lastCaptureTime = now;

    // Check if auto-capture is enabled
    const enabled = await isAutoCaptureEnabled();
    if (!enabled) {
      return;
    }

    // Get the selected text
    let text = '';
    
    // Try to get text from selection
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      text = selection.toString();
    }
    
    // If no selection, try to get from clipboard event
    if (!text && event.clipboardData) {
      text = event.clipboardData.getData('text/plain');
    }

    // Only capture if we have text
    if (text && text.trim()) {
      // Truncate if too long
      const maxLength = (typeof CONFIG !== 'undefined' && CONFIG.clipboard) 
        ? CONFIG.clipboard.maxItemLength 
        : 5000;
      
      if (text.length > maxLength) {
        text = text.substring(0, maxLength);
      }

      await sendToBackground(text);
    }
  }

  /**
   * Handle keyboard shortcuts (Ctrl/Cmd+C)
   * @param {KeyboardEvent} event - The keyboard event
   */
  async function handleKeyboard(event) {
    // Check for Ctrl+C or Cmd+C
    if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
      // Small delay to let the copy complete
      setTimeout(async () => {
        const now = Date.now();
        if (now - lastCaptureTime < DEBOUNCE_MS) {
          return;
        }
        lastCaptureTime = now;

        const enabled = await isAutoCaptureEnabled();
        if (!enabled) {
          return;
        }

        // Get selected text
        const selection = window.getSelection();
        const text = selection ? selection.toString() : '';

        if (text && text.trim()) {
          const maxLength = (typeof CONFIG !== 'undefined' && CONFIG.clipboard) 
            ? CONFIG.clipboard.maxItemLength 
            : 5000;
          
          const truncatedText = text.length > maxLength 
            ? text.substring(0, maxLength) 
            : text;

          await sendToBackground(truncatedText);
        }
      }, 50);
    }
  }

  // Initialize listeners when DOM is ready
  function init() {
    // Listen for copy events
    document.addEventListener('copy', handleCopy, true);
    
    // Also listen for keyboard shortcuts as backup
    document.addEventListener('keydown', handleKeyboard, true);
    
    console.log('masterG: Clipboard auto-capture initialized');
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
