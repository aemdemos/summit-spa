/**
 * Hero App CTA: row 1 = media, row 2 = single column (title, text, CTA).
 * @param {Element} block
 */
export default function decorate(block) {
  const firstRow = block.querySelector(':scope > div:first-child');
  if (!firstRow?.querySelector('picture')) {
    block.classList.add('no-image');
  }

  const contentRow = block.querySelector(':scope > div:nth-child(2)');
  if (contentRow) {
    contentRow.classList.add('hero-app-cta-content');
  }
}
