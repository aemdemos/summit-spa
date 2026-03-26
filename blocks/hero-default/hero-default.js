/**
 * Hero (default): row 1 = media, row 2 = one column (title, text, one or more buttons).
 * Unlike the multi-column hero, this block does not use 3 columns — only a single stack.
 * @param {Element} block
 */
function wrapSiblingButtons(contentRow) {
  const buttons = [...contentRow.querySelectorAll(':scope > a.button')];
  if (buttons.length < 2) return;
  const group = document.createElement('div');
  group.className = 'hero-default-actions';
  const [first] = buttons;
  first.before(group);
  buttons.forEach((btn) => group.append(btn));
}

export default function decorate(block) {
  const firstRow = block.querySelector(':scope > div:first-child');
  if (!firstRow?.querySelector('picture')) {
    block.classList.add('no-image');
  }

  const contentRow = block.querySelector(':scope > div:nth-child(2)');
  if (contentRow) {
    contentRow.classList.add('hero-default-content');
    wrapSiblingButtons(contentRow);
  }
}
