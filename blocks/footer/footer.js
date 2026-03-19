import { getMetadata, DOMPURIFY } from '../../scripts/aem.js';
import { ensureDOMPurify } from '../../scripts/scripts.js';

/**
 * Builds the back-to-top button from content.
 * @param {Element} section The section containing back-to-top text
 * @returns {Element} The back-to-top button element
 */
function buildBackToTop(section) {
  const btn = document.createElement('button');
  btn.classList.add('footer-back-to-top');
  btn.setAttribute('aria-label', 'Back to top');
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  const text = section.querySelector('p');
  if (text) {
    btn.setAttribute('aria-label', text.textContent.trim());
  }
  return btn;
}

/**
 * Builds the accordion nav columns from content.
 * Parses h2 + ul pairs regardless of DOM nesting depth.
 * @param {Element} section The section containing nav columns
 * @returns {Element} The nav columns container
 */
function buildNavColumns(section) {
  const container = document.createElement('div');
  container.classList.add('footer-nav');

  const headings = section.querySelectorAll('h2');
  headings.forEach((heading) => {
    const column = document.createElement('div');
    column.classList.add('footer-nav-column');

    // Walk siblings to find the next UL after this heading
    let list = heading.nextElementSibling;
    while (list && list.tagName !== 'UL' && list.tagName !== 'H2') {
      list = list.nextElementSibling;
    }
    if (!list || list.tagName !== 'UL') return;

    const header = document.createElement('button');
    header.classList.add('footer-nav-header');
    header.setAttribute('aria-expanded', 'false');
    header.textContent = heading.textContent;

    const chevron = document.createElement('span');
    chevron.classList.add('footer-chevron');
    chevron.setAttribute('aria-hidden', 'true');
    header.append(chevron);

    const content = document.createElement('div');
    content.classList.add('footer-nav-content');

    // Mark external links (*.singaporeair.com subdomains are internal)
    list.querySelectorAll('a').forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (href.startsWith('http') && !href.includes('singaporeair.com')) {
        link.classList.add('footer-external-link');
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    });

    content.append(list);
    column.append(header, content);

    header.addEventListener('click', () => {
      const expanded = header.getAttribute('aria-expanded') === 'true';
      // Close all other accordions on mobile
      container.querySelectorAll('.footer-nav-header').forEach((h) => {
        h.setAttribute('aria-expanded', 'false');
      });
      header.setAttribute('aria-expanded', String(!expanded));
    });

    container.append(column);
  });

  return container;
}

/**
 * Builds the awards and app store section.
 * Classifies paragraphs by content type instead of DOM position.
 * @param {Element} section The section containing awards and CTA
 * @returns {Element} The awards row element
 */
function buildAwardsRow(section) {
  const row = document.createElement('div');
  row.classList.add('footer-awards-row');

  const left = document.createElement('div');
  left.classList.add('footer-awards-left');

  const awardsContainer = document.createElement('div');
  awardsContainer.classList.add('footer-awards');

  const appStores = document.createElement('div');
  appStores.classList.add('footer-app-stores');

  const right = document.createElement('div');
  right.classList.add('footer-signup');

  const paragraphs = section.querySelectorAll('p');
  paragraphs.forEach((p) => {
    const links = [...p.querySelectorAll('a')];
    const imgs = [...p.querySelectorAll('img')];

    if (imgs.length > 0 && links.length === 0) {
      // Award images (images without links)
      imgs.forEach((img) => {
        const awardImg = document.createElement('img');
        awardImg.src = img.src;
        awardImg.alt = img.alt;
        awardImg.loading = 'lazy';
        awardsContainer.append(awardImg);
      });
    } else if (links.length > 0 && links[0].querySelector('img')) {
      // App store badges (links containing images)
      links.forEach((link) => {
        const a = document.createElement('a');
        a.href = link.href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        const img = link.querySelector('img');
        if (img) {
          const badge = document.createElement('img');
          badge.src = img.src;
          badge.alt = img.alt;
          badge.loading = 'lazy';
          a.append(badge);
        }
        appStores.append(a);
      });
    } else if (links.length > 0) {
      // Signup CTA (text link without images)
      const link = links[0];
      const cta = document.createElement('a');
      cta.href = link.href;
      cta.classList.add('footer-signup-cta');

      const text = document.createElement('span');
      text.textContent = link.textContent.trim();
      cta.append(text);

      const emailIcon = document.createElement('span');
      emailIcon.classList.add('footer-email-icon');
      emailIcon.setAttribute('aria-hidden', 'true');
      cta.append(emailIcon);

      right.append(cta);
    }
  });

  if (awardsContainer.children.length) left.append(awardsContainer);
  if (appStores.children.length) left.append(appStores);
  if (left.children.length) row.append(left);
  if (right.children.length) row.append(right);

  return row;
}

/**
 * Creates a linked image element.
 * @param {Element} sourceLink The source anchor element
 * @param {object} opts Options (ariaLabel)
 * @returns {Element} The anchor with image
 */
