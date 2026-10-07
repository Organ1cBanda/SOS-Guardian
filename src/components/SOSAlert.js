/**
 * SOSAlert Component
 * Full-screen critical emergency alert screen.
 * Triggers sound & vibration, displays "SOS ACTIVATED", dispatches SMS to contacts,
 * and provides automated WhatsApp with live location.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';
import {
  openWhatsAppEmergencyChat,
  isAccessibilityServiceActive,
  openAccessibilitySettings,
} from '../services/smsService';

export const SOSAlert = ({
  visible,
  triggerSource = 'ESP32',
  contacts = [],
  sosMessage,
  dispatchStatus,
  onDismiss,
}) => {
  const flashAnim = useRef(new Animated.Value(0)).current;
  const [selectedWhatsAppIndex, setSelectedWhatsAppIndex] = useState(null);
  const [isAccessibilityActive, setIsAccessibilityActive] = useState(false);
  const [isBroadcastingWhatsApp, setIsBroadcastingWhatsApp] = useState(false);

  // Check accessibility status when alert becomes visible
  useEffect(() => {
    if (visible) {
      isAccessibilityServiceActive().then((active) => {
        setIsAccessibilityActive(active);
      });
    }
  }, [visible]);

  // Red strobe flash animation for emergency warning
  useEffect(() => {
    if (visible) {
      const flashLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(flashAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(flashAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: false,
          }),
        ])
      );
      flashLoop.start();

      return () => flashLoop.stop();
    }
  }, [visible, flashAnim]);

  const flashBgColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.primaryDark, colors.primaryBright],
  });

  const handleOpenWhatsAppForContact = async (contact, index) => {
    setSelectedWhatsAppIndex(index);
    await openWhatsAppEmergencyChat(contact.phone, sosMessage);
    setSelectedWhatsAppIndex(null);
  };

  const handleBroadcastAllWhatsApp = async () => {
    if (!contacts || contacts.length === 0) return;
    setIsBroadcastingWhatsApp(true);
    // Open primary contact first
    await openWhatsAppEmergencyChat(contacts[0].phone, sosMessage);
    setIsBroadcastingWhatsApp(false);
  };

  const hasLiveLocation = sosMessage && sosMessage.includes('maps.google.com');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onDismiss}
    >
      <View style={styles.container}>
        {/* Flashing Emergency Header */}
        <Animated.View style={[styles.alertHeader, { backgroundColor: flashBgColor }]}>
          <Text style={styles.alertSiren}>🚨🚨🚨</Text>
          <Text style={styles.alertTitle}>SOS ACTIVATED</Text>
          <Text style={styles.alertSubtitle}>EMERGENCY PROTOCOL ENGAGED</Text>
          <View style={styles.sourceTag}>
            <Text style={styles.sourceTagText}>
              SOURCE: {triggerSource === 'ESP32' ? 'NODEMCU HARDWARE (3s HOLD)' : 'MANUAL APP TRIGGER'}
            </Text>
          </View>
        </Animated.View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {/* Audio & Vibration Banner */}
          <View style={styles.sensoryBanner}>
            <View style={styles.sensoryItem}>
              <Text style={styles.sensoryIcon}>🔊</Text>
              <Text style={styles.sensoryText}>Siren Sounding</Text>
            </View>
            <View style={styles.sensoryDivider} />
            <View style={styles.sensoryItem}>
              <Text style={styles.sensoryIcon}>📳</Text>
              <Text style={styles.sensoryText}>Strong Vibration</Text>
            </View>
          </View>

          {/* SOS Message Card */}
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.cardSectionTitle}>TRANSMITTED EMERGENCY MESSAGE</Text>
              {hasLiveLocation && (
                <View style={styles.gpsActiveBadge}>
                  <Text style={styles.gpsBadgeText}>📍 LIVE GPS ATTACHED</Text>
                </View>
              )}
            </View>
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{sosMessage}</Text>
            </View>
          </View>

          {/* Contacts Dispatch Summary */}
          <View style={styles.card}>
            <View style={styles.dispatchHeaderRow}>
              <Text style={styles.cardSectionTitle}>EMERGENCY RECIPIENTS ({contacts.length}/5)</Text>
              {dispatchStatus?.isSending ? (
                <View style={styles.sendingBadge}>
                  <ActivityIndicator size="small" color={colors.warning} />
                  <Text style={styles.sendingText}>Sending SMS...</Text>
                </View>
              ) : (
                <View style={[styles.statusPill, dispatchStatus?.success ? styles.pillSuccess : styles.pillWarning]}>
                  <Text style={styles.pillText}>
                    {dispatchStatus?.success ? 'SMS Dispatched Automatically' : 'SMS Pending'}
                  </Text>
                </View>
              )}
            </View>

            {contacts.length === 0 ? (
              <View style={styles.emptyContactsNotice}>
                <Text style={styles.emptyText}>⚠️ No emergency contacts configured!</Text>
                <Text style={styles.emptySubText}>Please configure contacts in the Contacts tab.</Text>
              </View>
            ) : (
              contacts.map((contact, index) => (
                <View key={contact.id || index.toString()} style={styles.contactRow}>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                  </View>

                  <View style={styles.rowActions}>
                    {/* Direct SMS Badge */}
                    <View style={styles.deliveryBadge}>
                      <Text style={styles.deliveryCheck}>✓</Text>
                      <Text style={styles.deliveryText}>SMS Sent</Text>
                    </View>

                    {/* WhatsApp Action Button */}
                    <TouchableOpacity
                      style={styles.whatsAppQuickBtn}
                      onPress={() => handleOpenWhatsAppForContact(contact, index)}
                      activeOpacity={0.8}
                    >
                      {selectedWhatsAppIndex === index ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <Text style={styles.whatsAppQuickText}>💬 WhatsApp</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            {/* Accessibility Auto-Send Helper */}
            <View style={styles.autoSendBanner}>
              {isAccessibilityActive ? (
                <View style={styles.autoSendActiveBox}>
                  <Text style={styles.autoSendActiveIcon}>⚡</Text>
                  <Text style={styles.autoSendActiveText}>
                    WhatsApp Auto-Send Active: When WhatsApp opens, it automatically sends the message & location!
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.autoSendEnableBtn}
                  onPress={openAccessibilitySettings}
                  activeOpacity={0.8}
                >
                  <Text style={styles.autoSendEnableTitle}>⚙️ Enable 100% Automatic WhatsApp Send</Text>
                  <Text style={styles.autoSendEnableDesc}>
                    Tap to turn on SOS Guardian Accessibility Service so WhatsApp automatically sends without pressing Send.
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Bottom Safety Action: Stop Siren & Dismiss */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            activeOpacity={0.85}
          >
            <Text style={styles.dismissButtonText}>MUTE ALARM & RESOLVE SOS</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  alertHeader: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
  },
  alertSiren: {
    fontSize: 32,
    marginBottom: 4,
  },
  alertTitle: {
    ...typography.sosDisplay,
    color: colors.white,
    letterSpacing: 3,
  },
  alertSubtitle: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 2,
  },
  sourceTag: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  sourceTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing.md,
  },
  sensoryBanner: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  sensoryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sensoryDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  sensoryIcon: {
    fontSize: 18,
  },
  sensoryText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardSectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    letterSpacing: 1,
    fontWeight: '800',
  },
  gpsActiveBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.success,
  },
  gpsBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
    letterSpacing: 0.5,
  },
  messageBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryBright,
  },
  messageText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  dispatchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sendingText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pillSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  pillWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  emptyContactsNotice: {
    padding: spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  emptyText: {
    ...typography.bodyBold,
    color: colors.primaryBright,
  },
  emptySubText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  contactPhone: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.success,
  },
  deliveryCheck: {
    color: colors.success,
    fontWeight: '800',
    marginRight: 4,
    fontSize: 12,
  },
  deliveryText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '700',
  },
  whatsAppQuickBtn: {
    backgroundColor: colors.whatsappGreen,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsAppQuickText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
  },
  autoSendBanner: {
    marginTop: spacing.md,
  },
  autoSendActiveBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    padding: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.success,
    gap: 8,
  },
  autoSendActiveIcon: {
    fontSize: 16,
  },
  autoSendActiveText: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 16,
    fontWeight: '600',
  },
  autoSendEnableBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    padding: spacing.sm + 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  autoSendEnableTitle: {
    ...typography.caption,
    color: '#60A5FA',
    fontWeight: '800',
  },
  autoSendEnableDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  footer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dismissButton: {
    backgroundColor: '#334155',
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#64748B',
  },
  dismissButtonText: {
    ...typography.button,
    color: colors.white,
    letterSpacing: 1,
  },
});

export default SOSAlert;
