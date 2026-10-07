/**
 * Notification Service for SOS Guardian
 * Manages emergency acoustic alerts and repetitive vibration patterns.
 */

import { Vibration, Platform } from 'react-native';

// Standard high-intensity emergency vibration cadence:
// Pattern: wait 0ms, vibrate 600ms, pause 200ms, vibrate 600ms, pause 200ms, vibrate 800ms, pause 400ms
const EMERGENCY_VIBRATION_PATTERN = [0, 600, 200, 600, 200, 800, 400];

let SoundModule = null;
let alertSoundInstance = null;
let isAlertActive = false;

try {
  // eslint-disable-next-line global-require
  SoundModule = require('react-native-sound');
  if (SoundModule && SoundModule.setCategory) {
    SoundModule.setCategory('Playback');
  }
} catch (e) {
  // Running in environment without native audio library compiled yet
}

/**
 * Starts the emergency alert sequence:
 * - Continuous high-priority vibration
 * - Loud emergency alarm audio (looped)
 */
export const startEmergencyAlert = () => {
  if (isAlertActive) return;
  isAlertActive = true;

  // 1. Start continuous repeating vibration
  try {
    Vibration.vibrate(EMERGENCY_VIBRATION_PATTERN, true);
  } catch (err) {
    console.warn('Vibration error:', err);
  }

  // 2. Play emergency sound if SoundModule is available
  if (SoundModule) {
    try {
      if (!alertSoundInstance) {
        // Look for bundled alert sound (e.g. android/app/src/main/res/raw/sos_alarm.mp3)
        alertSoundInstance = new SoundModule('sos_alarm.mp3', SoundModule.MAIN_BUNDLE, (error) => {
          if (error) {
            console.warn('Failed to load alert sound:', error);
            return;
          }
          if (isAlertActive && alertSoundInstance) {
            alertSoundInstance.setNumberOfLoops(-1); // Loop indefinitely until dismissed
            alertSoundInstance.setVolume(1.0);
            alertSoundInstance.play();
          }
        });
      } else {
        alertSoundInstance.setNumberOfLoops(-1);
        alertSoundInstance.setVolume(1.0);
        alertSoundInstance.play();
      }
    } catch (err) {
      console.warn('Sound play error:', err);
    }
  }
};

/**
 * Immediately stops vibration and stops/releases alarm sound.
 */
export const stopEmergencyAlert = () => {
  isAlertActive = false;

  // 1. Stop vibration
  try {
    Vibration.cancel();
  } catch (err) {
    console.warn('Vibration cancel error:', err);
  }

  // 2. Stop sound
  if (alertSoundInstance) {
    try {
      alertSoundInstance.stop(() => {
        // Sound stopped
      });
    } catch (err) {
      console.warn('Error stopping sound:', err);
    }
  }
};

/**
 * Check if alert is currently active
 * @returns {boolean}
 */
export const isEmergencyAlertActive = () => {
  return isAlertActive;
};
