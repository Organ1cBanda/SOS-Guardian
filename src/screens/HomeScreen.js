/**
 * HomeScreen - SOS Guardian Emergency Dashboard
 * Displays connection state, quick stats, last alert event, and prominent manual SOS trigger.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { SOSButton } from '../components/SOSButton';

export const HomeScreen = ({
  isConnected,
  esp32Ip,
  contactsCount = 0,
  lastEvent = null,
  onTriggerSos,
  onTestConnection,
  onNavigateToContacts,
  onNavigateToSettings,
}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [latencyMs, setLatencyMs] = useState(null);

  const handleTestLink = async () => {
    setIsTesting(true);
    const result = await onTestConnection();
    setIsTesting(false);
    if (result && result.latencyMs) {
      setLatencyMs(result.latencyMs);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* App Title Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appSuper}>EMERGENCY PROTOCOL</Text>
            <Text style={styles.appTitle}>SOS GUARDIAN</Text>
          </View>
          <View style={styles.statusIndicatorHeader}>
            <View
              style={[
                styles.headerPulseDot,
                { backgroundColor: isConnected ? colors.success : colors.danger },
              ]}
            />
            <Text
              style={[
                styles.headerStatusText,
                { color: isConnected ? colors.success : colors.danger },
              ]}
            >
              {isConnected ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsRow}>
          {/* Emergency Contacts Card */}
          <TouchableOpacity
            style={styles.statCard}
            onPress={onNavigateToContacts}
            activeOpacity={0.8}
          >
            <Text style={styles.statLabel}>EMERGENCY CONTACTS</Text>
            <View style={styles.statValueContainer}>
              <Text
                style={[
                  styles.statValue,
                  contactsCount > 0 ? styles.statValueGood : styles.statValueAlert,
                ]}
              >
                {contactsCount}
              </Text>
              <Text style={styles.statMax}> / 5</Text>
            </View>
            <Text style={styles.statSubText}>
              {contactsCount === 0 ? '⚠️ Add Contacts' : 'Ready for Alert'}
            </Text>
          </TouchableOpacity>

          {/* Device Link Card */}
          <TouchableOpacity
            style={styles.statCard}
            onPress={onNavigateToSettings}
            activeOpacity={0.8}
          >
            <Text style={styles.statLabel}>NODEMCU WI-FI LINK</Text>
            <View style={styles.statValueContainer}>
              <Text
                style={[
                  styles.statValue,
                  isConnected ? styles.statValueGood : styles.statValueAlert,
                ]}
              >
                {isConnected ? 'LINKED' : 'NO LINK'}
              </Text>
            </View>
            <Text style={styles.statSubText}>{esp32Ip || '192.168.4.1'}</Text>
          </TouchableOpacity>
        </View>

        {/* ESP32 / NodeMCU Hardware Status Card */}
        <ConnectionStatus
          isConnected={isConnected}
          esp32Ip={esp32Ip}
          isTesting={isTesting}
          onTestConnection={handleTestLink}
          latencyMs={latencyMs}
        />

        {/* Primary SOS Button Section */}
        <View style={styles.sosSection}>
          <Text style={styles.sosSectionTitle}>EMERGENCY DISPATCH</Text>
          <Text style={styles.sosInstructions}>
            Tap below or hold physical NodeMCU (Pin D2) for 3 seconds
          </Text>

          <SOSButton onTriggerSos={onTriggerSos} />

          <Text style={styles.countdownSafetyNote}>
            🛡️ 3-Second Confirmation Modal prevents accidental taps
          </Text>
        </View>

        {/* Last SOS Event Summary Card */}
        <View style={styles.lastAlertCard}>
          <View style={styles.lastAlertHeader}>
            <Text style={styles.lastAlertIcon}>🕒</Text>
            <Text style={styles.lastAlertTitle}>LAST SOS EVENT</Text>
          </View>

          {lastEvent ? (
            <View style={styles.eventDetailsBox}>
              <View style={styles.eventRow}>
                <Text style={styles.eventField}>Timestamp:</Text>
                <Text style={styles.eventVal}>
                  {lastEvent.dateString} at {lastEvent.timeString}
                </Text>
              </View>
              <View style={styles.eventRow}>
                <Text style={styles.eventField}>Trigger:</Text>
                <Text
                  style={[
                    styles.eventVal,
                    {
                      color:
                        lastEvent.triggerSource === 'ESP32'
                          ? colors.accentBlue
                          : colors.warning,
                      fontWeight: '700',
                    },
                  ]}
                >
                  {lastEvent.triggerSource === 'ESP32'
                    ? 'ESP32 Hardware (3s hold)'
                    : 'Manual Screen Trigger'}
                </Text>
              </View>
              <View style={styles.eventRow}>
                <Text style={styles.eventField}>Status:</Text>
                <Text style={[styles.eventVal, { color: colors.success, fontWeight: '700' }]}>
                  {lastEvent.status || 'Sent'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyEventBox}>
              <Text style={styles.emptyEventText}>No SOS triggered yet. System ready.</Text>
            </View>
          )}
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
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  appSuper: {
    ...typography.caption,
    color: colors.primaryBright,
    fontWeight: '800',
    letterSpacing: 2,
  },
  appTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  statusIndicatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  headerStatusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  statValueGood: {
    color: colors.textPrimary,
  },
  statValueAlert: {
    color: colors.danger,
  },
  statMax: {
    ...typography.caption,
    color: colors.textMuted,
  },
  statSubText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  sosSection: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  sosSectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    letterSpacing: 1.5,
    fontWeight: '800',
  },
  sosInstructions: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 4,
  },
  countdownSafetyNote: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 6,
  },
  lastAlertCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  lastAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  lastAlertIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  lastAlertTitle: {
    ...typography.caption,
    color: colors.textMuted,
    letterSpacing: 1,
    fontWeight: '800',
  },
  eventDetailsBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 4,
  },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  eventField: {
    ...typography.body,
    color: colors.textSecondary,
  },
  eventVal: {
    ...typography.body,
    color: colors.textPrimary,
  },
  emptyEventBox: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  emptyEventText: {
    ...typography.body,
    color: colors.textMuted,
  },
});

export default HomeScreen;
