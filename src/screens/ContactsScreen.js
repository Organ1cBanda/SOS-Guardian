/**
 * ContactsScreen - Emergency Contacts Manager
 * Manages up to 5 emergency contacts with local AsyncStorage persistence,
 * strict phone number validation, add/edit/delete, and maximum quota enforcement.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';
import { ContactCard } from '../components/ContactCard';
import { MAX_CONTACTS, validateContact } from '../utils/validation';

export const ContactsScreen = ({
  contacts = [],
  onAddContact,
  onUpdateContact,
  onDeleteContact,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContactId, setEditingContactId] = useState(null);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [formError, setFormError] = useState('');

  const isAtMaxCapacity = contacts.length >= MAX_CONTACTS;

  const handleOpenAddModal = () => {
    if (isAtMaxCapacity) {
      Alert.alert(
        'Maximum Limit Reached',
        `You have already configured all ${MAX_CONTACTS} emergency contacts. Delete or edit an existing contact to change.`
      );
      return;
    }
    setEditingContactId(null);
    setNameInput('');
    setPhoneInput('');
    setFormError('');
    setModalVisible(true);
  };

  const handleOpenEditModal = (contact) => {
    setEditingContactId(contact.id);
    setNameInput(contact.name);
    setPhoneInput(contact.phone);
    setFormError('');
    setModalVisible(true);
  };

  const handleSaveContact = async () => {
    setFormError('');

    const validation = validateContact({
      name: nameInput,
      phone: phoneInput,
    });

    if (!validation.isValid) {
      setFormError(validation.error);
      return;
    }

    try {
      if (editingContactId) {
        await onUpdateContact(editingContactId, {
          name: nameInput.trim(),
          phone: validation.sanitizedPhone,
        });
      } else {
        await onAddContact({
          name: nameInput.trim(),
          phone: validation.sanitizedPhone,
        });
      }
      setModalVisible(false);
    } catch (err) {
      setFormError(err.message || 'Failed to save contact.');
    }
  };

  const handleDeletePrompt = (id, name) => {
    Alert.alert(
      'Remove Contact',
      `Are you sure you want to remove "${name}" from emergency contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onDeleteContact(id),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenLabel}>DIRECTORY</Text>
          <Text style={styles.screenTitle}>Emergency Contacts</Text>
        </View>

        {/* Counter Badge */}
        <View
          style={[
            styles.countBadge,
            isAtMaxCapacity ? styles.badgeFull : styles.badgeAvailable,
          ]}
        >
          <Text style={styles.countText}>
            {contacts.length} / {MAX_CONTACTS}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerIcon}>ℹ️</Text>
          <Text style={styles.infoBannerText}>
            When an SOS is activated, SMS alerts will be transmitted to all {contacts.length} configured contacts simultaneously.
          </Text>
        </View>

        {/* Contact List */}
        {contacts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No Emergency Contacts Configured</Text>
            <Text style={styles.emptySubtitle}>
              Add up to 5 trusted family members or friends who should receive immediate distress alerts.
            </Text>
          </View>
        ) : (
          contacts.map((contact, index) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              index={index}
              onEdit={handleOpenEditModal}
              onDelete={handleDeletePrompt}
            />
          ))
        )}

        {/* Add Contact Button */}
        {!isAtMaxCapacity && (
          <TouchableOpacity
            style={styles.addContactButton}
            onPress={handleOpenAddModal}
            activeOpacity={0.8}
          >
            <Text style={styles.addIcon}>＋</Text>
            <Text style={styles.addText}>Add Emergency Contact</Text>
          </TouchableOpacity>
        )}

        {isAtMaxCapacity && (
          <View style={styles.maxCapacityBanner}>
            <Text style={styles.maxCapacityText}>
              ✓ Maximum capacity reached ({MAX_CONTACTS}/{MAX_CONTACTS} contacts saved)
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Contact Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingContactId ? 'Edit Contact' : 'Add Emergency Contact'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {formError.length > 0 && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>⚠️ {formError}</Text>
              </View>
            )}

            {/* Input: Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FULL NAME OR RELATION *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Mom, Brother, Dr. Smith"
                placeholderTextColor={colors.textMuted}
                value={nameInput}
                onChangeText={setNameInput}
                autoCapitalize="words"
              />
            </View>

            {/* Input: Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PHONE NUMBER (WITH COUNTRY CODE) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. +919876543210 or 9876543210"
                placeholderTextColor={colors.textMuted}
                value={phoneInput}
                onChangeText={setPhoneInput}
                keyboardType="phone-pad"
              />
              <Text style={styles.inputHelper}>
                Include country code for international SMS reliability.
              </Text>
            </View>

            {/* Modal Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveContact}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSaveText}>
                  {editingContactId ? 'Save Changes' : 'Add Contact'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  badgeAvailable: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: colors.accentBlue,
  },
  badgeFull: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: colors.success,
  },
  countText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoBannerIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  infoBannerText: {
    flex: 1,
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
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
  },
  addContactButton: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.accentBlue,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  addIcon: {
    color: colors.accentBlue,
    fontSize: 18,
    fontWeight: '800',
    marginRight: 8,
  },
  addText: {
    ...typography.button,
    color: colors.accentBlue,
    fontSize: 14,
  },
  maxCapacityBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  maxCapacityText: {
    ...typography.bodyBold,
    color: colors.success,
  },

  // Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalCloseIcon: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.textPrimary,
    ...typography.bodyBold,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputHelper: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalCancelText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: colors.primaryBright,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalSaveText: {
    ...typography.button,
    color: colors.white,
  },
});

export default ContactsScreen;