function createLinkedImage(sourceLink, opts = {}) {
  const a = document.createElement('a');
  a.href = sourceLink.href;
  const href = sourceLink.getAttribute('href') || '';
  if (href.startsWith('http') && !href.includes('singaporeair.com')) {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  const img = sourceLink.querySelector('img');
  if (img) {
    const clone = document.createElement('img');
    clone.src = img.src;
    clone.alt = img.alt;
    clone.loading = 'lazy';
    if (opts.ariaLabel) a.setAttribute('aria-label', img.alt);
    a.append(clone);
  }
  return a;
}

/**
 * Builds the bottom section with logos, legal, and social links.
 * Uses content-based parsing to work with both nested and flat HTML.
 * @param {Element} section The section containing bottom content
 * @returns {Element} The bottom section element
 */
function buildBottomSection(section) {
  const bottom = document.createElement('div');
  bottom.classList.add('footer-bottom');

  const paragraphs = [...section.querySelectorAll('p')];

  // Find key paragraphs by content type
  const legalIdx = paragraphs.findIndex((p) => {
    const links = p.querySelectorAll('a');
    return links.length >= 3 && !p.querySelector('img');
  });

  const disclaimerIdx = paragraphs.findIndex((p) => p.textContent.trim().startsWith('Hyperlinks'));

  // --- Logos row: all <a><img> paragraphs before the legal paragraph ---
  const logoParagraphs = legalIdx >= 0 ? paragraphs.slice(0, legalIdx) : [];
  const logosRow = document.createElement('div');
  logosRow.classList.add('footer-logos-row');

  const airlineLogos = document.createElement('div');
  airlineLogos.classList.add('footer-airline-logos');

  const starAlliance = document.createElement('div');
  starAlliance.classList.add('footer-star-alliance');

  logoParagraphs.forEach((p) => {
    p.querySelectorAll('a').forEach((link) => {
      const img = link.querySelector('img');
      if (img && img.alt && img.alt.toLowerCase().includes('star alliance')) {
        starAlliance.append(createLinkedImage(link));
      } else if (img) {
        airlineLogos.append(createLinkedImage(link));
      }
    });
  });

  if (airlineLogos.children.length) logosRow.append(airlineLogos);
  if (starAlliance.children.length) logosRow.append(starAlliance);
  if (logosRow.children.length) bottom.append(logosRow);

  // --- Legal links + social icons row ---
  const legalRow = document.createElement('div');
  legalRow.classList.add('footer-legal-row');

  const legalLinks = document.createElement('div');
  legalLinks.classList.add('footer-legal-links');

  if (legalIdx >= 0) {
    const links = paragraphs[legalIdx].querySelectorAll('a');
    links.forEach((link, i) => {
      const a = document.createElement('a');
      a.href = link.href;
      a.textContent = link.textContent.trim();
      const linkHref = link.getAttribute('href') || '';
      if (linkHref.startsWith('http') && !linkHref.includes('singaporeair.com')) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      legalLinks.append(a);
      if (i < links.length - 1) {
        const sep = document.createElement('span');
        sep.classList.add('footer-legal-sep');
        sep.setAttribute('aria-hidden', 'true');
        sep.textContent = '|';
        legalLinks.append(sep);
      }
    });
  }
  legalRow.append(legalLinks);

  // Social links: all <a><img> paragraphs after the disclaimer
  const socialParagraphs = disclaimerIdx >= 0 ? paragraphs.slice(disclaimerIdx + 1) : [];
  if (socialParagraphs.length) {
    const socialRow = document.createElement('div');
    socialRow.classList.add('footer-social');
    socialParagraphs.forEach((p) => {
      p.querySelectorAll('a').forEach((link) => {
        socialRow.append(createLinkedImage(link, { ariaLabel: true }));
      });
    });
    legalRow.append(socialRow);
  }
  bottom.append(legalRow);

  // --- Disclaimer ---
  if (disclaimerIdx >= 0) {
    const disclaimer = document.createElement('p');
    disclaimer.classList.add('footer-disclaimer');
    const sourceP = paragraphs[disclaimerIdx];
    const sourceImg = sourceP.querySelector('img');
    if (sourceImg) {
      [...sourceP.childNodes].forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          disclaimer.append(document.createTextNode(node.textContent));
        } else if (node.tagName === 'IMG'
          || (node.querySelector && node.querySelector('img'))) {
          const icon = document.createElement('img');
          icon.src = sourceImg.src;
          icon.alt = 'external link';
          icon.classList.add('footer-external-icon');
          icon.loading = 'lazy';
          disclaimer.append(icon);
        }
      });
    } else {
      disclaimer.textContent = sourceP.textContent.trim();
    }
    bottom.append(disclaimer);
  }

  return bottom;
}

/**
 * Loads and decorates the footer.
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta
    ? new URL(footerMeta, window.location).pathname
    : '/footer';

  await ensureDOMPurify();
  const resp = await fetch(`${footerPath}.plain.html`);
  if (!resp.ok) return;

  const html = await resp.text();
  const temp = document.createElement('div');
  temp.innerHTML = window.DOMPurify.sanitize(html, DOMPURIFY);

  block.textContent = '';

  const sections = [...temp.children];

  // Section 0 + 1: Back to top button + Nav columns
  // Wrap in a relative container so the back-to-top button can be
  // absolutely positioned at the top-right (matching the original site).
  const topWrapper = document.createElement('div');
  topWrapper.classList.add('footer-back-to-top-wrapper');
  if (sections[0]) {
    topWrapper.append(buildBackToTop(sections[0]));
  }
  if (sections[1]) {
    topWrapper.append(buildNavColumns(sections[1]));
  }
  block.append(topWrapper);

  // Section 2: Awards + signup CTA
  if (sections[2]) {
    block.append(buildAwardsRow(sections[2]));
  }

  // Horizontal divider
  const divider = document.createElement('hr');
  divider.classList.add('footer-divider');
  block.append(divider);

  // Section 3: Bottom (logos, legal, social)
  if (sections[3]) {
    block.append(buildBottomSection(sections[3]));
  }

  // Decorative batik pattern at the very bottom
  const batik = document.createElement('div');
  batik.classList.add('footer-batik');
  batik.setAttribute('aria-hidden', 'true');
  block.append(batik);
}
