/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Singapore Airlines cleanup.
 * Removes non-authorable site chrome from captured DOM.
 * Selectors from captured HTML (migration-work/cleaned.html).
 */
const H = { before: 'beforeTransform', after: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === H.before) {
    // Remove elements that could interfere with block parsing
    // .booking-widget form elements - complex SPA form not relevant for parsing
    WebImporter.DOMUtils.remove(element, [
      '.booking-tabs',
      '.booking-form',
    ]);
  }
  if (hookName === H.after) {
    // Remove non-authorable site chrome (header, footer, nav)
    // Selectors from captured DOM: header.sia-header, footer.sia-footer
    WebImporter.DOMUtils.remove(element, [
      'header.sia-header',
      'footer.sia-footer',
      '.back-to-top',
      'noscript',
      'link',
      'iframe',
    ]);

    // Clean up tracking attributes from all elements
    element.querySelectorAll('*').forEach((el) => {
      el.removeAttribute('data-track');
      el.removeAttribute('onclick');
      el.removeAttribute('data-analytics');
    });
  }
}
