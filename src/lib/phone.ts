/**
 * Normalizes phone number for matching by removing all non-digits and country codes
 * Handles both DDI formats (55 prefix) and local numbers
 */
export function normalizeForMatch(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digits
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Handle Brazil DDI (55) and occasional trunk prefix '0'
  if (digitsOnly.startsWith('55') && digitsOnly.length > 11) {
    let rest = digitsOnly.substring(2);
    // Some sources include a trunk '0' after the country code, strip it
    if (rest.startsWith('0')) rest = rest.substring(1);
    return rest;
  }
  
  // If number starts with a trunk '0' locally (e.g., 0XX...), strip it for matching
  if (digitsOnly.length > 11 && digitsOnly.startsWith('0')) {
    return digitsOnly.substring(1);
  }
  
  return digitsOnly;
}

/**
 * Ensures phone number has Brazil country code (55) for sending messages
 */
export function ensureCountryCode55(phone: string): string {
  if (!phone) return '';
  
  const digitsOnly = phone.replace(/\D/g, '');
  
  // If already has 55 prefix and correct length, return as is
  if (digitsOnly.startsWith('55') && digitsOnly.length >= 13) {
    return digitsOnly;
  }
  
  // Add 55 prefix if missing
  return `55${digitsOnly}`;
}

/**
 * Formats phone number for display (with country code)
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return '';
  
  const normalized = ensureCountryCode55(phone);
  
  // Format as +55 (XX) XXXXX-XXXX
  if (normalized.length >= 13) {
    const country = normalized.substring(0, 2);
    const area = normalized.substring(2, 4);
    const firstPart = normalized.substring(4, 9);
    const secondPart = normalized.substring(9);
    
    return `+${country} (${area}) ${firstPart}-${secondPart}`;
  }
  
  return phone;
}

/**
 * Compares two phone numbers for equality ignoring formatting and DDI.
 * First compares normalized numbers, then falls back to safe suffix matching
 * using 11, 10, and 9 trailing digits.
 */
export function phonesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const na = normalizeForMatch(a);
  const nb = normalizeForMatch(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const tryLens = [11, 10, 9, 8];
  for (const len of tryLens) {
    if (na.length >= len && nb.length >= len) {
      if (na.slice(-len) === nb.slice(-len)) return true;
    }
  }
  return false;
}
