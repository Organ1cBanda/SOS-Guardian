/**
 * SOSButton Component
 * Large emergency trigger button with a 3-second countdown confirmation
 * modal to eliminate accidental activation.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Vibration,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';

export const SOSButton = ({ onTriggerSos, disabled = false }) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const countdownTimerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for the button
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => pulseLoop.stop();
  }, [pulseAnim]);

  // Handle countdown sequence
  useEffect(() => {
    if (isConfirming) {
      // Haptic tick on start
      try {
        Vibration.vibrate(100);
      } catch (e) {}

      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current);
            setIsConfirming(false);
            setCountdown(3);
            // Trigger emergency!
            onTriggerSos('MANUAL');
            return 3;
          }
          // Haptic tick every second
          try {
            Vibration.vibrate(80);
          } catch (e) {}
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      setCountdown(3);
    }

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [isConfirming, onTriggerSos]);

  const handlePressInit = () => {
    if (disabled) return;
    setIsConfirming(true);
    setCountdown(3);
  };

  const handleCancelCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    setIsConfirming(false);
    setCountdown(3);
  };

  const handleInstantDispatch = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    setIsConfirming(false);
    setCountdown(3);
    onTriggerSos('MANUAL');
  };

  return (
    <View style={styles.container}>
      {/* Outer Pulse Glow Ring */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      {/* Main Touch Target */}
      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={handlePressInit}
        activeOpacity={0.85}
        disabled={disabled}
      >
        <View style={styles.innerCircle}>
          <Text style={styles.sosSymbol}>🚨</Text>
          <Text style={styles.sosText}>SOS</Text>
          <Text style={styles.subText}>PRESS TO ACTIVATE</Text>
        </View>
      </TouchableOpacity>

      {/* 3-Second Confirmation Modal */}
      <Modal
        visible={isConfirming}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelCountdown}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.countdownCard}>
            <View style={styles.warningHeader}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningTitle}>ACTIVATING SOS IN</Text>
            </View>

            {/* Huge Countdown Number */}
            <View style={styles.countdownCircle}>
              <Text style={styles.countdownNumber}>{countdown}</Text>
              <Text style={styles.countdownUnit}>SECONDS</Text>
            </View>

            <Text style={styles.disclaimerText}>
              Emergency alerts will be dispatched to all 5 contacts and loud siren will activate.
            </Text>

            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelCountdown}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>CANCEL (SAFE)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.instantButton}
                onPress={handleInstantDispatch}
                activeOpacity={0.8}
              >
                <Text style={styles.instantButtonText}>SEND NOW</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(220, 38, 38, 0.22)',
  },
  button: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
    shadowColor: colors.primaryBright,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    borderWidth: 4,
    borderColor: '#FCA5A5',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  innerCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosSymbol: {
    fontSize: 28,
    marginBottom: -2,
  },
  sosText: {
    ...typography.sosDisplay,
    color: colors.white,
    marginTop: -2,
  },
  subText: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  countdownCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '90%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primaryBright,
    elevation: 16,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  warningIcon: {
    fontSize: 22,
    marginRight: 8,
  },
  warningTitle: {
    ...typography.heading,
    color: colors.primaryBright,
    letterSpacing: 1.5,
  },
  countdownCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.primaryDark,
    borderWidth: 3,
    borderColor: colors.primaryBright,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.md,
  },
  countdownNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.white,
    lineHeight: 52,
  },
  countdownUnit: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 1,
  },
  disclaimerText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  instantButton: {
    flex: 1,
    backgroundColor: colors.primaryBright,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  instantButtonText: {
    ...typography.button,
    color: colors.white,
  },
});

export default SOSButton;
