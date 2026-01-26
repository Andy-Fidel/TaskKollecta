/**
 * Sanitization Utilities
 * Defense-in-depth XSS protection using DOMPurify
 */
import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content - removes any potentially malicious scripts/tags
 * Use this when displaying HTML content from user input
 * @param {string} dirty - Untrusted HTML string
 * @returns {string} - Sanitized HTML safe for rendering
 */
export const sanitizeHtml = (dirty) => {
    if (!dirty) return '';
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
        ALLOW_DATA_ATTR: false
    });
};

/**
 * Sanitize plain text - escapes HTML entities
 * Use this for user input that should never contain HTML
 * @param {string} text - Untrusted text
 * @returns {string} - Escaped text
 */
export const escapeHtml = (text) => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

/**
 * Sanitize URL - prevents javascript: and data: URLs
 * @param {string} url - Untrusted URL
 * @returns {string} - Safe URL or empty string
 */
export const sanitizeUrl = (url) => {
    if (!url) return '';
    try {
        const parsed = new URL(url, window.location.origin);
        if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
            return url;
        }
        return '';
    } catch {
        return '';
    }
};

export default { sanitizeHtml, escapeHtml, sanitizeUrl };
