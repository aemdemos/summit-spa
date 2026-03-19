/* eslint-disable */
/* global WebImporter */

/**
 * Parser for hero-booking-cta variant.
 * Base block: hero
 * Source: https://www.singaporeair.com/en_UK/sg/home
 * Source selector: #hwidget
 * Generated: 2026-03-17
 *
 * Block library structure (hero - 1 column, 2 content rows):
 *   Row 1: Background image (optional)
 *   Row 2: Title (heading), Subheading (text), CTA (link)
 *
 * The original booking widget is a complex SPA form. This parser creates a
 * simplified hero CTA block with heading, description, and booking link.
 *
 * Source DOM structure (from cleaned.html):
 *   div.booking-widget#hwidget
 *     ul.booking-tabs > li (Book trip, Manage booking, Check in, etc.)
 *     div.booking-form (form fields - removed by cleanup transformer)
 */
export default function parse(element, { document }) {
  // The booking widget is an SPA form that cannot be directly migrated.
  // Create a simplified hero CTA with booking-related content.
  const contentCell = [];

  // Create heading for the booking CTA
  const heading = document.createElement('h2');
  heading.textContent = 'Book Your Flight';
  contentCell.push(heading);

  // Create description
  const description = document.createElement('p');
  description.textContent = 'Search and book flights to over 100 destinations worldwide. Manage your booking, check in online, or check flight status.';
  contentCell.push(description);

  // Create CTA link to booking page
  const cta = document.createElement('a');
  cta.href = 'https://www.singaporeair.com/en_UK/sg/home#/book/bookflight';
  cta.textContent = 'BOOK NOW';
  contentCell.push(cta);

  const cells = [];
  // No background image for this variant (row 1 skipped)
  // Row 2: Content
  cells.push(contentCell);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-booking-cta', cells });
  element.replaceWith(block);
}
