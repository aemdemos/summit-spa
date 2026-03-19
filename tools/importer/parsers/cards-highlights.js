/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-highlights variant.
 * Base block: cards
 * Source: https://www.singaporeair.com/en_UK/sg/home
 * Source selector: .highlights .highlight-cards
 * Generated: 2026-03-17
 *
 * Block library structure (cards - 2 columns, multiple rows):
 *   Each row = 1 card:
 *     Col 1: Image
 *     Col 2: Title (heading), Description, CTA (optional)
 *
 * Source DOM structure (from cleaned.html):
 *   div.highlight-cards
 *     a.highlight-card[href] (repeated, 6 cards)
 *       img[src][alt] (promo banner)
 *       div.card-content
 *         div.card-title (title text)
 *         div.card-desc (description text)
 */
export default function parse(element, { document }) {
  // Select all highlight card links
  // Source: a.highlight-card within .highlight-cards
  const cards = element.querySelectorAll('a.highlight-card, .highlight-card');
  const cells = [];

  cards.forEach((card) => {
    // Col 1: Promo image
    // Source: a.highlight-card > img
    const img = card.querySelector('img');

    // Col 2: Text content - title, description, link
    // Source: div.card-content > div.card-title, div.card-desc
    const title = card.querySelector('.card-title');
    const desc = card.querySelector('.card-desc');

    const textCell = [];

    // Title as heading
    if (title) {
      const h3 = document.createElement('h3');
      h3.textContent = title.textContent.trim();
      textCell.push(h3);
    }

    // Description as paragraph
    if (desc) {
      const p = document.createElement('p');
      p.textContent = desc.textContent.trim();
      textCell.push(p);
    }

    // CTA link
    const href = card.getAttribute('href') || card.href;
    if (href) {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = 'Learn more';
      textCell.push(link);
    }

    if (img || textCell.length > 0) {
      cells.push([img || '', textCell]);
    }
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-highlights', cells });
  element.replaceWith(block);
}
