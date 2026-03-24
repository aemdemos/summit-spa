import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function isExternalLink(href) {
  try {
    const url = new URL(href, window.location.origin);
    const isLocal = url.hostname === window.location.hostname;
    const isSIA = url.hostname.includes('singaporeair');
    return !isLocal && !isSIA;
  } catch { return false; }
}

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-highlights-card-image';
      else div.className = 'cards-highlights-card-body';
    });

    /* detect external links and mark the card */
    const body = li.querySelector('.cards-highlights-card-body');
    if (body) {
      const link = body.querySelector('a');
      if (link && isExternalLink(link.href)) {
        li.classList.add('external');
      }
    }

    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.textContent = '';
  block.append(ul);
}
