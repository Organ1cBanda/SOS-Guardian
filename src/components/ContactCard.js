/**
 * ContactCard Component
 * Displays emergency contact with actions for Edit, Delete, and Direct Call.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';

export const ContactCard = ({
  contact,
  index,
  onEdit,
  onDelete,
}) => {
  const getInitials = (name) => {
    if (!name) return 'SOS';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handlePhoneCall = () => {
    if (contact?.phone) {
      Linking.openURL(`tel:${contact.phone}`);
    }
  };

  return (
    <View style={styles.card}>
      {/* Left: Avatar with initials */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(contact.name)}</Text>
      </View>

      {/* Middle: Details */}
      <View style={styles.details}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{contact.name}</Text>
          <View style={styles.slotBadge}>
            <Text style={styles.slotText}>#{index + 1}</Text>
          </View>
        </View>
        <Text style={styles.phone}>{contact.phone}</Text>
      </View>

      {/* Right: Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtnCall}
          onPress={handlePhoneCall}
          accessibilityLabel={`Call ${contact.name}`}
        >
          <Text style={styles.btnIcon}>📞</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onEdit(contact)}
          accessibilityLabel={`Edit ${contact.name}`}
        >
          <Text style={styles.btnIcon}>✏️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnDelete]}
          onPress={() => onDelete(contact.id, contact.name)}
          accessibilityLabel={`Delete ${contact.name}`}
        >
          <Text style={styles.btnIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1.5,
    borderColor: colors.primaryBright,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 4,
  },
  avatarText: {
    ...typography.caption,
    color: colors.primaryBright,
    fontWeight: '800',
  },
  details: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    ...typography.subheading,
    color: colors.textPrimary,
  },
  slotBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  slotText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accentBlue,
  },
  phone: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnCall: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  btnIcon: {
    fontSize: 14,
  },
});

export default ContactCard;
