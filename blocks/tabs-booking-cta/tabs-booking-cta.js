/* ═══════════════════════════════════════════
   Field definition parser
   ═══════════════════════════════════════════ */

/**
 * Parses a single field definition from a list item.
 *
 * Formats recognised:
 *   "swap"                           → swap button
 *   "From: Singapore (SIN)"         → label + value + airport code badge
 *   "Class: Economy (select)"       → select-style field with arrow
 *   "Depart Date (date)"            → date field with calendar icon
 *   "Booking reference (e.g. ABC123)" → placeholder-only field
 *
 * @param {string} text Raw list-item text
 * @returns {Object} Parsed descriptor
 */
function parseFieldDef(text) {
  const t = text.trim();
  if (t.toLowerCase() === 'swap') return { kind: 'swap' };

  let processed = t;
  let fieldStyle = '';

  // Trailing (date) / (select) suffix
  if (/\(date\)\s*$/.test(processed)) {
    fieldStyle = 'date';
    processed = processed.replace(/\(date\)\s*$/, '').trim();
  } else if (/\(select\)\s*$/.test(processed)) {
    fieldStyle = 'select';
    processed = processed.replace(/\(select\)\s*$/, '').trim();
  }

  // "Label: Value (CODE)" or "Label: Value"
  const colon = processed.indexOf(':');
  if (colon > -1) {
    const label = processed.slice(0, colon).trim();
    let rest = processed.slice(colon + 1).trim();
    let code = '';
    const m = rest.match(/\(([A-Z]{2,4})\)\s*$/);
    if (m) {
      [, code] = m;
      rest = rest.replace(m[0], '').trim();
    }
    return {
      kind: 'field', fieldStyle, label, value: rest, code, placeholder: '',
    };
  }

  // No colon — entire text is a placeholder
  return {
    kind: 'field', fieldStyle, label: '', value: '', code: '', placeholder: processed,
  };
}

/* ═══════════════════════════════════════════
   Content column parser
   ═══════════════════════════════════════════ */

/**
 * Reads the content column of a tab and returns an ordered list of form
 * "sections" the decorator can render.
 *
 * Recognised HTML authored in DA:
 *   <h2> / <h3>                → heading
 *   <ul>                       → radio group (each <li> = one option)
 *   <ol>                       → field row   (each <li> = one field)
 *   <p><em>…</em></p>         → info notice
 *   <p><strong>A | B</strong> → toggle buttons
 *   <p> with <a> links         → form links
 *   <p> plain text             → description paragraph
 *
 * @param {Element} el Content column element
 * @returns {Object[]}
 */
function parseFormContent(el) {
  if (!el) return [];
  const out = [];

  [...el.children].forEach((child) => {
    const tag = child.tagName?.toLowerCase();

    if (tag === 'h2' || tag === 'h3') {
      out.push({ type: 'heading', text: child.textContent.trim() });
      return;
    }

    if (tag === 'ul') {
      out.push({
        type: 'radios',
        items: [...child.querySelectorAll('li')].map((li) => li.textContent.trim()),
      });
      return;
    }

    if (tag === 'ol') {
      out.push({
        type: 'fields',
        defs: [...child.querySelectorAll('li')].map((li) => parseFieldDef(li.textContent)),
      });
      return;
    }

    if (tag === 'p') {
      // Info notice: <p><em>…</em></p>
      const em = child.querySelector('em');
      if (em && em.textContent.trim() === child.textContent.trim()) {
        out.push({ type: 'info', text: em.textContent.trim() });
        return;
      }

      // Toggle: <p><strong>A | B</strong></p>
      const strong = child.querySelector('strong');
      if (strong && strong.textContent.includes('|')) {
        out.push({
          type: 'toggle',
          options: strong.textContent.split('|').map((s) => s.trim()),
        });
        return;
      }

      // Links: <p><a>…</a> | <a>…</a></p>
      const links = [...child.querySelectorAll('a')];
      if (links.length) {
        out.push({
          type: 'links',
          items: links.map((a) => ({
            text: a.textContent.trim(),
            href: a.getAttribute('href') || '#',
          })),
        });
        return;
      }

      // Plain text
      const txt = child.textContent.trim();
      if (txt) out.push({ type: 'text', text: txt });
    }
  });

  return out;
}

