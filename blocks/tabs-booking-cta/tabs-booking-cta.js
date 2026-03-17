/**
 * Decorates the tabs-booking-cta block as a tabbed booking navigation.
 * Reads tab definitions from the block rows: each row is a tab with
 * col1 = tab label, col2 = tab content (optional), col3 = CTA link (optional).
 * The first row is the initially active tab.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  // Build tab data from block rows
  const tabs = rows.map((row, i) => {
    const cols = [...row.children];
    const label = cols[0]?.textContent.trim() || '';
    const content = cols[1] || null;
    const cta = cols[2] || null;
    return { label, content, cta, active: i === 0 };
  });

  // Clear the block
  block.textContent = '';

  // ── Tab bar ──
  const tabBar = document.createElement('nav');
  tabBar.className = 'tabs-booking-cta-tabs';
  tabBar.setAttribute('role', 'tablist');

  tabs.forEach((tab, i) => {
    const btn = document.createElement('button');
    btn.className = `tabs-booking-cta-tab${tab.active ? ' active' : ''}`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', tab.active ? 'true' : 'false');
    btn.setAttribute('data-tab', i);
    btn.textContent = tab.label;

    btn.addEventListener('click', () => {
      // Update active states
      tabBar.querySelectorAll('.tabs-booking-cta-tab').forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      // Show corresponding panel
      block.querySelectorAll('.tabs-booking-cta-panel').forEach((p, pi) => {
        p.hidden = pi !== i;
      });
    });

    tabBar.append(btn);
  });

  block.append(tabBar);

  // ── Tab panels ──
  tabs.forEach((tab) => {
    const panel = document.createElement('div');
    panel.className = 'tabs-booking-cta-panel';
    panel.setAttribute('role', 'tabpanel');
    panel.hidden = !tab.active;

    if (tab.content) {
      // Re-use existing DOM nodes from the authored content
      const contentDiv = document.createElement('div');
      contentDiv.className = 'tabs-booking-cta-panel-content';
      // Move child nodes (paragraphs, headings, etc.) into panel
      while (tab.content.firstChild) {
        contentDiv.append(tab.content.firstChild);
      }
      panel.append(contentDiv);
    }

    if (tab.cta) {
      const ctaDiv = document.createElement('div');
      ctaDiv.className = 'tabs-booking-cta-panel-cta';
      while (tab.cta.firstChild) {
        ctaDiv.append(tab.cta.firstChild);
      }
      panel.append(ctaDiv);
    }

    block.append(panel);
  });
}
