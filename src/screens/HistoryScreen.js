/**
 * HistoryScreen - SOS Incident Logs
 * Shows local timestamped history of all SOS events triggered manually or by ESP32.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';

export const HistoryScreen = ({ history = [], onClearHistory }) => {
  const handleClearPrompt = () => {
    Alert.alert(
      'Clear SOS History',
      'Are you sure you want to permanently clear the emergency audit history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: onClearHistory,
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenLabel}>AUDIT LOG</Text>
          <Text style={styles.screenTitle}>SOS Incident History</Text>
        </View>

        {history.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={handleClearPrompt}
            activeOpacity={0.8}
          >
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Emergency Incidents</Text>
            <Text style={styles.emptySubtitle}>
              When an SOS alert is initiated via the ESP32 push-button or the manual screen button, a record will be safely logged here.
            </Text>
          </View>
        ) : (
          history.map((event, index) => {
            const isEsp32 = event.triggerSource === 'ESP32';
            const isSent = event.status === 'Sent';

            return (
              <View key={event.id || index.toString()} style={styles.historyCard}>
                {/* Header row with date & status */}
                <View style={styles.cardHeader}>
                  <View style={styles.dateTimeContainer}>
                    <Text style={styles.dateText}>{event.dateString}</Text>
                    <Text style={styles.timeText}>{event.timeString}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      isSent ? styles.pillSuccess : styles.pillAlert,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: isSent ? colors.success : colors.warning },
                      ]}
                    >
                      Status: {event.status || 'Sent'}
                    </Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Source & Details */}
                <View style={styles.cardBody}>
                  <View style={styles.infoRow}>
                    <Text style={styles.fieldLabel}>Trigger Source:</Text>
                    <View style={styles.sourceBadge}>
                      <Text style={styles.sourceIcon}>{isEsp32 ? '📡' : '📱'}</Text>
                      <Text
                        style={[
                          styles.sourceText,
                          { color: isEsp32 ? colors.accentBlue : '#F59E0B' },
                        ]}
                      >
                        {isEsp32 ? 'Triggered by ESP32' : 'Triggered manually'}
                      </Text>
                    </View>
                  </View>

                  {event.details ? (
                    <View style={styles.detailsBox}>
                      <Text style={styles.detailsText}>{event.details}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  clearBtnText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '700',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...typography.subheading,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  dateText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  timeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  pillSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: colors.success,
  },
  pillAlert: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: colors.warning,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  cardBody: {},
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sourceIcon: {
    fontSize: 12,
  },
  sourceText: {
    ...typography.bodyBold,
    fontSize: 13,
  },
  detailsBox: {
    marginTop: spacing.xs,
    backgroundColor: colors.background,
    padding: spacing.xs + 4,
    borderRadius: borderRadius.sm,
  },
  detailsText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});

export default HistoryScreen;
