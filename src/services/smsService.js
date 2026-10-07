/**
 * SMS & Messaging Service for SOS Guardian
 * Handles Android Direct Background SMS sending, Live GPS Location attachments,
 * Permission requests, WhatsApp Auto-Send via Accessibility, and WhatsApp universal deep linking.
 */

import { PermissionsAndroid, Platform, Linking, Alert, NativeModules } from 'react-native';

const SosNative = NativeModules.SosNativeModule;

// Memory cache for latest acquired location
let lastCachedLocation = null;

/**
 * Requests Android SEND_SMS permission at runtime.
 * @returns {Promise<boolean>}
 */
export const requestSmsPermission = async () => {
  if (Platform.OS !== 'android') return false;

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
      {
        title: 'SOS Emergency SMS Permission',
        message:
          'SOS Guardian requires SMS permission to automatically send emergency alerts to your configured contacts when an SOS is triggered.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'Grant Permission',
      }
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error('Error requesting SMS permission:', error);
    return false;
  }
};

/**
 * Checks if SMS permission is already granted.
 * @returns {Promise<boolean>}
 */
export const checkSmsPermission = async () => {
  if (Platform.OS !== 'android') return false;
  try {
    return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.SEND_SMS);
  } catch (error) {
    console.error('Error checking SMS permission:', error);
    return false;
  }
};

/**
 * Requests Android GPS Location permission at runtime.
 * @returns {Promise<boolean>}
 */
export const requestLocationPermission = async () => {
  if (Platform.OS !== 'android') return false;

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'SOS Live Location Permission',
        message:
          'SOS Guardian requires GPS location permission to attach your exact live location map link to emergency alerts.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'Allow GPS',
      }
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

/**
 * Fetches current live GPS coordinates and generates Google Maps link.
 * Protected with a strict 4-second timeout to guarantee it NEVER blocks SOS dispatch.
 * 
 * @returns {Promise<{ latitude: number, longitude: number, mapsUrl: string } | null>}
 */
export const fetchLiveLocation = async () => {
  if (!SosNative || !SosNative.getLiveLocation) {
    return lastCachedLocation;
  }

  try {
    const hasFine = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    if (!hasFine) {
      const granted = await requestLocationPermission();
      if (!granted) {
        console.warn('GPS location permission denied. Proceeding with cached or null location.');
        return lastCachedLocation;
      }
    }

    // Race native getLiveLocation against a 4000ms timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Location fetch timeout in JS')), 4000)
    );

    const location = await Promise.race([SosNative.getLiveLocation(), timeoutPromise]);
    if (location && location.mapsUrl) {
      lastCachedLocation = location;
      console.log('[GPS] Live Location acquired:', location.mapsUrl);
      return location;
    }
    return lastCachedLocation;
  } catch (err) {
    console.warn('[GPS] Could not acquire fresh location, using cache if available:', err.message);
    return lastCachedLocation;
  }
};

/**
 * Returns the latest cached GPS location.
 */
export const getCachedLocation = () => lastCachedLocation;

/**
 * Launches the device default SMS composer prefilled with recipient and message.
 * @param {string[]} phoneNumbers 
 * @param {string} message 
 */
