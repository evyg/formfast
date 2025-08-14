/**
 * Input sanitization utilities for security
 */

// HTML entities to escape
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
  '=': '&#x3D;',
};

/**
 * Escape HTML entities to prevent XSS attacks
 */
export function escapeHtml(input: string): string {
  if (typeof input !== 'string') {
    return String(input);
  }
  
  return input.replace(/[&<>"'`=/]/g, (match) => HTML_ENTITIES[match] || match);
}

/**
 * Remove or escape potentially dangerous characters from user input
 */
export function sanitizeInput(input: string, options: {
  allowHtml?: boolean;
  maxLength?: number;
  allowedCharacters?: RegExp;
} = {}): string {
  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input.trim();

  // Apply length limit
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  // Remove or escape HTML unless explicitly allowed
  if (!options.allowHtml) {
    sanitized = escapeHtml(sanitized);
  }

  // Apply character whitelist if provided
  if (options.allowedCharacters) {
    sanitized = sanitized.replace(options.allowedCharacters, '');
  }

  // Remove null bytes and other control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Sanitize form data object
 */
export function sanitizeFormData(
  data: Record<string, unknown>,
  fieldRules: Record<string, {
    required?: boolean;
    maxLength?: number;
    allowHtml?: boolean;
    pattern?: RegExp;
    sanitizer?: (value: unknown) => string;
  }> = {}
): { sanitized: Record<string, string>; errors: string[] } {
  const sanitized: Record<string, string> = {};
  const errors: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    const rules = fieldRules[key] || {};
    
    // Skip if value is null/undefined and not required
    if (value == null) {
      if (rules.required) {
        errors.push(`${key} is required`);
      }
      continue;
    }

    // Convert to string
    let stringValue = String(value);

    // Apply custom sanitizer if provided
    if (rules.sanitizer) {
      try {
        stringValue = rules.sanitizer(value);
      } catch (error) {
        errors.push(`Invalid ${key}: sanitization failed`);
        continue;
      }
    } else {
      // Apply default sanitization
      stringValue = sanitizeInput(stringValue, {
        maxLength: rules.maxLength,
        allowHtml: rules.allowHtml,
      });
    }

    // Validate pattern if provided
    if (rules.pattern && !rules.pattern.test(stringValue)) {
      errors.push(`${key} format is invalid`);
      continue;
    }

    // Check required after sanitization
    if (rules.required && !stringValue.trim()) {
      errors.push(`${key} is required`);
      continue;
    }

    sanitized[key] = stringValue;
  }

  return { sanitized, errors };
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') {
    return 'file';
  }

  // Remove path separators and dangerous characters
  let sanitized = filename
    .replace(/[/\\?%*:|"<>]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^\w.-]/g, '');

  // Ensure it doesn't start with a dot or dash
  sanitized = sanitized.replace(/^[.-]+/, '');

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'));
    const name = sanitized.substring(0, 255 - ext.length);
    sanitized = name + ext;
  }

  // Fallback if empty
  if (!sanitized) {
    sanitized = 'file';
  }

  return sanitized;
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string): { valid: boolean; sanitized: string; error?: string } {
  if (typeof email !== 'string') {
    return { valid: false, sanitized: '', error: 'Email must be a string' };
  }

  const sanitized = email.trim().toLowerCase();
  
  // Basic email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(sanitized)) {
    return { valid: false, sanitized: '', error: 'Invalid email format' };
  }

  // Additional security checks
  if (sanitized.length > 254) {
    return { valid: false, sanitized: '', error: 'Email too long' };
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /script/i,
    /javascript/i,
    /vbscript/i,
    /onload/i,
    /onerror/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitized)) {
      return { valid: false, sanitized: '', error: 'Email contains invalid characters' };
    }
  }

  return { valid: true, sanitized };
}

/**
 * Sanitize URL for safe usage
 */
export function sanitizeUrl(url: string): { valid: boolean; sanitized: string; error?: string } {
  if (typeof url !== 'string') {
    return { valid: false, sanitized: '', error: 'URL must be a string' };
  }

  let sanitized = url.trim();

  // Allow only HTTP(S) protocols
  const allowedProtocols = ['http:', 'https:'];
  
  try {
    const urlObj = new URL(sanitized);
    
    if (!allowedProtocols.includes(urlObj.protocol)) {
      return { valid: false, sanitized: '', error: 'Only HTTP(S) URLs are allowed' };
    }

    sanitized = urlObj.href;
  } catch {
    return { valid: false, sanitized: '', error: 'Invalid URL format' };
  }

  return { valid: true, sanitized };
}

/**
 * CSRF token utilities
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string, sessionToken: string): boolean {
  if (typeof token !== 'string' || typeof sessionToken !== 'string') {
    return false;
  }
  
  // Simple constant-time comparison
  if (token.length !== sessionToken.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ sessionToken.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Sanitize SQL-like input (for additional protection even though we use parameterized queries)
 */
export function sanitizeSQLInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove common SQL injection patterns
  const sqlPatterns = [
    /('|(\\))/gi,
    /(;|--)/gi,
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/gi,
  ];

  let sanitized = input;
  sqlPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  return sanitized.trim();
}