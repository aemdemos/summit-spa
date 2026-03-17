/* eslint-disable */
/* global WebImporter */

/**
 * Parser for hero-app-cta variant.
 * Base block: hero
 * Source: https://www.singaporeair.com/en_UK/sg/home
 * Source selector: .seamless-travel
 * Generated: 2026-03-17
 *
 * Block library structure (hero - 1 column, 2 content rows):
 *   Row 1: Background image (optional)
 *   Row 2: Title (heading), Subheading (text), CTA (link)
 *
 * Source DOM structure (from cleaned.html):
 *   div.seamless-travel
 *     img.bg-desktop (background image - desktop)
 *     img.bg-mobile (background image - mobile)
 *     div.seamless-content
 *       h3 (heading)
 *       p (description)
 *       a.seamless-cta (CTA link)
 */
export default function parse(element, { document }) {
  // Extract background image (prefer desktop version)
  // Source: img.bg-desktop, img.bg-mobile
  const bgImage = element.querySelector('img.bg-desktop, img.bg-mobile, .seamless-travel > img');

  // Extract content elements
  // Source: div.seamless-content > h3, p, a.seamless-cta
  const heading = element.querySelector('.seamless-content h3, .seamless-content h2, .seamless-content h1, h3, h2');
  const description = element.querySelector('.seamless-content p, p');
  const cta = element.querySelector('.seamless-content a.seamless-cta, .seamless-content a, a.seamless-cta');

  const cells = [];

  // Row 1: Background image
  if (bgImage) {
    cells.push([bgImage]);
  }

  // Row 2: Content - heading, description, CTA
  const contentCell = [];
  if (heading) contentCell.push(heading);
  if (description) contentCell.push(description);
  if (cta) contentCell.push(cta);
  if (contentCell.length > 0) {
    cells.push(contentCell);
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-app-cta', cells });
  element.replaceWith(block);
}
