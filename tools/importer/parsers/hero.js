/* eslint-disable */
/* global WebImporter */

/**
 * Parser for hero variant.
 * Base block: hero
 * Source: https://www.singaporeair.com/en_UK/sg/home
 * Source selector: #masthead
 * Generated: 2026-03-17
 *
 * Block library structure (1 column, 2 content rows):
 *   Row 1: Background image (optional)
 *   Row 2: Title (heading), Subheading (text), CTA (link)
 *
 * Source DOM structure (from cleaned.html):
 *   div.masthead#masthead > div.masthead-inner
 *     img (hero background)
 *     div.masthead-content > h1, p, a.masthead-cta
 */
export default function parse(element, { document }) {
  // Extract background image from masthead
  // Source: div.masthead-inner > img
  const bgImage = element.querySelector('.masthead-inner > img, .masthead img');

  // Extract content elements from masthead-content
  // Source: div.masthead-content > h1, p, a.masthead-cta
  const heading = element.querySelector('.masthead-content h1, .masthead-content h2, h1, h2');
  const subtitle = element.querySelector('.masthead-content p, p');
  const cta = element.querySelector('.masthead-content a.masthead-cta, .masthead-content a, a.masthead-cta');

  const cells = [];

  // Row 1: Background image (matches block library row 2)
  if (bgImage) {
    cells.push([bgImage]);
  }

  // Row 2: Content - heading, subtitle, CTA (matches block library row 3)
  const contentCell = [];
  if (heading) contentCell.push(heading);
  if (subtitle) contentCell.push(subtitle);
  if (cta) contentCell.push(cta);
  if (contentCell.length > 0) {
    cells.push(contentCell);
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero', cells });
  element.replaceWith(block);
}
