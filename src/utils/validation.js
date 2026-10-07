/**
 * Validation utilities for SOS Guardian
 */

export const MAX_CONTACTS = 5;

/**
 * Normalizes and validates a phone number.
 * Accepts international numbers with or without '+' and 10 to 15 digits.
 * @param {string} phone 
 * @returns {{ isValid: boolean, error?: string, sanitizedPhone?: string }}
 */
export const validatePhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: 'Phone number cannot be empty.' };
  }

  // Remove whitespace, dashes, parentheses
  let cleaned = phone.replace(/[\s\-()]/g, '');

  if (cleaned.length === 0) {
    return { isValid: false, error: 'Phone number cannot be empty.' };
  }

  // If number starts with 0 and is 11 digits (e.g. 09876543210 in India), strip the leading 0
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // If 10 digits without country code, automatically prepend +91 (India)
  if (cleaned.length === 10 && !cleaned.startsWith('+')) {
    cleaned = `+91${cleaned}`;
  } else if (!cleaned.startsWith('+')) {
    cleaned = `+${cleaned}`;
  }

  // Check format: + followed by 10 to 15 digits
  const phoneRegex = /^\+[0-9]{10,15}$/;
  if (!phoneRegex.test(cleaned)) {
    return {
      isValid: false,
      error: 'Please enter a valid phone number (e.g. +919876543210 or 10-digit mobile number 9876543210).'
    };
  }

  return { isValid: true, sanitizedPhone: cleaned };
};

/**
 * Validates a contact's name.
 * @param {string} name 
 * @returns {{ isValid: boolean, error?: string }}
 */
export const validateContactName = (name) => {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { isValid: false, error: 'Contact name cannot be empty.' };
  }

  if (name.trim().length > 40) {
    return { isValid: false, error: 'Contact name must be 40 characters or fewer.' };
  }

  return { isValid: true };
};

/**
 * Validates full contact object.
 * @param {{ name: string, phone: string }} contact 
 * @returns {{ isValid: boolean, error?: string, sanitizedPhone?: string }}
 */
export const validateContact = (contact) => {
  const nameValidation = validateContactName(contact?.name);
  if (!nameValidation.isValid) {
    return nameValidation;
  }

  const phoneValidation = validatePhoneNumber(contact?.phone);
  if (!phoneValidation.isValid) {
    return phoneValidation;
  }

  return {
    isValid: true,
    sanitizedPhone: phoneValidation.sanitizedPhone,
  };
};

/**
 * Validates IPv4 address string.
 * @param {string} ip 
 * @returns {boolean}
 */
export const validateIpAddress = (ip) => {
  if (!ip || typeof ip !== 'string') return false;
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip.trim());
};
