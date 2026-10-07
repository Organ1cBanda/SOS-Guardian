/**
 * Local Storage Service for SOS Guardian
 * Uses @react-native-async-storage/async-storage for persistent local storage on Android.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MAX_CONTACTS } from '../utils/validation';

const STORAGE_KEYS = {
  CONTACTS: '@sos_guardian_contacts',
  SETTINGS: '@sos_guardian_settings',
  HISTORY: '@sos_guardian_history',
};

export const DEFAULT_SETTINGS = {
  esp32Ip: '192.168.4.1',
  sosMessage: '🚨 SOS ALERT\nAn emergency alert has been triggered. Please contact me immediately.',
  autoSmsEnabled: true,
  vibrationEnabled: true,
  soundEnabled: true,
};

// Default initial sample contacts for first-time onboarding (can be removed/edited by user)
export const INITIAL_CONTACTS = [
  { id: '1', name: 'Mom', phone: '+919876543210' },
  { id: '2', name: 'Dad', phone: '+919876543211' },
];

/**
 * ----------------------------------------------------
 * CONTACTS MANAGEMENT (Max 5 Contacts)
 * ----------------------------------------------------
 */

export const getContacts = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.CONTACTS);
    if (!raw) {
      // Seed default contacts on initial launch
      await saveContacts(INITIAL_CONTACTS);
      return INITIAL_CONTACTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error reading contacts from storage:', error);
    return [];
  }
};

export const saveContacts = async (contacts) => {
  try {
    const sanitizedList = Array.isArray(contacts) ? contacts.slice(0, MAX_CONTACTS) : [];
    await AsyncStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(sanitizedList));
    return true;
  } catch (error) {
    console.error('Error saving contacts to storage:', error);
    return false;
  }
};

export const addContact = async (contact) => {
  const current = await getContacts();
  if (current.length >= MAX_CONTACTS) {
    throw new Error(`Maximum limit reached. You can only save up to ${MAX_CONTACTS} emergency contacts.`);
  }

  const newContact = {
    id: Date.now().toString(),
    name: contact.name.trim(),
    phone: contact.phone.trim(),
  };

  const updated = [...current, newContact];
  await saveContacts(updated);
  return updated;
};

export const updateContact = async (id, updatedData) => {
  const current = await getContacts();
  const updated = current.map((c) =>
    c.id === id
      ? {
          ...c,
          name: updatedData.name ? updatedData.name.trim() : c.name,
          phone: updatedData.phone ? updatedData.phone.trim() : c.phone,
        }
      : c
  );
  await saveContacts(updated);
  return updated;
};

export const deleteContact = async (id) => {
  const current = await getContacts();
  const filtered = current.filter((c) => c.id !== id);
  await saveContacts(filtered);
  return filtered;
};

/**
 * ----------------------------------------------------
 * SETTINGS MANAGEMENT
 * ----------------------------------------------------
 */

export const getSettings = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (error) {
    console.error('Error loading settings from storage:', error);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (newSettings) => {
  try {
    const current = await getSettings();
    const merged = { ...current, ...newSettings };
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
    return merged;
  } catch (error) {
    console.error('Error saving settings to storage:', error);
    return null;
  }
};

/**
 * ----------------------------------------------------
 * SOS HISTORY MANAGEMENT
 * ----------------------------------------------------
 */

export const getHistory = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (error) {
    console.error('Error reading SOS history from storage:', error);
    return [];
  }
};

/**
 * Record an SOS incident into history.
 * @param {'ESP32' | 'MANUAL'} triggerSource 
 * @param {'Sent' | 'Failed' | 'Partial'} status 
 * @param {string} details 
 */
export const recordSosEvent = async (triggerSource, status, details = '') => {
  try {
    const currentHistory = await getHistory();
    const now = new Date();

    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    const dateString = now.toLocaleDateString('en-GB', options); // e.g. 07 Oct 2026
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }); // e.g. 02:45 AM

    const newEvent = {
      id: Date.now().toString(),
      timestamp: now.getTime(),
      dateString,
      timeString,
      triggerSource: triggerSource === 'ESP32' ? 'ESP32' : 'Manual',
      status: status || 'Sent',
      details,
    };

    // Keep the most recent 50 history entries
    const updatedHistory = [newEvent, ...currentHistory].slice(0, 50);
    await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updatedHistory));
    return newEvent;
  } catch (error) {
    console.error('Error recording SOS event:', error);
    return null;
  }
};

export const clearHistory = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.HISTORY);
    return true;
  } catch (error) {
    console.error('Error clearing history:', error);
    return false;
  }
};
