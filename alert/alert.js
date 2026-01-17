/**
 * masterG - Timer/Pomodoro Alert Page
 * Displays timer completion alert and plays sound
 */

// Audio context for sound playback
let audioContext = null;
let soundInterval = null;

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const alertType = urlParams.get('type') || 'timer';
const pomodoroMode = urlParams.get('mode') || 'focus';

document.addEventListener('DOMContentLoaded', () => {
  // Focus window immediately
  window.focus();
  
  // Configure alert based on type
  configureAlert();
  
  // Display completion time
  const timeElement = document.getElementById('completion-time');
  if (timeElement) {
    const now = new Date();
    timeElement.textContent = `Completed at ${now.toLocaleTimeString()}`;
  }
  
  // Update page title to grab attention
  startTitleFlash();
  
  // Play alert sound immediately
  playAlertSound();
  
  // Continue playing sound periodically until dismissed
  soundInterval = setInterval(() => {
    playAlertSound();
  }, 4000);
  
  // Setup dismiss button
  const dismissBtn = document.getElementById('dismiss-btn');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', dismissAlert);
  }
  
  // Setup action button (for Pomodoro)
  const actionBtn = document.getElementById('action-btn');
  if (actionBtn) {
    actionBtn.addEventListener('click', handleAction);
  }
  
  // Also allow pressing Enter or Escape to dismiss
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
      dismissAlert();
    }
  });
  
  // Stop alert after 60 seconds automatically
  setTimeout(() => {
    if (soundInterval) clearInterval(soundInterval);
    stopTitleFlash();
  }, 60000);
});

/**
 * Configure the alert based on type (timer or pomodoro)
 */
function configureAlert() {
  const icon = document.getElementById('alert-icon');
  const title = document.getElementById('alert-title');
  const message = document.getElementById('alert-message');
  const actionBtn = document.getElementById('action-btn');
  
  if (alertType === 'pomodoro') {
    // Pomodoro alert
    // pomodoroMode is the mode that just COMPLETED
    if (pomodoroMode === 'focus') {
      // Focus session just completed, break is next
      document.body.classList.add('focus-complete');
      icon.textContent = '🎯';
      title.textContent = 'Focus Complete!';
      message.textContent = 'Great work! You\'ve completed your focus session.';
      actionBtn.textContent = '☕ Start Break';
      actionBtn.style.display = 'inline-block';
      document.title = '🎯 Focus Complete - masterG';
    } else {
      // Break just completed, focus is next
      icon.textContent = '☕';
      title.textContent = 'Break is Over!';
      message.textContent = 'Feeling refreshed? Time to focus again!';
      actionBtn.textContent = '🎯 Start Focus';
      actionBtn.style.display = 'inline-block';
      actionBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
      document.title = '☕ Break Over - masterG';
    }
  } else {
    // Regular timer alert
    icon.textContent = '⏰';
    title.textContent = 'Timer Complete!';
    message.textContent = 'Your countdown timer has finished.';
    document.title = '⏰ Timer Complete - masterG';
  }
}

/**
 * Dismiss the alert
 */
function dismissAlert() {
  if (soundInterval) clearInterval(soundInterval);
  stopTitleFlash();
  window.close();
}

/**
 * Handle action button click (start next Pomodoro phase)
 */
async function handleAction() {
  if (soundInterval) clearInterval(soundInterval);
  stopTitleFlash();
  
  // Send message to start next phase
  // pomodoroMode is what just completed, so next phase is the opposite
  const nextMode = pomodoroMode === 'focus' ? 'break' : 'focus';
  
  try {
    await chrome.runtime.sendMessage({
      action: 'startNextPomodoroPhase',
      nextMode: nextMode
    });
  } catch (error) {
    console.log('Could not start next phase:', error);
  }
  
  window.close();
}

// Title flashing for attention
let titleFlashInterval = null;
let originalTitle = '⏰ Timer Complete - masterG';

function startTitleFlash() {
  let flashState = false;
  titleFlashInterval = setInterval(() => {
    document.title = flashState ? '🔔 TIMER DONE!' : '⏰ Timer Complete!';
    flashState = !flashState;
  }, 500);
}

function stopTitleFlash() {
  if (titleFlashInterval) {
    clearInterval(titleFlashInterval);
    document.title = originalTitle;
  }
}

/**
 * Play alert sound using Web Audio API
 */
function playAlertSound() {
  try {
    // Create new audio context or resume existing
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Resume if suspended
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    // Sound settings
    const frequency = 880;
    const beepDuration = 0.15;
    const beepCount = 4;
    
    let time = audioContext.currentTime;
    
    // Play attention-grabbing beeps
    for (let i = 0; i < beepCount; i++) {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Alternating high-low pattern for urgency
      oscillator.frequency.value = i % 2 === 0 ? frequency : frequency * 0.75;
      oscillator.type = 'square';
      
      // Sharp envelope
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(0.3, time + 0.01);
      gainNode.gain.setValueAtTime(0.3, time + beepDuration * 0.8);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + beepDuration);
      
      oscillator.start(time);
      oscillator.stop(time + beepDuration);
      
      time += beepDuration + 0.08;
    }
    
    // Final longer attention tone
    const finalOsc = audioContext.createOscillator();
    const finalGain = audioContext.createGain();
    
    finalOsc.connect(finalGain);
    finalGain.connect(audioContext.destination);
    
    finalOsc.frequency.value = frequency * 1.25;
    finalOsc.type = 'sine';
    
    finalGain.gain.setValueAtTime(0, time);
    finalGain.gain.linearRampToValueAtTime(0.4, time + 0.02);
    finalGain.gain.setValueAtTime(0.4, time + 0.4);
    finalGain.gain.exponentialRampToValueAtTime(0.01, time + 0.6);
    
    finalOsc.start(time);
    finalOsc.stop(time + 0.6);
    
    console.log('masterG: Alert sound played');
    
  } catch (error) {
    console.error('masterG: Could not play alert sound:', error);
  }
}

// Request window focus repeatedly
function requestFocus() {
  window.focus();
  // Also try to focus the document
  document.body.focus();
}

// Focus multiple times to ensure visibility
requestFocus();
setTimeout(requestFocus, 100);
setTimeout(requestFocus, 300);
setTimeout(requestFocus, 500);
