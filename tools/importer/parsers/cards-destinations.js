/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-destinations variant.
 * Base block: cards
 * Source: https://www.singaporeair.com/en_UK/sg/home
 * Source selector: .trending-destinations .destination-cards
 * Generated: 2026-03-17
 *
 * Block library structure (cards - 2 columns, multiple rows):
 *   Each row = 1 card:
 *     Col 1: Image
 *     Col 2: Title (heading), Description, CTA (optional)
 *
 * Source DOM structure (from cleaned.html):
 *   div.destination-cards
 *     a.destination-card[href] (repeated, 8 cards)
 *       img[src][alt] (destination photo)
 *       div.card-info
 *         div.city (city name)
 *         div.class (travel class)
 *         div.price (price text)
 */
export default function parse(element, { document }) {
  // Select all destination card links
  // Source: a.destination-card within .destination-cards
  const cards = element.querySelectorAll('a.destination-card, .destination-card');
  const cells = [];

  cards.forEach((card) => {
    // Col 1: Destination image
    // Source: a.destination-card > img
    const img = card.querySelector('img');

    // Col 2: Text content - city, class, price, link
    // Source: div.card-info > div.city, div.class, div.price
    const city = card.querySelector('.city');
    const travelClass = card.querySelector('.class');
    const price = card.querySelector('.price');

    const textCell = [];

    // City name as heading
    if (city) {
      const h3 = document.createElement('h3');
      h3.textContent = city.textContent.trim();
      textCell.push(h3);
    }

    // Travel class as paragraph
    if (travelClass) {
      const p = document.createElement('p');
      p.textContent = travelClass.textContent.trim();
      textCell.push(p);
    }

    // Price as paragraph
    if (price) {
      const p = document.createElement('p');
      p.textContent = price.textContent.trim();
      textCell.push(p);
    }

    // CTA link to booking page
    const href = card.getAttribute('href') || card.href;
    if (href) {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = 'Book now';
      textCell.push(link);
    }

    if (img || textCell.length > 0) {
      cells.push([img || '', textCell]);
    }
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-destinations', cells });
  element.replaceWith(block);
}
