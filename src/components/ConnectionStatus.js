/**
 * ConnectionStatus Component
 * Displays ESP32 Wi-Fi connection indicator, diagnostic info, and Quick Test action.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';

export const ConnectionStatus = ({
  isConnected,
  esp32Ip,
  isTesting,
  onTestConnection,
  latencyMs,
}) => {
  return (
    <View style={[styles.card, isConnected ? styles.cardConnected : styles.cardDisconnected]}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.deviceLabel}>HARDWARE LINK</Text>
          <Text style={styles.deviceTitle}>NodeMCU / ESP8266 Trigger</Text>
        </View>

        <View style={[styles.statusBadge, isConnected ? styles.badgeConnected : styles.badgeDisconnected]}>
          <View style={[styles.statusDot, isConnected ? styles.dotConnected : styles.dotDisconnected]} />
          <Text style={[styles.statusText, isConnected ? styles.textConnected : styles.textDisconnected]}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      </View>

      {/* Network details & guidance */}
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Device IP:</Text>
          <Text style={styles.infoValue}>{esp32Ip || '192.168.4.1'}</Text>
        </View>

        {isConnected ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Signal Latency:</Text>
            <Text style={[styles.infoValue, { color: colors.success }]}>
              {latencyMs ? `${latencyMs}ms (Healthy)` : '< 50ms (Active)'}
            </Text>
          </View>
        ) : (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              ⚠️ Connect your phone to <Text style={styles.ssidHighlight}>SOS_DEVICE</Text> Wi-Fi
            </Text>
            <Text style={styles.subWarningText}>
              Default Password: <Text style={styles.pwdHighlight}>12345678</Text>
            </Text>
          </View>
        )}
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.testButton, isTesting && styles.testButtonDisabled]}
        onPress={onTestConnection}
        disabled={isTesting}
        activeOpacity={0.8}
      >
        {isTesting ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.white} />
            <Text style={styles.testButtonText}>Checking Link...</Text>
          </View>
        ) : (
          <Text style={styles.testButtonText}>
            {isConnected ? '✓ Test Connection' : '🔄 Retry Connection'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 1.5,
  },
  cardConnected: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  cardDisconnected: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  deviceLabel: {
    ...typography.caption,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  deviceTitle: {
    ...typography.subheading,
    color: colors.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
  },
  badgeConnected: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: colors.success,
  },
  badgeDisconnected: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotConnected: {
    backgroundColor: colors.success,
  },
  dotDisconnected: {
    backgroundColor: colors.danger,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '700',
  },
  textConnected: {
    color: colors.success,
  },
  textDisconnected: {
    color: colors.danger,
  },
  infoSection: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 4,
    marginVertical: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  infoLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  warningContainer: {
    marginVertical: 4,
  },
  warningText: {
    ...typography.bodyBold,
    color: '#F87171',
    marginBottom: 2,
  },
  ssidHighlight: {
    color: colors.white,
    fontWeight: '800',
  },
  subWarningText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  pwdHighlight: {
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  testButton: {
    backgroundColor: colors.surfaceLight,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  testButtonDisabled: {
    opacity: 0.7,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testButtonText: {
    ...typography.button,
    fontSize: 13,
    color: colors.textPrimary,
  },
});

export default ConnectionStatus;