/* ═══════════════════════════════════════════
   DOM helpers
   ═══════════════════════════════════════════ */

/**
 * Creates a clickable field element.
 * @param {string} labelText  Small uppercase label
 * @param {string} value      Display value
 * @param {string} code       Airport code badge (e.g. 'SIN')
 * @param {string} url        Booking page URL
 * @param {string} placeholder Placeholder when no value
 * @returns {HTMLElement}
 */
function createField(labelText, value, code, url, placeholder) {
  const field = document.createElement('a');
  field.className = 'tabs-booking-cta-field';
  field.href = url;

  if (labelText) {
    const lbl = document.createElement('span');
    lbl.className = 'tabs-booking-cta-field-label';
    lbl.textContent = labelText;
    field.append(lbl);
  }

  const val = document.createElement('span');
  if (value) {
    val.className = 'tabs-booking-cta-field-value';
    val.textContent = value;
    if (code) {
      const codeEl = document.createElement('span');
      codeEl.className = 'tabs-booking-cta-field-code';
      codeEl.textContent = code;
      val.append(' ', codeEl);
    }
  } else if (placeholder) {
    val.className = 'tabs-booking-cta-field-value placeholder';
    val.textContent = placeholder;
  }

  field.append(val);
  return field;
}

function createSwapBtn() {
  const btn = document.createElement('button');
  btn.className = 'tabs-booking-cta-field-swap';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Swap origin and destination');
  btn.textContent = '\u21C4';
  return btn;
}

function createRadioGroup(items, name) {
  const wrap = document.createElement('div');
  wrap.className = 'tabs-booking-cta-form-radios';
  items.forEach((text, idx) => {
    const label = document.createElement('label');
    label.className = 'tabs-booking-cta-radio-label';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = name;
    radio.value = text.toLowerCase().replace(/\s+/g, '-');
    if (idx === 0) radio.checked = true;
    label.append(radio, ` ${text}`);
    wrap.append(label);
  });
  return wrap;
}

function createActionBtn(text, url) {
  const btn = document.createElement('a');
  btn.className = 'tabs-booking-cta-search-btn';
  btn.href = url;
  btn.textContent = text;
  return btn;
}

function createFormHeader(text) {
  const hdr = document.createElement('div');
  hdr.className = 'tabs-booking-cta-form-header';
  const h2 = document.createElement('h2');
  h2.textContent = text;
  hdr.append(h2);
  return hdr;
}

/* ── Composite helpers ── */

function buildInfoNotice(text) {
  const info = document.createElement('div');
  info.className = 'tabs-booking-cta-form-info';
  const icon = document.createElement('span');
  icon.className = 'tabs-booking-cta-form-info-icon';
  icon.textContent = 'i';
  const p = document.createElement('p');
  p.textContent = text;
  info.append(icon, p);
  return info;
}

function buildToggle(options) {
  const wrap = document.createElement('div');
  wrap.className = 'tabs-booking-cta-form-toggle';
  options.forEach((text, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `tabs-booking-cta-toggle-btn${idx === 0 ? ' active' : ''}`;
    btn.textContent = text;
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('.tabs-booking-cta-toggle-btn').forEach((b) => {
        b.classList.remove('active');
      });
      btn.classList.add('active');
    });
    wrap.append(btn);
  });
  return wrap;
}

