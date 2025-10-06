/**
 * Detects and removes incorporated suffixes from phone numbers
 * Brazilian numbers should have 11 digits (DDD + 9 digits for mobile)
 * If a number has 13+ digits after DDI, it likely has an incorporated suffix
 */
function detectAndRemoveIncorporatedSuffix(digitsOnly: string): string {
  // Brazilian format: 55 (DDI) + 11 digits (DDD + number)
  // Total expected: 13 digits
  if (digitsOnly.startsWith('55') && digitsOnly.length > 13) {
    // Try removing last 2 digits (common suffixes like :57, :18)
    const withoutLast2 = digitsOnly.slice(0, -2);
    if (withoutLast2.length === 13) {
      return withoutLast2;
    }
    
    // Try removing last 3 digits
    const withoutLast3 = digitsOnly.slice(0, -3);
    if (withoutLast3.length === 13) {
      return withoutLast3;
    }
  }
  
  return digitsOnly;
}

/**
 * Normalizes phone number for matching by removing all non-digits and country codes
 * Handles both DDI formats (55 prefix) and local numbers
 * Also removes Evolution API suffixes like :57, :18, etc.
 * CRITICAL: This function ensures all phone numbers are compared in the same format
 */
export function normalizeForMatch(phone: string): string {
  if (!phone) return '';
  
  // First, remove Evolution API suffixes (ex: 5512974012534:57 -> 5512974012534)
  // CRITICAL: Do this BEFORE any other processing
  phone = phone.replace(/:[0-9]+$/g, '');
  
  // Remove WhatsApp JID suffixes
  phone = phone.replace('@s.whatsapp.net', '').replace('@g.us', '');
  
  // Remove all non-digits
  let digitsOnly = phone.replace(/\D/g, '');
  
  if (!digitsOnly) return '';
  
  // Detect and remove incorporated suffixes (e.g., 551297401253457 -> 5512974012534)
  digitsOnly = detectAndRemoveIncorporatedSuffix(digitsOnly);
  
  // Handle Brazil DDI (55) and occasional trunk prefix '0'
  if (digitsOnly.startsWith('55')) {
    let rest = digitsOnly.substring(2);
    // Some sources include a trunk '0' after the country code, strip it
    if (rest.startsWith('0')) rest = rest.substring(1);
    return rest;
  }
  
  // If number starts with a trunk '0' locally (e.g., 0XX...), strip it for matching
  if (digitsOnly.startsWith('0')) {
    return digitsOnly.substring(1);
  }
  
  return digitsOnly;
}

/**
 * Ensures phone number has Brazil country code (55) for sending messages
 * Also removes Evolution API suffixes
 */
export function ensureCountryCode55(phone: string): string {
  if (!phone) return '';
  
  // Remove Evolution API suffixes (ex: 5512974012534:57 -> 5512974012534)
  phone = phone.replace(/:[0-9]+$/g, '');
  
  // Remove WhatsApp JID suffixes
  phone = phone.replace('@s.whatsapp.net', '').replace('@g.us', '');
  
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
 * using 11, 10, 9, and 8 trailing digits.
 * CRITICAL: This ensures numbers with different formats (with/without DDI, with/without suffixes) match correctly
 */
export function phonesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  
  // Normalize both numbers first (removes suffixes, DDI, etc.)
  const na = normalizeForMatch(a);
  const nb = normalizeForMatch(b);
  
  if (!na || !nb) return false;
  
  // Direct match after normalization
  if (na === nb) return true;
  
  // Fallback: compare last N digits (handles edge cases)
  // This is important for cases where one number has DDI and the other doesn't
  const tryLens = [11, 10, 9, 8];
  for (const len of tryLens) {
    if (na.length >= len && nb.length >= len) {
      if (na.slice(-len) === nb.slice(-len)) return true;
    }
  }
  
  return false;
}

/**
 * Validates Brazilian phone number format
 * Returns object with isValid flag and error message if invalid
 */
/**
 * Validates Brazilian phone number format
 * Returns object with isValid flag and error message if invalid
 */
export function validateBrazilianPhone(phone: string): { 
  isValid: boolean; 
  error?: string 
} {
  if (!phone) {
    return { 
      isValid: false, 
      error: 'Número de telefone é obrigatório' 
    };
  }

  // Remove formatação e sufixos
  let digitsOnly = phone.replace(/\D/g, '');
  
  // Remove DDI 55 se presente
  if (digitsOnly.startsWith('55')) {
    digitsOnly = digitsOnly.substring(2);
  }
  
  // Valida tamanho (11 dígitos: 2 DDD + 9 número)
  if (digitsOnly.length !== 11) {
    return { 
      isValid: false, 
      error: 'Número inválido. Formato esperado: (XX) 9XXXX-XXXX com 11 dígitos' 
    };
  }
  
  // Valida DDD (11-99)
  const ddd = parseInt(digitsOnly.substring(0, 2));
  if (ddd < 11 || ddd > 99) {
    return { 
      isValid: false, 
      error: 'DDD inválido. Use um DDD válido entre 11 e 99' 
    };
  }
  
  // Valida se é celular (começa com 9)
  if (digitsOnly[2] !== '9') {
    return { 
      isValid: false, 
      error: 'Número deve ser celular (começar com 9 após o DDD)' 
    };
  }
  
  return { isValid: true };
}

/**
 * Checks if a phone number is a Brazilian mobile number
 * Returns true if it's a valid Brazilian mobile (11 digits with 9 prefix)
 */
export function isBrazilianMobile(phone: string): boolean {
  if (!phone) return false;
  
  // Remove formatação
  let digitsOnly = phone.replace(/\D/g, '');
  
  // Remove DDI 55 se presente
  if (digitsOnly.startsWith('55')) {
    digitsOnly = digitsOnly.substring(2);
  }
  
  // Verifica se tem 11 dígitos e começa com 9
  return digitsOnly.length === 11 && digitsOnly[2] === '9';
}
