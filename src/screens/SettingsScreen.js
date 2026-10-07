/**
 * SettingsScreen - SOS Guardian Configuration
 * Configures ESP32 target IP, custom distress message, SMS permissions,
 * and WhatsApp integrations.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';
import { validateIpAddress } from '../utils/validation';
import {
  checkSmsPermission,
  requestSmsPermission,
  isAccessibilityServiceActive,
  openAccessibilitySettings,
} from '../services/smsService';

export const SettingsScreen = ({
  settings,
  isConnected,
  onSaveSettings,
  onTestConnection,
}) => {
  const [ipInput, setIpInput] = useState(settings?.esp32Ip || '192.168.4.1');
  const [messageInput, setMessageInput] = useState(
    settings?.sosMessage ||
      '🚨 SOS ALERT\nAn emergency alert has been triggered. Please contact me immediately.'
  );
  const [smsPermitted, setSmsPermitted] = useState(false);
  const [accessibilityActive, setAccessibilityActive] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  useEffect(() => {
    if (settings) {
      if (settings.esp32Ip) setIpInput(settings.esp32Ip);
      if (settings.sosMessage) setMessageInput(settings.sosMessage);
    }
    checkPermissionStatus();
  }, [settings]);

  const checkPermissionStatus = async () => {
    const granted = await checkSmsPermission();
    setSmsPermitted(granted);
    const acc = await isAccessibilityServiceActive();
    setAccessibilityActive(acc);
  };

  const handleRequestPermission = async () => {
    const granted = await requestSmsPermission();
    setSmsPermitted(granted);
    if (granted) {
      Alert.alert('Permission Granted', 'Android Direct SMS permission is active.');
    } else {
      Alert.alert(
        'Permission Denied',
        'Direct SMS permission was not granted. The app will use the native SMS composer fallback.'
      );
    }
  };

  const handleTestLink = async () => {
    if (!validateIpAddress(ipInput)) {
      Alert.alert('Invalid IP', 'Please enter a valid IPv4 address (e.g. 192.168.4.1).');
      return;
    }

    setIsTesting(true);
    const result = await onTestConnection(ipInput);
    setIsTesting(false);

    if (result?.connected) {
      Alert.alert(
        'Connection Successful! 🟢',
        `Successfully communicated with ESP32 at http://${ipInput} (Latency: ${result.latencyMs || 25}ms).`
      );
    } else {
      Alert.alert(
        'Connection Failed 🔴',
        `Could not reach ESP32 at http://${ipInput}.\n\nEnsure:\n1. Your phone is connected to the "SOS_DEVICE" Wi-Fi network (Password: 12345678).\n2. The ESP32 is powered on.\n3. Mobile data is temporarily toggled off if your Android phone refuses Wi-Fi without internet.`
      );
    }
  };

  const handleSaveAll = async () => {
    if (!validateIpAddress(ipInput)) {
      Alert.alert('Invalid IP Address', 'Please provide a valid IPv4 format (e.g. 192.168.4.1)');
      return;
    }

    if (!messageInput.trim()) {
      Alert.alert('Empty Message', 'Emergency SOS message cannot be empty.');
      return;
    }

    await onSaveSettings({
      esp32Ip: ipInput.trim(),
      sosMessage: messageInput.trim(),
    });

    setSaveSuccessMsg('Settings saved successfully!');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleResetDefaults = () => {
    setIpInput('192.168.4.1');
    setMessageInput('🚨 SOS ALERT\nAn emergency alert has been triggered. Please contact me immediately.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.screenLabel}>PREFERENCES</Text>
        <Text style={styles.screenTitle}>Settings & Hardware</Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {saveSuccessMsg.length > 0 && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>✓ {saveSuccessMsg}</Text>
          </View>
        )}

        {/* SECTION 1: Hardware Link (NodeMCU / ESP8266) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📡</Text>
            <Text style={styles.sectionTitle}>NODEMCU / HARDWARE CONFIGURATION</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>NODEMCU AP IP ADDRESS</Text>
            <View style={styles.ipInputRow}>
              <TextInput
                style={styles.textInput}
                value={ipInput}
                onChangeText={setIpInput}
                placeholder="192.168.4.1"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.testLinkBtn}
                onPress={handleTestLink}
                disabled={isTesting}
                activeOpacity={0.8}
              >
                {isTesting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.testLinkText}>Ping Test</Text>
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldHelper}>
              Default NodeMCU / ESP8266 Access Point IP: 192.168.4.1 (Port 80)
            </Text>
          </View>

          {/* Wi-Fi Instructions */}
          <View style={styles.instructionBox}>
            <Text style={styles.instructionTitle}>NodeMCU Wi-Fi Credentials:</Text>
            <Text style={styles.instructionItem}>• SSID: <Text style={styles.codeText}>SOS_DEVICE</Text></Text>
            <Text style={styles.instructionItem}>• Password: <Text style={styles.codeText}>12345678</Text></Text>
            <Text style={styles.instructionItem}>• Push Button: <Text style={styles.codeText}>Pin D2 (GPIO 4) to GND</Text></Text>
            <Text style={styles.instructionItem}>
              • Status: <Text style={{ color: isConnected ? colors.success : colors.danger, fontWeight: '700' }}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Text>
            </Text>
          </View>
        </View>

        {/* SECTION 2: SOS Emergency Message */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📝</Text>
            <Text style={styles.sectionTitle}>DISTRESS MESSAGE CONTENT</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>CUSTOM SOS MESSAGE</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={messageInput}
              onChangeText={setMessageInput}
              multiline
              numberOfLines={4}
              placeholder="Enter emergency distress message..."
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.fieldHelper}>
              Dispatched automatically to emergency contacts when triggered.
            </Text>
          </View>
        </View>

        {/* SECTION 3: SMS Delivery & Permissions */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>💬</Text>
            <Text style={styles.sectionTitle}>SMS BROADCAST PERMISSION</Text>
          </View>

          <View style={styles.permRow}>
            <View style={styles.permInfo}>
              <Text style={styles.permTitle}>Android SEND_SMS Permission</Text>
              <Text style={styles.permDesc}>
                {smsPermitted
                  ? 'Permission active. Direct background SMS enabled.'
                  : 'Permission required for direct background SMS sending.'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.permBtn, smsPermitted ? styles.permBtnActive : styles.permBtnInactive]}
              onPress={handleRequestPermission}
              activeOpacity={0.8}
            >
              <Text style={styles.permBtnText}>{smsPermitted ? 'Granted' : 'Grant'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fallbackNote}>
            <Text style={styles.fallbackNoteText}>
              🛡️ Graceful Fallback: If your Android carrier restricts direct SMS, the app seamlessly opens your default SMS composer with the message prefilled.
            </Text>
          </View>
        </View>

        {/* SECTION 4: WhatsApp Integration */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🟢</Text>
            <Text style={styles.sectionTitle}>WHATSAPP AUTO-SEND</Text>
          </View>

          <View style={styles.permRow}>
            <View style={styles.permInfo}>
              <Text style={styles.permTitle}>Automatic Send via Accessibility</Text>
              <Text style={styles.permDesc}>
                {accessibilityActive
                  ? '⚡ Auto-Click Active. WhatsApp will automatically send the distress message and live location.'
                  : 'Enable Accessibility Service so WhatsApp automatically sends without pressing Send.'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.permBtn, accessibilityActive ? styles.permBtnActive : styles.permBtnInactive]}
              onPress={async () => {
                await openAccessibilitySettings();
                setTimeout(checkPermissionStatus, 1500);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.permBtnText}>{accessibilityActive ? 'Active' : 'Enable'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldHelper}>
            When enabled, opening WhatsApp during an SOS automatically clicks the Send button and returns to SOS Guardian.
          </Text>
        </View>

        {/* SECTION 5: About SOS Guardian */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🛡️</Text>
            <Text style={styles.sectionTitle}>ABOUT SOS GUARDIAN</Text>
          </View>

          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Version:</Text>
            <Text style={styles.aboutVal}>v1.0.0 (Release)</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Protocol:</Text>
            <Text style={styles.aboutVal}>HTTP over Wi-Fi Access Point</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Hardware Hold Requirement:</Text>
            <Text style={styles.aboutVal}>3.0 Seconds (Debounced)</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Storage:</Text>
            <Text style={styles.aboutVal}>Local Encrypted Device Storage</Text>
          </View>
        </View>

        {/* Actions: Save Settings & Reset */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveAll}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnText}>Save Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetBtn}
            onPress={handleResetDefaults}
            activeOpacity={0.8}
          >
            <Text style={styles.resetBtnText}>Restore Defaults</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  screenLabel: {
    ...typography.caption,
    color: colors.primaryBright,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  screenTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  successBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    padding: spacing.sm + 4,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.success,
  },
  successText: {
    ...typography.bodyBold,
    color: colors.success,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  fieldGroup: {
    marginBottom: spacing.xs,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  ipInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.textPrimary,
    ...typography.bodyBold,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  testLinkBtn: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accentBlue,
  },
  testLinkText: {
    ...typography.button,
    color: colors.accentBlue,
    fontSize: 13,
  },
  fieldHelper: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  instructionBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 4,
    marginTop: spacing.sm,
  },
  instructionTitle: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 4,
  },
  instructionItem: {
    ...typography.caption,
    color: colors.textSecondary,
    marginVertical: 1,
  },
  codeText: {
    color: colors.accentBlue,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  permRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  permInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  permTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  permDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  permBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
  },
  permBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: colors.success,
  },
  permBtnInactive: {
    backgroundColor: colors.primaryBright,
  },
  permBtnText: {
    ...typography.button,
    fontSize: 12,
    color: colors.white,
  },
  fallbackNote: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  fallbackNoteText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  whatsAppExplainer: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  whatsAppBadgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  waBadge: {
    backgroundColor: 'rgba(37, 211, 102, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.whatsappGreen,
  },
  waBadgeText: {
    fontSize: 11,
    color: colors.whatsappGreen,
    fontWeight: '700',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  aboutLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  aboutVal: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  buttonGroup: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  saveBtn: {
    backgroundColor: colors.primaryBright,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  saveBtnText: {
    ...typography.button,
    color: colors.white,
  },
  resetBtn: {
    backgroundColor: colors.surfaceLight,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetBtnText: {
    ...typography.button,
    color: colors.textSecondary,
    fontSize: 13,
  },
});

export default SettingsScreen;