function buildFormLinks(links) {
  const div = document.createElement('div');
  div.className = 'tabs-booking-cta-form-links';
  links.forEach((link, idx) => {
    if (idx > 0) {
      const sep = document.createElement('span');
      sep.className = 'tabs-booking-cta-link-sep';
      sep.textContent = '|';
      div.append(sep);
    }
    const a = document.createElement('a');
    a.href = link.href;
    a.textContent = link.text;
    div.append(a);
  });
  return div;
}

/**
 * Builds one row of fields from parsed definitions.
 * Sets grid-template-columns dynamically based on item count and types.
 * Optionally appends the action button to the last row.
 *
 * @param {Object[]} defs   Parsed field descriptors
 * @param {string}   ctaUrl Link URL for each field
 * @param {Object|null} actionBtn  { text, url } for the action button
 * @returns {HTMLElement}
 */
function buildFieldRow(defs, ctaUrl, actionBtn) {
  const row = document.createElement('div');
  row.className = 'tabs-booking-cta-form-row';

  const cols = [];

  defs.forEach((def) => {
    if (def.kind === 'swap') {
      row.append(createSwapBtn());
      cols.push('auto');
    } else {
      const el = createField(def.label, def.value, def.code, ctaUrl, def.placeholder);
      if (def.fieldStyle === 'date') el.classList.add('tabs-booking-cta-field-date');
      if (def.fieldStyle === 'select') {
        el.classList.add('tabs-booking-cta-field-select');
        const arrow = document.createElement('span');
        arrow.className = 'tabs-booking-cta-field-arrow';
        el.append(arrow);
      }
      row.append(el);
      cols.push('1fr');
    }
  });

  if (actionBtn) {
    row.append(createActionBtn(actionBtn.text, actionBtn.url));
    cols.push('auto');
  }

  row.style.gridTemplateColumns = cols.join(' ');
  return row;
}

/* ═══════════════════════════════════════════
   Form builder (content-driven)
   ═══════════════════════════════════════════ */

/**
 * Assembles a complete form panel from the parsed content sections.
 *
 * @param {Object[]} sections Parsed form sections
 * @param {string}   ctaUrl   Action button URL (from col 3)
 * @param {string}   ctaText  Action button text (from col 3)
 * @returns {HTMLElement}
 */
function buildForm(sections, ctaUrl, ctaText) {
  const form = document.createElement('div');
  form.className = 'tabs-booking-cta-form';

  // Detect "options row" pattern: radios immediately followed by links or toggle
  const combineSet = new Set();
  for (let i = 0; i < sections.length - 1; i += 1) {
    // eslint-disable-next-line secure-coding/detect-object-injection
    const cur = sections[i];
    // eslint-disable-next-line secure-coding/detect-object-injection
    const nxt = sections[i + 1];
    if (
      cur.type === 'radios'
      && (nxt.type === 'links' || nxt.type === 'toggle')
    ) {
      combineSet.add(i);
      combineSet.add(i + 1);
    }
  }

  // Find last "fields" section index — action button attaches here
  let lastFieldsIdx = -1;
  for (let i = sections.length - 1; i >= 0; i -= 1) {
    if (sections[i].type === 'fields') { lastFieldsIdx = i; break; }
  }

  let radioCounter = 0;

  sections.forEach((sec, idx) => {
    // Skip links/toggle already consumed inside an options row
    // eslint-disable-next-line secure-coding/detect-object-injection
    const prev = idx > 0 ? sections[idx - 1] : null;
    if (
      combineSet.has(idx)
      && prev
      && combineSet.has(idx - 1)
      && prev.type === 'radios'
    ) {
      return;
    }

    switch (sec.type) {
      case 'heading':
        form.append(createFormHeader(sec.text));
        break;

      case 'info':
        form.append(buildInfoNotice(sec.text));
        break;

      case 'radios': {
        radioCounter += 1;
        const radios = createRadioGroup(sec.items, `radio-${radioCounter}`);

        if (combineSet.has(idx)) {
          const opts = document.createElement('div');
          opts.className = 'tabs-booking-cta-form-options';
          opts.append(radios);

          // eslint-disable-next-line secure-coding/detect-object-injection
          const next = sections[idx + 1];
          if (next.type === 'links') opts.append(buildFormLinks(next.items));
          else if (next.type === 'toggle') opts.append(buildToggle(next.options));
          form.append(opts);
        } else {
          form.append(radios);
        }
        break;
      }

      case 'links':
        form.append(buildFormLinks(sec.items));
        break;

      case 'toggle':
        form.append(buildToggle(sec.options));
        break;

      case 'fields': {
        const isLast = idx === lastFieldsIdx;
        const btn = isLast ? { text: ctaText, url: ctaUrl } : null;
        form.append(buildFieldRow(sec.defs, ctaUrl, btn));
        break;
      }

      case 'text': {
        const p = document.createElement('p');
        p.textContent = sec.text;
        form.append(p);
        break;
      }

      default:
        break;
    }
  });

  return form;
}

