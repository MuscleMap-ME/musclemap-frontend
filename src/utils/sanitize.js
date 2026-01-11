/**
 * Input sanitization utilities using DOMPurify
 * Prevents XSS attacks by sanitizing user input before sending to API
 */
import DOMPurify from 'dompurify';

// Configuration for strict text sanitization (no HTML allowed)
const TEXT_CONFIG = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
};

// Configuration for safe HTML subset (markdown-like content)
const HTML_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'iframe', 'frame', 'style'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  ADD_ATTR: ['target'], // Allow target attribute on links
};

/**
 * Sanitize text input - strips ALL HTML tags
 * Use for usernames, titles, single-line inputs
 * @param {string} input - Raw user input
 * @returns {string} Sanitized text with no HTML
 */
export function sanitizeText(input) {
  if (typeof input !== 'string') return '';
  return DOMPurify.sanitize(input.trim(), TEXT_CONFIG);
}

/**
 * Sanitize HTML content - allows safe markdown-like HTML subset
 * Use for rich text fields, descriptions, comments
 * @param {string} input - Raw user input with potential HTML
 * @returns {string} Sanitized HTML with only safe tags
 */
export function sanitizeHtml(input) {
  if (typeof input !== 'string') return '';
  return DOMPurify.sanitize(input.trim(), HTML_CONFIG);
}

/**
 * Sanitize an email address
 * @param {string} email - Raw email input
 * @returns {string} Sanitized email
 */
export function sanitizeEmail(email) {
  if (typeof email !== 'string') return '';
  // Strip HTML and normalize
  const sanitized = sanitizeText(email).toLowerCase();
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized) ? sanitized : '';
}

/**
 * Sanitize a URL
 * @param {string} url - Raw URL input
 * @returns {string} Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url) {
  if (typeof url !== 'string') return '';
  const sanitized = sanitizeText(url);
  try {
    const parsed = new URL(sanitized);
    // Only allow http and https protocols
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
    return '';
  } catch {
    return '';
  }
}

/**
 * Recursively sanitize all string values in a form data object
 * @param {Object} data - Form data object
 * @param {Object} options - Options for field-specific sanitization
 * @param {string[]} options.htmlFields - Fields that should allow safe HTML
 * @param {string[]} options.emailFields - Fields that should be sanitized as emails
 * @param {string[]} options.urlFields - Fields that should be sanitized as URLs
 * @returns {Object} Sanitized form data
 */
export function sanitizeFormData(data, options = {}) {
  const { htmlFields = [], emailFields = [], urlFields = [] } = options;

  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(item => sanitizeFormData(item, options));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      if (emailFields.includes(key)) {
        sanitized[key] = sanitizeEmail(value);
      } else if (urlFields.includes(key)) {
        sanitized[key] = sanitizeUrl(value);
      } else if (htmlFields.includes(key)) {
        sanitized[key] = sanitizeHtml(value);
      } else {
        sanitized[key] = sanitizeText(value);
      }
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeFormData(value, options);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Validate and sanitize a numeric input
 * @param {string|number} input - Raw numeric input
 * @param {Object} options - Validation options
 * @param {number} options.min - Minimum value
 * @param {number} options.max - Maximum value
 * @param {number} options.defaultValue - Default if invalid
 * @returns {number} Validated number
 */
export function sanitizeNumber(input, options = {}) {
  const { min = -Infinity, max = Infinity, defaultValue = 0 } = options;
  const num = typeof input === 'number' ? input : parseFloat(input);
  if (isNaN(num)) return defaultValue;
  return Math.min(Math.max(num, min), max);
}

export default {
  sanitizeText,
  sanitizeHtml,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeFormData,
  sanitizeNumber,
};
