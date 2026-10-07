/**
 * SOS Guardian - Emergency Android Application
 * Communicates with ESP32 over Wi-Fi AP (192.168.4.1)
 * Pure JavaScript (No TypeScript / No TSX)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';

// Theme & Tokens
import { colors, typography, spacing, borderRadius } from './src/theme';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import ContactsScreen from './src/screens/ContactsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Components
import SOSAlert from './src/components/SOSAlert';

// Services
import esp32Service from './src/services/esp32Service';
import {
  broadcastEmergencySms,
  fetchLiveLocation,
  getCachedLocation,
  requestLocationPermission,
  requestSmsPermission,
} from './src/services/smsService';
import {
  startEmergencyAlert,
  stopEmergencyAlert,
} from './src/services/notificationService';
import {
  getContacts,
  saveContacts,
  addContact as storageAddContact,
  updateContact as storageUpdateContact,
  deleteContact as storageDeleteContact,
  getSettings,
  saveSettings as storageSaveSettings,
  getHistory,
  recordSosEvent,
  clearHistory as storageClearHistory,
} from './src/services/storageService';

const TABS = {
  HOME: 'HOME',
  CONTACTS: 'CONTACTS',
  HISTORY: 'HISTORY',
  SETTINGS: 'SETTINGS',
};

export default function App() {
  // Navigation tab state
  const [activeTab, setActiveTab] = useState(TABS.HOME);

  // App data state
  const [contacts, setContacts] = useState([]);
  const [settings, setSettings] = useState({
    esp32Ip: '192.168.4.1',
    sosMessage: '🚨 SOS ALERT\nAn emergency alert has been triggered. Please contact me immediately.',
  });
  const [history, setHistory] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  // Active SOS modal state
  const [isSosActive, setIsSosActive] = useState(false);
  const [sosTriggerSource, setSosTriggerSource] = useState('ESP32');
  const [activeSosMessage, setActiveSosMessage] = useState('');
  const [dispatchStatus, setDispatchStatus] = useState({
    isSending: false,
    success: false,
    method: 'NONE',
    errors: [],
  });

  // Keep references to contacts and settings for poll callbacks
  const contactsRef = useRef(contacts);
  const settingsRef = useRef(settings);
  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  /**
   * Emergency Trigger Handler (called either by ESP32 polling or Manual Screen Button)
   */
  const handleTriggerEmergency = useCallback(async (source = 'ESP32') => {
    console.log(`🚨 Triggering SOS emergency protocol from ${source}`);
    setSosTriggerSource(source);
    setIsSosActive(true);
    setDispatchStatus({
      isSending: true,
      success: false,
      method: 'NONE',
      errors: [],
    });

    // 1. Activate siren audio and continuous high-intensity vibration
    startEmergencyAlert();

    const currentContacts = contactsRef.current;
    const currentMessage = settingsRef.current.sosMessage;

    // Immediately prepare live location in message if cached
    const cached = getCachedLocation();
    if (cached && cached.mapsUrl) {
      setActiveSosMessage(`${currentMessage}\n\n📍 My Live Location:\n${cached.mapsUrl}`);
    } else {
      setActiveSosMessage(currentMessage);
    }

    // 2. Broadcast emergency SMS to all configured contacts
    let smsResult = {
      success: false,
      method: 'NONE',
      dispatchedCount: 0,
      errors: ['No contacts configured'],
    };

    if (currentContacts && currentContacts.length > 0) {
      try {
        smsResult = await broadcastEmergencySms(currentContacts, currentMessage);
      } catch (err) {
        smsResult = {
          success: false,
          method: 'FAILED',
          dispatchedCount: 0,
          errors: [err.message],
        };
      }
    } else {
      Alert.alert(
        'No Emergency Contacts',
        'SOS was triggered but no emergency contacts are saved. Please add contacts immediately.'
      );
    }

    setDispatchStatus({
      isSending: false,
      success: smsResult.success,
      method: smsResult.method,
      errors: smsResult.errors,
    });
    setActiveSosMessage(smsResult.finalMessage || currentMessage);

    // 3. Log event to local history
    const statusText = smsResult.success ? 'Sent' : 'Failed';
    const detailText = `Recipients: ${smsResult.dispatchedCount || 0}/${currentContacts.length}. Method: ${smsResult.method}`;
    const newRecord = await recordSosEvent(source, statusText, detailText);

    if (newRecord) {
      setHistory((prev) => [newRecord, ...prev]);
    }
  }, []);

  /**
   * Dismiss the SOS Alert (Mute sound & cancel vibration)
   */
  const handleDismissEmergency = () => {
    stopEmergencyAlert();
    setIsSosActive(false);
  };

  /**
   * Initialize data and ESP32 polling loop
   */
  useEffect(() => {
    const initializeApp = async () => {
      // 1. Load contacts
      const loadedContacts = await getContacts();
      setContacts(loadedContacts);

      // 2. Load settings
      const loadedSettings = await getSettings();
      setSettings(loadedSettings);
      esp32Service.setIp(loadedSettings.esp32Ip || '192.168.4.1');

      // 3. Load history
      const loadedHistory = await getHistory();
      setHistory(loadedHistory);

      // 4. Initial connection check
      const conn = await esp32Service.checkConnection(loadedSettings.esp32Ip);
      setIsConnected(conn.connected);

      // 5. Start background polling loop for ESP32 button events
      esp32Service.startPolling(
        // On SOS event from ESP32:
        (event) => {
          handleTriggerEmergency('ESP32');
        },
        // On connection status change:
        (connected) => {
          setIsConnected(connected);
        }
      );

      // Pre-warm permissions and GPS cache so emergency alerts have live location immediately
      setTimeout(() => {
        requestLocationPermission().then(() => fetchLiveLocation());
        requestSmsPermission();
      }, 800);
    };

    initializeApp();

    return () => {
      esp32Service.stopPolling();
      stopEmergencyAlert();
    };
  }, [handleTriggerEmergency]);

  /**
   * Contacts Handlers
   */
  const handleAddContact = async (contact) => {
    const updated = await storageAddContact(contact);
    setContacts(updated);
  };

  const handleUpdateContact = async (id, updatedData) => {
    const updated = await storageUpdateContact(id, updatedData);
    setContacts(updated);
  };

  const handleDeleteContact = async (id) => {
    const updated = await storageDeleteContact(id);
    setContacts(updated);
  };

  /**
   * Settings Handlers
   */
  const handleSaveSettings = async (newSettings) => {
    const updated = await storageSaveSettings(newSettings);
    if (updated) {
      setSettings(updated);
      esp32Service.setIp(updated.esp32Ip);
      // Re-test connection with new IP
      const conn = await esp32Service.checkConnection(updated.esp32Ip);
      setIsConnected(conn.connected);
    }
  };

  const handleTestConnection = async (customIp) => {
    const result = await esp32Service.checkConnection(customIp);
    setIsConnected(result.connected);
    return result;
  };

  /**
   * History Handlers
   */
  const handleClearHistory = async () => {
    await storageClearHistory();
    setHistory([]);
  };

  // The latest SOS event for dashboard display
  const latestEvent = history.length > 0 ? history[0] : null;

  return (
    <SafeAreaView style={styles.appContainer}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Screen Body */}
      <View style={styles.screenContainer}>
        {activeTab === TABS.HOME && (
          <HomeScreen
            isConnected={isConnected}
            esp32Ip={settings.esp32Ip}
            contactsCount={contacts.length}
            lastEvent={latestEvent}
            onTriggerSos={() => handleTriggerEmergency('MANUAL')}
            onTestConnection={() => handleTestConnection(settings.esp32Ip)}
            onNavigateToContacts={() => setActiveTab(TABS.CONTACTS)}
            onNavigateToSettings={() => setActiveTab(TABS.SETTINGS)}
          />
        )}

        {activeTab === TABS.CONTACTS && (
          <ContactsScreen
            contacts={contacts}
            onAddContact={handleAddContact}
            onUpdateContact={handleUpdateContact}
            onDeleteContact={handleDeleteContact}
          />
        )}

        {activeTab === TABS.HISTORY && (
          <HistoryScreen
            history={history}
            onClearHistory={handleClearHistory}
          />
        )}

        {activeTab === TABS.SETTINGS && (
          <SettingsScreen
            settings={settings}
            isConnected={isConnected}
            onSaveSettings={handleSaveSettings}
            onTestConnection={handleTestConnection}
          />
        )}
      </View>

      {/* Modern High-Contrast Bottom Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === TABS.HOME && styles.navItemActive]}
          onPress={() => setActiveTab(TABS.HOME)}
          activeOpacity={0.7}
        >
          <Text style={[styles.navIcon, activeTab === TABS.HOME && styles.navIconActive]}>🏠</Text>
          <Text style={[styles.navLabel, activeTab === TABS.HOME && styles.navLabelActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === TABS.CONTACTS && styles.navItemActive]}
          onPress={() => setActiveTab(TABS.CONTACTS)}
          activeOpacity={0.7}
        >
          <Text style={[styles.navIcon, activeTab === TABS.CONTACTS && styles.navIconActive]}>👥</Text>
          <Text style={[styles.navLabel, activeTab === TABS.CONTACTS && styles.navLabelActive]}>Contacts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === TABS.HISTORY && styles.navItemActive]}
          onPress={() => setActiveTab(TABS.HISTORY)}
          activeOpacity={0.7}
        >
          <Text style={[styles.navIcon, activeTab === TABS.HISTORY && styles.navIconActive]}>📋</Text>
          <Text style={[styles.navLabel, activeTab === TABS.HISTORY && styles.navLabelActive]}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === TABS.SETTINGS && styles.navItemActive]}
          onPress={() => setActiveTab(TABS.SETTINGS)}
          activeOpacity={0.7}
        >
          <Text style={[styles.navIcon, activeTab === TABS.SETTINGS && styles.navIconActive]}>⚙️</Text>
          <Text style={[styles.navLabel, activeTab === TABS.SETTINGS && styles.navLabelActive]}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Critical Full-Screen SOS Emergency Alert Modal */}
      <SOSAlert
        visible={isSosActive}
        triggerSource={sosTriggerSource}
        contacts={contacts}
        sosMessage={activeSosMessage || settings.sosMessage}
        dispatchStatus={dispatchStatus}
        onDismiss={handleDismissEmergency}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContainer: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.xs + 2,
    paddingBottom: spacing.sm,
    justifyContent: 'space-around',
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
  },
  navItemActive: {
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  navIconActive: {
    transform: [{ scale: 1.1 }],
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  navLabelActive: {
    color: colors.primaryBright,
    fontWeight: '800',
  },
});