export const launchSmsComposerFallback = async (phoneNumbers, message) => {
  try {
    const recipients = phoneNumbers.join(';');
    const separator = Platform.OS === 'ios' ? '&' : '?';
    const encodedBody = encodeURIComponent(message);
    const smsUrl = `sms:${recipients}${separator}body=${encodedBody}`;

    const canOpen = await Linking.canOpenURL(smsUrl);
    if (canOpen) {
      await Linking.openURL(smsUrl);
      return { success: true, method: 'COMPOSER_FALLBACK' };
    } else {
      const altUrl = `sms:${recipients}?body=${encodedBody}`;
      await Linking.openURL(altUrl);
      return { success: true, method: 'COMPOSER_FALLBACK' };
    }
  } catch (error) {
    console.error('Error opening SMS composer fallback:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Dispatches emergency SMS to all configured contacts automatically in the background.
 * Attaches live Google Maps GPS location when available.
 * 
 * @param {Array<{ name: string, phone: string }>} contacts 
 * @param {string} baseMessage 
 * @returns {Promise<{ success: boolean, method: string, dispatchedCount: number, errors: string[], finalMessage: string }>}
 */
export const broadcastEmergencySms = async (contacts, baseMessage) => {
  if (!contacts || contacts.length === 0) {
    return {
      success: false,
      method: 'NONE',
      dispatchedCount: 0,
      errors: ['No emergency contacts configured! Please add at least 1 contact.'],
      finalMessage: baseMessage,
    };
  }

  // 1. Fetch live GPS location and attach to distress message
  let finalMessage = baseMessage;
  try {
    const loc = await fetchLiveLocation();
    if (loc && loc.mapsUrl) {
      finalMessage = `${baseMessage}\n\n📍 My Live Location:\n${loc.mapsUrl}`;
    }
  } catch (e) {
    console.warn('GPS fetch failed, continuing with base message:', e);
  }

  const phoneNumbers = contacts.map((c) => c.phone);
  const errors = [];
  let successfulSends = 0;

  // 2. Check & Request SMS permission on Android
  const hasPermission = await checkSmsPermission();
  let permissionGranted = hasPermission;

  if (!hasPermission) {
    permissionGranted = await requestSmsPermission();
  }

  // 3. Send via Native Android SmsManager (100% Automatic background dispatch)
  if (permissionGranted && SosNative && SosNative.sendDirectSms) {
    console.log('[SMS] Automatically dispatching background SMS to', phoneNumbers.length, 'contacts');

    for (const contact of contacts) {
      try {
        const result = await SosNative.sendDirectSms(contact.phone, finalMessage);
        if (result && result.success) {
          successfulSends++;
          console.log(`[SMS] ✅ Sent direct SMS to ${contact.name} (${contact.phone})`);
        } else {
          errors.push(`Failed for ${contact.name}: Unknown error`);
        }
      } catch (err) {
        console.warn(`[SMS] Direct send error for ${contact.name}:`, err.message);
        errors.push(`Failed for ${contact.name}: ${err.message}`);
      }
    }

    if (successfulSends > 0) {
      return {
        success: true,
        method: 'DIRECT_SMS_AUTOMATIC',
        dispatchedCount: successfulSends,
        errors,
        finalMessage,
      };
    }
  }

  // 4. Fallback to SMS Composer if native permission was denied or direct send failed
  console.log('[SMS] Falling back to system SMS Composer');
  const fallbackResult = await launchSmsComposerFallback(phoneNumbers, finalMessage);

  if (fallbackResult.success) {
    return {
      success: true,
      method: 'COMPOSER_FALLBACK',
      dispatchedCount: phoneNumbers.length,
      errors: permissionGranted ? errors : ['Direct SMS permission not granted; opened SMS composer.'],
      finalMessage,
    };
  }

  return {
    success: false,
    method: 'FAILED',
    dispatchedCount: 0,
    errors: ['Unable to send via Direct SMS or open SMS composer.'],
    finalMessage,
  };
};

/**
 * ----------------------------------------------------
 * WHATSAPP INTEGRATION & AUTO-SEND
 * ----------------------------------------------------
 */

/**
 * Normalizes phone numbers specifically for WhatsApp URL protocols.
 * Strips leading 0s, adds default country code (91) for 10-digit Indian numbers,
 * and strips + or spaces so WhatsApp can resolve the user without "Invite" errors.
 * @param {string} phone 
 * @returns {string}
 */
export const normalizePhoneForWhatsApp = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  let digits = phone.replace(/[^0-9]/g, '');

  // Strip leading 0 if 11 digits (e.g. 09876543210 -> 9876543210)
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.substring(1);
  }

  // If 10 digits without country code, automatically add 91 (India)
  if (digits.length === 10) {
    digits = `91${digits}`;
  }

  return digits;
};

/**
 * Checks if the SOS Accessibility Service is active for WhatsApp Auto-Send.
 * @returns {Promise<boolean>}
 */
export const isAccessibilityServiceActive = async () => {
  if (!SosNative || !SosNative.isAccessibilityEnabled) return false;
  try {
    return await SosNative.isAccessibilityEnabled();
  } catch (e) {
    return false;
  }
};

/**
 * Launches Android Accessibility Settings to allow the user to enable WhatsApp Auto-Send.
 */
export const openAccessibilitySettings = async () => {
  if (SosNative && SosNative.openAccessibilitySettings) {
    try {
      await SosNative.openAccessibilitySettings();
    } catch (e) {
      console.warn('Could not open accessibility settings:', e);
    }
  }
};

/**
 * Opens WhatsApp chat with pre-filled emergency message and Live Location.
 * Arms WhatsApp Auto-Send so if the Accessibility Service is enabled,
 * WhatsApp will automatically click the Send button!
 * 
 * @param {string} phoneNumber 
 * @param {string} message 
 */
export const openWhatsAppEmergencyChat = async (phoneNumber, message) => {
  try {
    const formattedPhone = normalizePhoneForWhatsApp(phoneNumber);

    // Ensure message contains live location
    let msgToSend = message || '';
    if (!msgToSend.includes('maps.google.com')) {
      const loc = await fetchLiveLocation();
      if (loc && loc.mapsUrl) {
        msgToSend = `${msgToSend}\n\n📍 My Live Location:\n${loc.mapsUrl}`;
      }
    }

    // Arm Accessibility Service for WhatsApp Auto-Click
    if (SosNative && SosNative.prepareWhatsAppAutoSend) {
      try {
        await SosNative.prepareWhatsAppAutoSend();
        console.log('[WhatsApp] Armed Auto-Send Accessibility Service');
      } catch (e) {
        console.warn('Could not arm Auto-Send:', e);
      }
    }

    const encodedMsg = encodeURIComponent(msgToSend);
    const directSchemeUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodedMsg}`;
    const universalUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMsg}`;

    console.log(`[WhatsApp] Opening chat directly for recipient: +${formattedPhone}`);

    const canOpenDirect = await Linking.canOpenURL(directSchemeUrl);
    if (canOpenDirect) {
      await Linking.openURL(directSchemeUrl);
      return { success: true, messageWithLocation: msgToSend };
    }

    const canOpenUniversal = await Linking.canOpenURL(universalUrl);
    if (canOpenUniversal) {
      await Linking.openURL(universalUrl);
      return { success: true, messageWithLocation: msgToSend };
    }

    // Fallback to wa.me
    await Linking.openURL(`https://wa.me/${formattedPhone}?text=${encodedMsg}`);
    return { success: true, messageWithLocation: msgToSend };
  } catch (error) {
    console.error('Error opening WhatsApp:', error);
    Alert.alert(
      'WhatsApp Unavailable',
      'Could not open WhatsApp. Please ensure WhatsApp is installed on your device.'
    );
    return { success: false, error: error.message };
  }
};
