/**
 * masterG - Offscreen Document
 * Handles audio playback for timer alerts
 * 
 * This runs in an offscreen document because service workers
 * cannot use Web Audio API directly.
 */

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'playAlertSound') {
    playAlertSound(message.settings || {});
    sendResponse({ success: true });
  }
  return true;
});

/**
 * Play alert sound using Web Audio API
 * @param {Object} settings - Sound settings
 */
function playAlertSound(settings) {
  const frequency = settings.frequency || 800;
  const duration = settings.duration || 200;
  const beepCount = settings.beepCount || 5;
  
  try {
    const audioContext = new AudioContext();
    let time = audioContext.currentTime;
    
    for (let i = 0; i < beepCount; i++) {
      // Create oscillator for each beep
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configure sound
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      // Envelope for smooth sound
      const beepDuration = duration / 1000;
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(0.5, time + 0.01);
      gainNode.gain.setValueAtTime(0.5, time + beepDuration * 0.7);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + beepDuration);
      
      oscillator.start(time);
      oscillator.stop(time + beepDuration);
      
      // Gap between beeps
      time += beepDuration + 0.15;
    }
    
    // Play a longer final tone
    const finalOsc = audioContext.createOscillator();
    const finalGain = audioContext.createGain();
    
    finalOsc.connect(finalGain);
    finalGain.connect(audioContext.destination);
    
    finalOsc.frequency.value = frequency * 1.5;
    finalOsc.type = 'sine';
    
    finalGain.gain.setValueAtTime(0.4, time);
    finalGain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
    
    finalOsc.start(time);
    finalOsc.stop(time + 0.5);
    
    console.log('masterG: Alert sound played successfully');
    
  } catch (error) {
    console.error('masterG: Error playing alert sound:', error);
  }
}

console.log('masterG: Offscreen document loaded');
