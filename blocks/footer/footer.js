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
 * @param {Element} section The section containing nav columns
 * @returns {Element} The nav columns container
 */
function buildNavColumns(section) {
  const container = document.createElement('div');
  container.classList.add('footer-nav');

  const columns = section.querySelectorAll(':scope > div > div');
  columns.forEach((col) => {
    const column = document.createElement('div');
    column.classList.add('footer-nav-column');

    const heading = col.querySelector('h2');
    const list = col.querySelector('ul');

    if (heading && list) {
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
    }

    container.append(column);
  });

  return container;
}

/**
 * Builds the awards and app store section.
 * @param {Element} section The section containing awards and CTA
 * @returns {Element} The awards row element
 */
function buildAwardsRow(section) {
  const row = document.createElement('div');
  row.classList.add('footer-awards-row');

  const innerDivs = section.querySelectorAll(':scope > div > div');

  // Left side: awards + app store badges
  if (innerDivs[0]) {
    const left = document.createElement('div');
    left.classList.add('footer-awards-left');

    const paragraphs = innerDivs[0].querySelectorAll('p');
    // First p = award images
    if (paragraphs[0]) {
      const awardsContainer = document.createElement('div');
      awardsContainer.classList.add('footer-awards');
      paragraphs[0].querySelectorAll('img').forEach((img) => {
        const awardImg = document.createElement('img');
        awardImg.src = img.src;
        awardImg.alt = img.alt;
        awardImg.loading = 'lazy';
        awardsContainer.append(awardImg);
      });
      left.append(awardsContainer);
    }
    // Second p = app store badges
    if (paragraphs[1]) {
      const appStores = document.createElement('div');
      appStores.classList.add('footer-app-stores');
      paragraphs[1].querySelectorAll('a').forEach((link) => {
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
      left.append(appStores);
    }

    row.append(left);
  }

  // Right side: signup CTA
  if (innerDivs[1]) {
    const right = document.createElement('div');
    right.classList.add('footer-signup');
    const link = innerDivs[1].querySelector('a');
    if (link) {
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
    row.append(right);
  }

  return row;
}

/**
 * Creates a linked image element.
 * @param {Element} sourceLink The source anchor element
 * @param {object} opts Options (external, className)
 * @returns {Element} The anchor with image
 */
function createLinkedImage(sourceLink, opts = {}) {
  const a = document.createElement('a');
  a.href = sourceLink.href;
  if (opts.external !== false) {
    const href = sourceLink.getAttribute('href') || '';
    if (href.startsWith('http') && !href.includes('singaporeair.com')) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
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
 * Builds the logos row from content.
 * @param {Element} div The div containing logo paragraphs
 * @returns {Element} The logos row element
 */
function buildLogosRow(div) {
  const logosRow = document.createElement('div');
  logosRow.classList.add('footer-logos-row');

  const paragraphs = div.querySelectorAll('p');
  if (paragraphs[0]) {
    const airlineLogos = document.createElement('div');
    airlineLogos.classList.add('footer-airline-logos');
    paragraphs[0].querySelectorAll('a').forEach((link) => {
      airlineLogos.append(createLinkedImage(link));
    });
    logosRow.append(airlineLogos);
  }
  if (paragraphs[1]) {
    const starAlliance = document.createElement('div');
    starAlliance.classList.add('footer-star-alliance');
    const link = paragraphs[1].querySelector('a');
    if (link) starAlliance.append(createLinkedImage(link));
    logosRow.append(starAlliance);
  }
  return logosRow;
}

/**
 * Builds the legal links row from content.
 * @param {Element} div The div containing legal paragraphs
 * @returns {{ links: Element, disclaimer: Element }} Legal links and disclaimer elements
 */
function buildLegalSection(div) {
  const paragraphs = div.querySelectorAll('p');

  const legalLinks = document.createElement('div');
  legalLinks.classList.add('footer-legal-links');
  if (paragraphs[0]) {
    const links = paragraphs[0].querySelectorAll('a');
    links.forEach((link, i) => {
      const a = createLinkedImage(link);
      a.textContent = link.textContent.trim();
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

  const disclaimer = document.createElement('p');
  disclaimer.classList.add('footer-disclaimer');
  if (paragraphs[1]) {
    const sourceImg = paragraphs[1].querySelector('img');
    if (sourceImg) {
      [...paragraphs[1].childNodes].forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          disclaimer.append(document.createTextNode(node.textContent));
        } else if (node.querySelector && node.querySelector('img')) {
          const icon = document.createElement('img');
          icon.src = sourceImg.src;
          icon.alt = 'external link';
          icon.classList.add('footer-external-icon');
          icon.loading = 'lazy';
          disclaimer.append(icon);
        }
      });
    } else {
      disclaimer.textContent = paragraphs[1].textContent.trim();
    }
  }

  return { links: legalLinks, disclaimer };
}

/**
 * Builds the social links row from content.
 * @param {Element} div The div containing social link paragraph
 * @returns {Element} The social row element
 */
function buildSocialRow(div) {
  const socialRow = document.createElement('div');
  socialRow.classList.add('footer-social');
  div.querySelectorAll('a').forEach((link) => {
    socialRow.append(createLinkedImage(link, { ariaLabel: true }));
  });
  return socialRow;
}

/**
 * Builds the bottom section with logos, legal, and social links.
 * @param {Element} section The section containing bottom content
 * @returns {Element} The bottom section element
 */
function buildBottomSection(section) {
  const bottom = document.createElement('div');
  bottom.classList.add('footer-bottom');

  const innerDivs = section.querySelectorAll(':scope > div > div');

  if (innerDivs[0]) bottom.append(buildLogosRow(innerDivs[0]));

  // Legal links + social icons share a row on desktop
  const legalRow = document.createElement('div');
  legalRow.classList.add('footer-legal-row');
  const { links, disclaimer } = innerDivs[1]
    ? buildLegalSection(innerDivs[1])
    : { links: document.createElement('div'), disclaimer: document.createElement('p') };
  legalRow.append(links);
  if (innerDivs[2]) legalRow.append(buildSocialRow(innerDivs[2]));
  bottom.append(legalRow);

  // Disclaimer spans full width below
  bottom.append(disclaimer);

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

  // Section 0: Back to top
  if (sections[0]) {
    block.append(buildBackToTop(sections[0]));
  }

  // Section 1: Nav columns (accordion)
  if (sections[1]) {
    block.append(buildNavColumns(sections[1]));
  }

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
}