/* ═══════════════════════════════════════════
   Block decorator
   ═══════════════════════════════════════════ */

/**
 * Decorates the tabs-booking-cta block.
 *
 * Each authored row is one tab:
 *   col 1 = tab label
 *   col 2 = form content (headings, lists, fields — see parseFormContent)
 *   col 3 = CTA link (action button text + URL)
 *
 * If col 2 contains <ol> field definitions the block renders a form.
 * Otherwise it falls back to simple content + CTA button.
 *
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  const tabs = rows.map((row, i) => {
    const cols = [...row.children];
    return {
      label: cols[0]?.textContent.trim() || '',
      content: cols[1] || null,
      cta: cols[2] || null,
      active: i === 0,
    };
  });

  block.textContent = '';

  /* ── Tab bar ── */
  const tabBar = document.createElement('nav');
  tabBar.className = 'tabs-booking-cta-tabs';
  tabBar.setAttribute('role', 'tablist');

  tabs.forEach((tab, i) => {
    const btn = document.createElement('button');
    btn.className = `tabs-booking-cta-tab${tab.active ? ' active' : ''}`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(tab.active));
    btn.setAttribute('data-tab', i);
    btn.textContent = tab.label;

    btn.addEventListener('click', () => {
      tabBar.querySelectorAll('.tabs-booking-cta-tab').forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      block.querySelectorAll('.tabs-booking-cta-panel').forEach((p, pi) => {
        p.hidden = pi !== i;
      });
    });

    tabBar.append(btn);
  });

  block.append(tabBar);

  /* ── Tab panels ── */
  tabs.forEach((tab) => {
    const panel = document.createElement('div');
    panel.className = 'tabs-booking-cta-panel';
    panel.setAttribute('role', 'tabpanel');
    panel.hidden = !tab.active;

    const ctaLink = tab.cta?.querySelector('a');
    const ctaUrl = ctaLink?.getAttribute('href') || '#';
    const ctaText = ctaLink?.textContent.trim() || '';

    const sections = parseFormContent(tab.content);

    if (sections.some((s) => s.type === 'fields')) {
      // Content defines a form — build it dynamically
      panel.append(buildForm(sections, ctaUrl, ctaText));
    } else {
      // Fallback: simple content + CTA button
      if (tab.content) {
        const contentDiv = document.createElement('div');
        contentDiv.className = 'tabs-booking-cta-panel-content';
        while (tab.content.firstChild) {
          contentDiv.append(tab.content.firstChild);
        }
        panel.append(contentDiv);
      }
      if (ctaText) {
        const ctaDiv = document.createElement('div');
        ctaDiv.className = 'tabs-booking-cta-panel-cta';
        const a = document.createElement('a');
        a.className = 'button';
        a.href = ctaUrl;
        a.textContent = ctaText;
        const p = document.createElement('p');
        p.append(a);
        ctaDiv.append(p);
        panel.append(ctaDiv);
      }
    }

    block.append(panel);
  });
}
