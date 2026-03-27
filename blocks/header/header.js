import { getMetadata } from '../../scripts/aem.js';

/* ---- Resilient nav-content helpers ----
 * Work with both the handcrafted nav.plain.html (nested divs + CSS classes)
 * and DA-rendered nav (flat <p> elements, no classes).
 */

function findLogoLink(brandNavDiv) {
  if (!brandNavDiv) return null;
  // Handcrafted: logo is inside first child div
  const nested = brandNavDiv.querySelector(':scope > div:first-child a');
  if (nested && nested.querySelector('img')) return nested;
  // DA flat: <p><a><img></a></p> as direct child
  return [...brandNavDiv.querySelectorAll('a')].find((a) => a.querySelector('img')) || null;
}

function findItemLink(li) {
  // Direct <a> child (standard EDS)
  const direct = li.querySelector(':scope > a');
  if (direct) return direct;
  // <p>-wrapped <a> (some DA renderers)
  const wrapped = li.querySelector(':scope > p > a');
  if (wrapped) return wrapped;
  // Any <a> not inside a nested <ul> (last resort)
  const nested = li.querySelector(':scope > ul');
  return [...li.querySelectorAll('a')].find((a) => !nested || !nested.contains(a)) || null;
}

function findMainNavList(brandNavDiv) {
  if (!brandNavDiv) return null;
  // Handcrafted: inside second child div
  const nested = brandNavDiv.querySelector(':scope > div:nth-child(2) > ul');
  if (nested) return nested;
  // DA flat: direct child UL
  return brandNavDiv.querySelector(':scope > ul') || brandNavDiv.querySelector('ul');
}

function extractText(raw) {
  // Extract readable text from strings that may contain escaped HTML tags
  // e.g., "<button class='x'>Hello</button>" → "Hello"
  return raw.split('<').map((part) => {
    const idx = part.indexOf('>');
    return idx >= 0 ? part.substring(idx + 1) : part;
  }).join('').trim();
}

function findToolElements(toolsDiv) {
  const result = {
    helpLink: null,
    feedbackLink: null,
    localeText: null,
    loginText: null,
    signUpLink: null,
    hasSearch: false,
    alertBadge: null,
    chatLabel: null,
  };
  if (!toolsDiv) return result;

  result.helpLink = toolsDiv.querySelector('a[href*="help"]');
  result.feedbackLink = toolsDiv.querySelector('a[href*="feedback"]');
  result.signUpLink = toolsDiv.querySelector('a[href*="registration"]');

  // Alert bell: try class first, then DA-escaped button text
  const alertBtn = toolsDiv.querySelector('.alert-btn');
  if (alertBtn) {
    result.alertBadge = alertBtn.textContent.trim();
  } else {
    toolsDiv.querySelectorAll('p').forEach((p) => {
      if (result.alertBadge !== null) return;
      const raw = p.textContent.trim();
      const lower = raw.toLowerCase();
      if (lower.includes('alert-btn') || lower.includes(':alert:') || lower.includes(':bell:')) {
        const clean = extractText(raw)
          .replace(/:alert:/gi, '')
          .replace(/:bell:/gi, '')
          .trim();
        result.alertBadge = clean;
      }
    });
  }

  // Chat: try class first, then DA-escaped button text
  const chatBtnEl = toolsDiv.querySelector('.chat-btn');
  if (chatBtnEl) {
    result.chatLabel = chatBtnEl.textContent.trim();
  } else {
    toolsDiv.querySelectorAll('p').forEach((p) => {
      if (result.chatLabel) return;
      const raw = p.textContent.trim();
      const lower = raw.toLowerCase();
      if (lower.includes('chat-btn') || lower.includes(':chat:')) {
        const clean = extractText(raw)
          .replace(/:chat:/gi, '')
          .trim();
        result.chatLabel = clean || 'Chat';
      }
    });
  }

  // Locale: try class first, then text pattern (handles DA-escaped <button> tags)
  const localeBtn = toolsDiv.querySelector('.locale-selector');
  if (localeBtn) {
    result.localeText = localeBtn.textContent.trim();
  } else {
    toolsDiv.querySelectorAll('p').forEach((p) => {
      if (result.localeText) return;
      const raw = p.textContent.trim();
      const clean = extractText(raw);
      if (!p.querySelector('a') && clean.includes('\u00B7')) {
        result.localeText = clean;
      }
    });
  }

  // Login: try class first, then text match (handles DA-escaped tags)
  const loginBtn = toolsDiv.querySelector('.login-btn');
  if (loginBtn) {
    result.loginText = loginBtn.textContent.trim();
  } else {
    toolsDiv.querySelectorAll('p').forEach((p) => {
      if (result.loginText) return;
      const raw = p.textContent.trim();
      const clean = extractText(raw);
      const normalized = clean.toLowerCase().replace(/[-\s]/g, '');
      if (normalized === 'login' && !p.querySelector('a')) {
        result.loginText = clean;
      }
    });
  }

  // Search: class, icon element, or DA-escaped text containing search-toggle/icon-search
  result.hasSearch = !!(
    toolsDiv.querySelector('.search-toggle')
    || toolsDiv.querySelector('.icon-search')
    || toolsDiv.querySelector('.icon.icon-search')
    || [...toolsDiv.querySelectorAll('p')].find((p) => {
      const text = p.textContent.toLowerCase();
      return text.includes('search-toggle') || text.includes('icon-search') || text.includes(':search:');
    })
  );

  return result;
}

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    if (!nav) return;
    nav.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
    document.body.style.overflowY = '';
    const overlay = document.querySelector('.nav-overlay');
    if (overlay) overlay.classList.remove('active');
  }
}

function buildSubNavPanel(navItem, label) {
  const panel = document.createElement('div');
  panel.classList.add('subnav-panel');
  panel.setAttribute('aria-hidden', 'true');

  // Back button
  const backBtn = document.createElement('button');
  backBtn.classList.add('subnav-back');
  const chevron = document.createElement('span');
  chevron.classList.add('back-chevron');
  backBtn.append(chevron, 'BACK');
  backBtn.addEventListener('click', () => {
    panel.setAttribute('aria-hidden', 'true');
  });
  panel.append(backBtn);

  // Section heading with gold accent bar
  const heading = document.createElement('div');
  heading.classList.add('subnav-heading');
  heading.textContent = label;
  panel.append(heading);

  // Sub-categories (level 2) as accordion items
  const subList = navItem.querySelector(':scope > ul');
  if (subList) {
    const categories = subList.querySelectorAll(':scope > li');
    categories.forEach((cat) => {
      const catGroup = document.createElement('div');
      catGroup.classList.add('subnav-category');

      const catLink = findItemLink(cat);
      const catItems = cat.querySelector(':scope > ul');

      if (catLink && catItems) {
        // Expandable category with sub-items
        const catBtn = document.createElement('button');
        catBtn.classList.add('subnav-cat-btn');
        catBtn.setAttribute('aria-expanded', 'false');
        catBtn.textContent = catLink.textContent;

        const itemsDiv = document.createElement('div');
        itemsDiv.classList.add('subnav-items');
        itemsDiv.setAttribute('aria-hidden', 'true');

        catItems.querySelectorAll(':scope > li').forEach((li) => {
          const anchor = li.querySelector('a');
          if (anchor) {
            const a = anchor.cloneNode(true);
            a.classList.add('subnav-link');
            if (a.classList.contains('more-link')) {
              a.classList.add('subnav-more');
              a.textContent = 'More';
            }
            itemsDiv.append(a);
          }
        });

        catBtn.addEventListener('click', () => {
          const expanded = catBtn.getAttribute('aria-expanded') === 'true';
          // Close all other categories in this panel
          catGroup.parentElement.querySelectorAll('.subnav-cat-btn[aria-expanded="true"]').forEach((btn) => {
            if (btn !== catBtn) {
              btn.setAttribute('aria-expanded', 'false');
              btn.nextElementSibling.setAttribute('aria-hidden', 'true');
            }
          });
          catBtn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
          itemsDiv.setAttribute('aria-hidden', expanded ? 'true' : 'false');
        });

        catGroup.append(catBtn);
        catGroup.append(itemsDiv);
      } else if (catLink) {
        // Simple link without sub-items
        const a = catLink.cloneNode(true);
        a.classList.add('subnav-cat-link');
        catGroup.append(a);
      }

      panel.append(catGroup);
    });
  }

  return panel;
}

function togglePanel(nav) {
  const expanded = nav.getAttribute('aria-expanded') === 'true';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  document.body.classList.toggle('nav-open', !expanded);
  document.body.style.overflowY = expanded ? '' : 'hidden';

  const overlay = document.querySelector('.nav-overlay');
  if (overlay) overlay.classList.toggle('active', !expanded);

  // Reset to main nav view when closing
  if (expanded) {
    nav.querySelectorAll('.subnav-panel').forEach((p) => {
      p.setAttribute('aria-hidden', 'true');
    });
  }
}

function createUserIcon() {
  const icon = document.createElement('span');
  icon.classList.add('user-icon');
  return icon;
}

function buildHeaderBar(brandNavDiv, toolsDiv, nav) {
  const headerBar = document.createElement('div');
  headerBar.classList.add('header-bar');

  // Logo
  const navBrand = document.createElement('div');
  navBrand.classList.add('nav-brand');
  const logoLink = findLogoLink(brandNavDiv);
  if (logoLink) {
    const logo = logoLink.cloneNode(true);
    logo.classList.add('nav-logo');
    navBrand.append(logo);
  }

  headerBar.append(navBrand);

  // Header right icons — order: bell, user, hamburger (matches original)
  const headerRight = document.createElement('div');
  headerRight.classList.add('header-right');

  // Alert bell
  const tools = findToolElements(toolsDiv);
  if (tools.alertBadge !== null) {
    const alertBtn = document.createElement('button');
    alertBtn.classList.add('mobile-alert');
    alertBtn.setAttribute('aria-label', 'News alerts');
    const alertIcon = document.createElement('span');
    alertIcon.classList.add('alert-icon');
    alertBtn.append(alertIcon);
    if (tools.alertBadge) {
      const badge = document.createElement('span');
      badge.classList.add('alert-badge');
      badge.textContent = tools.alertBadge;
      alertBtn.append(badge);
    }
    headerRight.append(alertBtn);
  }

  // User/Login icon
  const userBtn = document.createElement('button');
  userBtn.classList.add('header-user-btn');
  userBtn.setAttribute('aria-label', 'Login');
  userBtn.append(createUserIcon());
  headerRight.append(userBtn);

  // Hamburger toggle
  const hamburger = document.createElement('button');
  hamburger.classList.add('header-toggle');
  hamburger.setAttribute('aria-controls', 'nav');
  hamburger.setAttribute('aria-label', 'Toggle Menu');
  const toggleIcon = document.createElement('span');
  toggleIcon.classList.add('toggle-icon');
  hamburger.append(toggleIcon);
  hamburger.addEventListener('click', () => togglePanel(nav));
  headerRight.append(hamburger);

  headerBar.append(headerRight);
  return headerBar;
}

function buildPanelBottom(toolsDiv) {
  const panelBottom = document.createElement('div');
  panelBottom.classList.add('panel-bottom');

  const tools = findToolElements(toolsDiv);

  const authDiv = document.createElement('div');
  authDiv.classList.add('panel-auth');

  if (tools.loginText) {
    const login = document.createElement('button');
    login.classList.add('panel-login');
    login.textContent = tools.loginText;
    authDiv.append(login);
  }

  if (tools.signUpLink) {
    const signup = tools.signUpLink.cloneNode(true);
    signup.classList.add('panel-signup');
    authDiv.append(signup);
  }
  panelBottom.append(authDiv);

  if (tools.localeText) {
    const localeDiv = document.createElement('div');
    localeDiv.classList.add('panel-locale');
    const locale = document.createElement('button');
    locale.classList.add('locale-btn');
    const globeSpan = document.createElement('span');
    globeSpan.classList.add('locale-globe');
    locale.append(globeSpan);
    const localeLabel = document.createElement('span');
    localeLabel.textContent = tools.localeText;
    locale.append(localeLabel);
    const chevronSpan = document.createElement('span');
    chevronSpan.classList.add('locale-chevron');
    locale.append(chevronSpan);
    localeDiv.append(locale);
    panelBottom.append(localeDiv);
  }

  return panelBottom;
}

function buildSlidePanel(brandNavDiv, toolsDiv, nav) {
  const slidePanel = document.createElement('div');
  slidePanel.classList.add('slide-panel');

  // Panel top: Help link
  const panelTop = document.createElement('div');
  panelTop.classList.add('panel-top');
  const tools = findToolElements(toolsDiv);
  if (tools.helpLink) {
    const help = tools.helpLink.cloneNode(true);
    help.classList.add('panel-help');
    panelTop.append(help);
  }
  slidePanel.append(panelTop);

  // Search box
  if (tools.hasSearch) {
    const searchWrap = document.createElement('div');
    searchWrap.classList.add('panel-search');
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.classList.add('panel-search-input');
    searchInput.setAttribute('placeholder', 'Ask a question');
    searchWrap.append(searchInput);
    const searchBtn = document.createElement('button');
    searchBtn.classList.add('panel-search-btn');
    searchBtn.setAttribute('aria-label', 'Search');
    searchWrap.append(searchBtn);
    slidePanel.append(searchWrap);
  }

  // Main nav items list
  const navList = document.createElement('div');
  navList.classList.add('nav-list');
  const navUl = findMainNavList(brandNavDiv);
  if (navUl) {
    navUl.querySelectorAll(':scope > li').forEach((item) => {
      const link = findItemLink(item);
      if (!link) return;

      const label = link.textContent.trim();
      const hasSubNav = !!item.querySelector(':scope > ul');

      const navBtn = document.createElement('button');
      navBtn.classList.add('nav-item');
      navBtn.textContent = label;
      if (hasSubNav) navBtn.classList.add('has-subnav');

      if (hasSubNav) {
        const subNavPanel = buildSubNavPanel(item, label);
        slidePanel.append(subNavPanel);
        navBtn.addEventListener('click', () => {
          slidePanel.querySelectorAll('.subnav-panel').forEach((p) => {
            p.setAttribute('aria-hidden', 'true');
          });
          subNavPanel.setAttribute('aria-hidden', 'false');
        });
      } else {
        navBtn.addEventListener('click', () => {
          window.location.href = link.href;
        });
      }

      navList.append(navBtn);
    });
  }
  slidePanel.append(navList);

  // Panel bottom: Login/SignUp + Locale
  slidePanel.append(buildPanelBottom(toolsDiv));

  nav.append(slidePanel);
}

function buildUtilityRow(toolsDiv) {
  const row = document.createElement('div');
  row.classList.add('desktop-utility-row');

  const inner = document.createElement('div');
  inner.classList.add('desktop-utility-inner');

  const tools = findToolElements(toolsDiv);
  const items = [];

  // Alert bell — only if authored in nav content
  if (tools.alertBadge !== null) {
    const alertBtn = document.createElement('button');
    alertBtn.classList.add('utility-alert');
    alertBtn.setAttribute('aria-label', 'News alerts');
    const alertIcon = document.createElement('span');
    alertIcon.classList.add('alert-icon');
    alertBtn.append(alertIcon);
    if (tools.alertBadge) {
      const badge = document.createElement('span');
      badge.classList.add('alert-badge');
      badge.textContent = tools.alertBadge;
      alertBtn.append(badge);
    }
    items.push(alertBtn);
  }

  // Chat button — only if authored in nav content
  if (tools.chatLabel) {
    const chatBtn = document.createElement('button');
    chatBtn.classList.add('utility-chat');
    chatBtn.setAttribute('aria-label', tools.chatLabel);
    const chatIcon = document.createElement('span');
    chatIcon.classList.add('chat-icon');
    chatBtn.append(chatIcon);
    const chatLabelSpan = document.createElement('span');
    chatLabelSpan.textContent = tools.chatLabel;
    chatBtn.append(chatLabelSpan);
    items.push(chatBtn);
  }

  // Help link
  if (tools.helpLink) {
    const link = tools.helpLink.cloneNode(true);
    link.classList.add('utility-link');
    items.push(link);
  }

  // Feedback link
  if (tools.feedbackLink) {
    const link = tools.feedbackLink.cloneNode(true);
    link.classList.add('utility-link');
    items.push(link);
  }

  // Locale with globe icon
  if (tools.localeText) {
    const locale = document.createElement('button');
    locale.classList.add('utility-locale');
    const globe = document.createElement('span');
    globe.classList.add('globe-icon');
    locale.append(globe);
    const localeLabel = document.createElement('span');
    localeLabel.textContent = tools.localeText;
    locale.append(localeLabel);
    items.push(locale);
  }

  // Append items with separators between them
  items.forEach((item, i) => {
    inner.append(item);
    if (i < items.length - 1) {
      const sep = document.createElement('span');
      sep.classList.add('utility-sep');
      sep.setAttribute('aria-hidden', 'true');
      sep.textContent = '|';
      inner.append(sep);
    }
  });

  row.append(inner);
  return row;
}

function buildMegamenuPanel(navItem, index) {
  const panel = document.createElement('div');
  panel.classList.add('megamenu');
  panel.id = `megamenu-${index}`;
  panel.setAttribute('aria-hidden', 'true');
  panel.setAttribute('role', 'menu');

  const inner = document.createElement('div');
  inner.classList.add('megamenu-inner');

  const grid = document.createElement('div');
  grid.classList.add('megamenu-grid');

  const subList = navItem.querySelector(':scope > ul');
  if (subList) {
    subList.querySelectorAll(':scope > li').forEach((cat) => {
      const col = document.createElement('div');
      col.classList.add('megamenu-col');

      const catLink = findItemLink(cat);
      if (catLink) {
        const heading = document.createElement('h3');
        heading.classList.add('megamenu-heading');
        const headLink = catLink.cloneNode(true);
        heading.append(headLink);
        col.append(heading);
      }

      const catItems = cat.querySelector(':scope > ul');
      if (catItems) {
        const ul = document.createElement('ul');
        ul.classList.add('megamenu-links');
        catItems.querySelectorAll(':scope > li').forEach((li) => {
          const anchor = li.querySelector('a');
          if (anchor) {
            const menuLi = document.createElement('li');
            const a = anchor.cloneNode(true);
            a.setAttribute('role', 'menuitem');
            if (a.classList.contains('more-link')) {
              a.classList.add('megamenu-more');
              a.textContent = 'More';
            }
            menuLi.append(a);
            ul.append(menuLi);
          }
        });
        col.append(ul);
      }

      grid.append(col);
    });
  }

  inner.append(grid);
  panel.append(inner);
  return panel;
}

function buildDesktopNavLinks(brandNavDiv) {
  const navLinks = document.createElement('div');
  navLinks.classList.add('desktop-nav-links');

  const navUl = findMainNavList(brandNavDiv);
  if (navUl) {
    navUl.querySelectorAll(':scope > li').forEach((item, i) => {
      const link = findItemLink(item);
      if (!link) return;

      const navItem = document.createElement('div');
      navItem.classList.add('desktop-nav-item');

      const navLink = document.createElement('a');
      navLink.classList.add('desktop-nav-link');
      navLink.href = link.href;
      navLink.textContent = link.textContent.trim();
      navLink.setAttribute('aria-expanded', 'false');
      navLink.setAttribute('aria-controls', `megamenu-${i}`);
      navItem.append(navLink);

      const hasSubNav = !!item.querySelector(':scope > ul');
      if (hasSubNav) {
        navItem.append(buildMegamenuPanel(item, i));
      }

      navLinks.append(navItem);
    });
  }

  return navLinks;
}

function buildSearchPanel() {
  const panel = document.createElement('div');
  panel.classList.add('search-panel');
  panel.setAttribute('aria-hidden', 'true');

  const inner = document.createElement('div');
  inner.classList.add('search-panel-inner');

  // Heading: "Find answers with the help of AI"
  const heading = document.createElement('h2');
  heading.classList.add('search-panel-heading');
  heading.textContent = 'Find answers with the help of AI';

  // Search row: input + button
  const searchRow = document.createElement('div');
  searchRow.classList.add('search-panel-row');

  const input = document.createElement('input');
  input.type = 'text';
  input.classList.add('search-panel-input');
  input.setAttribute('placeholder', 'Ask a question');

  const searchBtn = document.createElement('button');
  searchBtn.classList.add('search-panel-btn');
  const sparkle = document.createElement('span');
  sparkle.classList.add('search-panel-sparkle');
  sparkle.textContent = '\u2728';
  searchBtn.append(sparkle, document.createTextNode(' SEARCH'));

  searchRow.append(input, searchBtn);
  inner.append(heading, searchRow);
  panel.append(inner);

  // Close button at bottom
  const closeRow = document.createElement('div');
  closeRow.classList.add('search-panel-close-row');
  const closeBtn = document.createElement('button');
  closeBtn.classList.add('search-panel-close');
  closeBtn.textContent = 'CLOSE';
  closeBtn.addEventListener('click', () => {
    panel.setAttribute('aria-hidden', 'true');
  });
  closeRow.append(closeBtn);
  panel.append(closeRow);

  return panel;
}

function toggleSearchPanel(panel) {
  const isOpen = panel.getAttribute('aria-hidden') === 'false';
  panel.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
  if (!isOpen) {
    const input = panel.querySelector('.search-panel-input');
    if (input instanceof HTMLInputElement) input.focus();
  }
}

function buildDesktopRight(toolsDiv) {
  const right = document.createElement('div');
  right.classList.add('desktop-right');

  const tools = findToolElements(toolsDiv);

  if (tools.hasSearch) {
    const search = document.createElement('button');
    search.classList.add('desktop-search');
    search.setAttribute('aria-label', 'Search');
    const searchIcon = document.createElement('span');
    searchIcon.classList.add('search-icon');
    search.append(searchIcon);
    right.append(search);
  }

  const auth = document.createElement('div');
  auth.classList.add('desktop-auth');

  if (tools.loginText) {
    const login = document.createElement('button');
    login.classList.add('desktop-login');
    login.textContent = tools.loginText;
    auth.append(login);
  }

  const sep = document.createElement('span');
  sep.classList.add('desktop-auth-sep');
  sep.textContent = '|';
  auth.append(sep);

  if (tools.signUpLink) {
    const signup = tools.signUpLink.cloneNode(true);
    signup.classList.add('desktop-signup');
    auth.append(signup);
  }

  right.append(auth);
  return right;
}

function buildDesktopHeader(brandNavDiv, toolsDiv) {
  const desktop = document.createElement('div');
  desktop.classList.add('desktop-header');

  desktop.append(buildUtilityRow(toolsDiv));

  const mainRow = document.createElement('div');
  mainRow.classList.add('desktop-main-row');

  const mainInner = document.createElement('div');
  mainInner.classList.add('desktop-main-inner');

  // Logo
  const deskLogoLink = findLogoLink(brandNavDiv);
  if (deskLogoLink) {
    const logo = deskLogoLink.cloneNode(true);
    logo.classList.add('desktop-logo');
    mainInner.append(logo);
  }

  mainInner.append(buildDesktopNavLinks(brandNavDiv));
  mainInner.append(buildDesktopRight(toolsDiv));

  mainRow.append(mainInner);
  desktop.append(mainRow);

  // Search panel — appended after main row, toggled by search icon
  const tools = findToolElements(toolsDiv);
  if (tools.hasSearch) {
    const searchPanel = buildSearchPanel();
    desktop.append(searchPanel);

    const searchBtn = desktop.querySelector('.desktop-search');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => toggleSearchPanel(searchPanel));
    }

    // Close on Escape
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && searchPanel.getAttribute('aria-hidden') === 'false') {
        searchPanel.setAttribute('aria-hidden', 'true');
      }
    });
  }

  return desktop;
}

function attachMegamenuBehavior(desktopHeader) {
  const navItems = desktopHeader.querySelectorAll('.desktop-nav-item');
  let closeTimeout = null;

  const overlay = document.createElement('div');
  overlay.classList.add('megamenu-overlay');
  document.body.append(overlay);

  function closeAllMenus() {
    navItems.forEach((item) => {
      const link = item.querySelector('.desktop-nav-link');
      const menu = item.querySelector('.megamenu');
      if (link) link.setAttribute('aria-expanded', 'false');
      if (menu) menu.setAttribute('aria-hidden', 'true');
    });
    overlay.classList.remove('active');
  }

  function openMenu(item) {
    if (closeTimeout) clearTimeout(closeTimeout);
    closeAllMenus();
    const link = item.querySelector('.desktop-nav-link');
    const menu = item.querySelector('.megamenu');
    if (link) link.setAttribute('aria-expanded', 'true');
    if (menu) {
      menu.setAttribute('aria-hidden', 'false');
      overlay.classList.add('active');
    }
  }

  function scheduleClose() {
    closeTimeout = setTimeout(closeAllMenus, 150);
  }

  navItems.forEach((item) => {
    item.addEventListener('mouseenter', () => openMenu(item));
    item.addEventListener('mouseleave', scheduleClose);
    item.addEventListener('focusin', () => openMenu(item));
    item.addEventListener('focusout', (e) => {
      if (!item.contains(e.relatedTarget)) scheduleClose();
    });
  });

  overlay.addEventListener('click', closeAllMenus);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') closeAllMenus();
  });
}

function parseLocaleData(localeDiv) {
  if (!localeDiv) return { heading: '', locales: [] };
  const inner = localeDiv.querySelector(':scope > div') || localeDiv;
  const heading = inner.querySelector('h2')?.textContent || '';
  const locales = [];
  const h3s = inner.querySelectorAll('h3');
  h3s.forEach((h3) => {
    const p = h3.nextElementSibling;
    if (p && p.tagName === 'P') {
      locales.push({
        region: h3.textContent,
        locales: p.textContent.split(',').map((l) => l.trim()).filter(Boolean),
      });
    }
  });
  return { heading, locales };
}

function buildLocalePopup() {
  const popup = document.createElement('div');
  popup.classList.add('locale-popup');
  popup.setAttribute('aria-hidden', 'true');

  const dialog = document.createElement('div');
  dialog.classList.add('locale-popup-dialog');
  dialog.setAttribute('role', 'dialog');
  /* Wide: non-modal (page scrolls). Narrow: full-screen modal */
  dialog.setAttribute('aria-modal', 'true');

  const closeBtn = document.createElement('button');
  closeBtn.classList.add('locale-popup-close');
  closeBtn.setAttribute('aria-label', 'Close');

  const content = document.createElement('div');
  content.classList.add('locale-popup-content');

  const heading = document.createElement('h2');
  heading.classList.add('locale-popup-heading');
  heading.id = 'locale-popup-heading';
  dialog.setAttribute('aria-labelledby', 'locale-popup-heading');
  content.append(heading);

  dialog.append(closeBtn, content);
  popup.append(dialog);

  closeBtn.addEventListener('click', () => {
    popup.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('locale-open');
  });

  /* Tap padded area outside inner content (narrow layout only) */
  popup.addEventListener('click', (e) => {
    if (e.target !== popup) return;
    if (window.matchMedia('(min-width: 1079px)').matches) return;
    popup.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('locale-open');
  });

  return popup;
}

function populateLocalePopup(popup, localeData) {
  const content = popup.querySelector('.locale-popup-content');
  const { heading, locales: regions } = localeData;
  if (heading) {
    popup.querySelector('.locale-popup-heading').textContent = heading;
  }
  regions.forEach((region) => {
    const section = document.createElement('div');
    section.classList.add('locale-region');

    const regionHeading = document.createElement('div');
    regionHeading.classList.add('locale-region-heading');
    regionHeading.textContent = region.region;
    section.append(regionHeading);

    const grid = document.createElement('div');
    grid.classList.add('locale-grid');

    // Split locales into 3 columns (top-to-bottom flow like original)
    const total = region.locales.length;
    const colCount = 3;
    const base = Math.floor(total / colCount);
    const extra = total % colCount;
    let offset = 0;
    for (let c = 0; c < colCount; c += 1) {
      const size = base + (c < extra ? 1 : 0);
      if (size === 0) break;
      const col = document.createElement('div');
      col.classList.add('locale-column');
      for (let i = 0; i < size; i += 1) {
        const btn = document.createElement('button');
        btn.classList.add('locale-option');
        // eslint-disable-next-line secure-coding/detect-object-injection -- index bounded by column split of parsed nav locales
        btn.textContent = region.locales[offset + i];
        col.append(btn);
      }
      offset += size;
      grid.append(col);
    }

    section.append(grid);
    content.append(section);
  });
}

function textAt(paragraphs, i) {
  return i < paragraphs.length ? paragraphs[i].textContent.trim() : '';
}

function linkAt(paragraphs, i) {
  if (i >= paragraphs.length) return null;
  const a = paragraphs[i].querySelector('a');
  return a ? { text: a.textContent.trim(), href: a.href } : null;
}

function parseLoginFragment(wrapper) {
  const h2 = wrapper.querySelector('h2');
  const heading = h2 ? h2.textContent.trim() : 'Log in';

  // Radio options come from the <ul> list
  const radioOptions = [...wrapper.querySelectorAll('ul > li')]
    .map((li) => li.textContent.trim());

  // Ordered <p> fields: userLabel, passLabel, rememberLabel, resetLink,
  // submitLabel, forgotMemberLink, signupText, signupLink
  const paragraphs = [...wrapper.querySelectorAll('p')];
  let idx = 0;
  const userLabel = textAt(paragraphs, idx); idx += 1;
  // eslint-disable-next-line secure-coding/no-hardcoded-credentials -- label text, not a credential
  const passLabel = textAt(paragraphs, idx); idx += 1;
  const rememberLabel = textAt(paragraphs, idx); idx += 1;
  const resetLink = linkAt(paragraphs, idx); idx += 1;
  const submitLabel = textAt(paragraphs, idx); idx += 1;
  const forgotMemberLink = linkAt(paragraphs, idx); idx += 1;
  const signupText = textAt(paragraphs, idx); idx += 1;
  const signupLink = linkAt(paragraphs, idx);

  return {
    heading,
    radioOptions,
    userLabel,
    passLabel,
    rememberLabel,
    resetLink,
    submitLabel,
    forgotMemberLink,
    signupText,
    signupLink,
  };
}

function parseLoginData(loginDiv) {
  if (!loginDiv) return null;
  const inner = loginDiv.querySelector(':scope > div') || loginDiv;
  return parseLoginFragment(inner);
}

function buildLoginPopup(loginData) {
  const popup = document.createElement('div');
  popup.classList.add('login-popup');
  popup.setAttribute('aria-hidden', 'true');

  // Overlay
  const overlay = document.createElement('div');
  overlay.classList.add('login-popup-overlay');
  popup.append(overlay);

  const dialog = document.createElement('div');
  dialog.classList.add('login-popup-dialog');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'login-popup-heading');

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.classList.add('login-popup-close');
  closeBtn.setAttribute('aria-label', 'Close');
  dialog.append(closeBtn);

  // Heading
  const heading = document.createElement('h2');
  heading.classList.add('login-popup-heading');
  heading.id = 'login-popup-heading';
  heading.textContent = loginData.heading;
  dialog.append(heading);

  // Radio group
  if (loginData.radioOptions.length > 0) {
    const radioGroup = document.createElement('div');
    radioGroup.classList.add('login-radio-group');
    radioGroup.setAttribute('role', 'radiogroup');
    loginData.radioOptions.forEach((option, i) => {
      const label = document.createElement('label');
      label.classList.add('login-radio-label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'login-type';
      radio.classList.add('login-radio');
      if (i === 0) radio.checked = true;
      const span = document.createElement('span');
      span.textContent = option;
      label.append(radio, span);
      radioGroup.append(label);
    });
    dialog.append(radioGroup);
  }

  // Form fields
  const form = document.createElement('div');
  form.classList.add('login-form');

  // Username field
  const userField = document.createElement('div');
  userField.classList.add('login-field');
  const userInput = document.createElement('input');
  userInput.type = 'text';
  userInput.classList.add('login-input');
  userInput.setAttribute('placeholder', ' ');
  userInput.id = 'login-user';
  const userLabelEl = document.createElement('label');
  userLabelEl.classList.add('login-label');
  userLabelEl.setAttribute('for', 'login-user');
  userLabelEl.textContent = loginData.userLabel;
  userField.append(userInput, userLabelEl);
  form.append(userField);

  const passField = document.createElement('div');
  passField.classList.add('login-field');
  const passInput = document.createElement('input');
  // eslint-disable-next-line secure-coding/no-hardcoded-credentials -- HTML input type attribute, not a credential
  passInput.type = 'password';
  passInput.classList.add('login-input');
  passInput.setAttribute('placeholder', ' ');
  passInput.id = 'login-pass';
  const passLabelEl = document.createElement('label');
  passLabelEl.classList.add('login-label');
  passLabelEl.setAttribute('for', 'login-pass');
  passLabelEl.textContent = loginData.passLabel;
  passField.append(passInput, passLabelEl);
  form.append(passField);

  // Options row: Remember me + Reset Password
  const optionsRow = document.createElement('div');
  optionsRow.classList.add('login-options');
  const rememberWrap = document.createElement('label');
  rememberWrap.classList.add('login-remember');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.classList.add('login-checkbox');
  const rememberText = document.createElement('span');
  rememberText.textContent = loginData.rememberLabel;
  rememberWrap.append(checkbox, rememberText);
  optionsRow.append(rememberWrap);

  if (loginData.resetLink) {
    const reset = document.createElement('a');
    reset.href = loginData.resetLink.href;
    reset.textContent = loginData.resetLink.text;
    reset.classList.add('login-reset-link');
    optionsRow.append(reset);
  }
  form.append(optionsRow);

  // Submit button
  const submitBtn = document.createElement('button');
  submitBtn.classList.add('login-submit');
  submitBtn.textContent = loginData.submitLabel;
  form.append(submitBtn);

  // Bottom links
  const bottomLinks = document.createElement('div');
  bottomLinks.classList.add('login-bottom-links');

  if (loginData.forgotMemberLink) {
    const link = document.createElement('a');
    link.href = loginData.forgotMemberLink.href;
    link.textContent = loginData.forgotMemberLink.text;
    link.classList.add('login-bottom-link');
    bottomLinks.append(link);
  }

  if (loginData.signupLink) {
    const wrap = document.createElement('div');
    wrap.classList.add('login-bottom-link');
    const textBefore = loginData.signupText || '';
    if (textBefore) wrap.append(document.createTextNode(textBefore));
    const signupA = document.createElement('a');
    signupA.href = loginData.signupLink.href;
    signupA.textContent = loginData.signupLink.text;
    wrap.append(signupA);
    bottomLinks.append(wrap);
  }

  form.append(bottomLinks);
  dialog.append(form);
  popup.append(dialog);

  // Close handlers
  function closePopup() {
    popup.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('login-open');
  }

  closeBtn.addEventListener('click', closePopup);
  overlay.addEventListener('click', closePopup);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && popup.getAttribute('aria-hidden') === 'false') {
      closePopup();
    }
  });

  return popup;
}

function openLoginPopup(popup) {
  popup.setAttribute('aria-hidden', 'false');
  document.body.classList.add('login-open');
}

function openLocalePopup(popup) {
  popup.setAttribute('aria-hidden', 'false');
  const wide = window.matchMedia('(min-width: 1079px)').matches;
  if (wide) {
    /* Class rule loses to inline overflow from togglePanel(hamburger); clear so page can scroll */
    document.body.style.overflowY = '';
    document.body.classList.remove('locale-open');
  } else {
    document.body.classList.add('locale-open');
  }
  const dialog = popup.querySelector('.locale-popup-dialog');
  if (dialog) dialog.setAttribute('aria-modal', wide ? 'false' : 'true');
}

/* ---- Chat panel (5th nav section) ---- */

function parseChatData(chatDiv) {
  if (!chatDiv) return null;
  const inner = chatDiv.querySelector(':scope > div') || chatDiv;
  const h2 = inner.querySelector('h2');
  const title = h2 ? h2.textContent.trim() : 'Chat with Kris';

  const paragraphs = [...inner.querySelectorAll('p')];
  const welcomeMsg = textAt(paragraphs, 0);
  const examples = [...inner.querySelectorAll('ul > li')]
    .map((li) => li.textContent.trim());
  const placeholder = textAt(paragraphs, 1);
  const disclaimer = textAt(paragraphs, 2);
  const startOverLabel = textAt(paragraphs, 3);
  const tcsLink = linkAt(paragraphs, 4);

  return {
    title,
    welcomeMsg,
    examples,
    placeholder,
    disclaimer,
    startOverLabel,
    tcsLink,
  };
}

// eslint-disable-next-line browser-security/detect-mixed-content, browser-security/no-http-urls -- SVG namespace URI
const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function createCloseSvg() {
  const svg = svgEl('svg', { width: '20', height: '20', viewBox: '0 0 20 20', fill: 'none' });
  const p1 = svgEl('path', { d: 'M15 5L5 15', stroke: '#333', 'stroke-width': '1.5', 'stroke-linecap': 'round' });
  const p2 = svgEl('path', { d: 'M5 5L15 15', stroke: '#333', 'stroke-width': '1.5', 'stroke-linecap': 'round' });
  svg.append(p1, p2);
  return svg;
}

function createSendSvg() {
  const svg = svgEl('svg', { width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none' });
  const g = svgEl('g', { 'clip-path': 'url(#sendClip)' });
  const arrowD = [
    'M4.698 4.033L21 12l-16.302 7.966',
    'a.543.543 0 0 1-.292-.124.55.55 0 0 1-.153-.267',
    '.56.56 0 0 1 .02-.325L6.5 12 4.032 4.726',
    'a.56.56 0 0 1 .02-.3.55.55 0 0 1 .153-.268',
    '.543.543 0 0 1 .493-.124Z',
  ].join('');
  const p1 = svgEl('path', {
    d: arrowD, stroke: '#999', 'stroke-width': '1.333', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  });
  const p2 = svgEl('path', {
    d: 'M6.5 12H21', stroke: '#999', 'stroke-width': '1.333', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  });
  g.append(p1, p2);
  const defs = svgEl('defs');
  const clip = svgEl('clipPath', { id: 'sendClip' });
  clip.append(svgEl('rect', { width: '24', height: '24', fill: 'white' }));
  defs.append(clip);
  svg.append(g, defs);
  return svg;
}

function createRefreshSvg() {
  const svg = svgEl('svg', { width: '12', height: '12', viewBox: '0 0 12 12', fill: 'none' });
  const pathD = [
    'M7.642 7.991a4 4 0 0 1-2.646.989',
    ' 4 4 0 0 1-2.64-1.005A4 4 0 0 1 1.04 5.476',
    ' 4 4 0 0 1 1.7 2.73a4 4 0 0 1 2.312-1.624',
    ' 4 4 0 0 1 2.808.308 4 4 0 0 1 1.905 2.086',
    'M8.975 1v2.5h-2.5',
  ].join('');
  svg.append(svgEl('path', {
    d: pathD, stroke: '#0254EC', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  }));
  return svg;
}

function buildChatPanel(chatData) {
  const panel = document.createElement('div');
  panel.classList.add('chat-panel');
  panel.setAttribute('aria-hidden', 'true');

  // Header bar
  const header = document.createElement('div');
  header.classList.add('chat-panel-header');

  const headerLeft = document.createElement('div');
  headerLeft.classList.add('chat-panel-header-left');

  const chatIcon = document.createElement('span');
  chatIcon.classList.add('chat-panel-icon');
  headerLeft.append(chatIcon);

  const titleEl = document.createElement('span');
  titleEl.classList.add('chat-panel-title');
  titleEl.textContent = chatData.title;
  headerLeft.append(titleEl);

  const closeBtn = document.createElement('button');
  closeBtn.classList.add('chat-panel-close');
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.append(createCloseSvg());

  header.append(headerLeft, closeBtn);
  panel.append(header);

  // Messages area
  const messages = document.createElement('div');
  messages.classList.add('chat-panel-messages');

  // Welcome bubble
  const bubble1 = document.createElement('div');
  bubble1.classList.add('chat-bubble');
  bubble1.textContent = chatData.welcomeMsg;
  messages.append(bubble1);

  // Examples bubble
  if (chatData.examples.length > 0) {
    const bubble2 = document.createElement('div');
    bubble2.classList.add('chat-bubble');
    const intro = document.createElement('p');
    intro.textContent = 'Just start a chat by typing in your questions, such as:';
    bubble2.append(intro);
    const ul = document.createElement('ul');
    chatData.examples.forEach((ex) => {
      const li = document.createElement('li');
      li.textContent = ex;
      ul.append(li);
    });
    bubble2.append(ul);
    messages.append(bubble2);
  }

  panel.append(messages);

  // Input area
  const inputArea = document.createElement('div');
  inputArea.classList.add('chat-panel-input');

  const input = document.createElement('input');
  input.type = 'text';
  input.classList.add('chat-input');
  input.setAttribute('placeholder', chatData.placeholder || 'Ask a question...');
  inputArea.append(input);

  const sendBtn = document.createElement('button');
  sendBtn.classList.add('chat-send-btn');
  sendBtn.setAttribute('aria-label', 'Send');
  sendBtn.append(createSendSvg());
  inputArea.append(sendBtn);

  panel.append(inputArea);

  // Footer
  const footer = document.createElement('div');
  footer.classList.add('chat-panel-footer');

  const disc = document.createElement('span');
  disc.classList.add('chat-disclaimer');
  disc.textContent = chatData.disclaimer;
  footer.append(disc);

  const footerLinks = document.createElement('div');
  footerLinks.classList.add('chat-footer-links');

  const startOver = document.createElement('button');
  startOver.classList.add('chat-start-over');
  const startOverText = document.createElement('span');
  startOverText.textContent = chatData.startOverLabel || 'Start over';
  startOver.append(startOverText);
  startOver.append(createRefreshSvg());
  footerLinks.append(startOver);

  if (chatData.tcsLink) {
    const sep = document.createElement('span');
    sep.classList.add('chat-footer-sep');
    sep.textContent = '|';
    footerLinks.append(sep);
    const tcs = document.createElement('a');
    tcs.classList.add('chat-tcs-link');
    tcs.href = chatData.tcsLink.href;
    tcs.textContent = chatData.tcsLink.text;
    footerLinks.append(tcs);
  }

  footer.append(footerLinks);
  panel.append(footer);

  // Close handlers
  function closePanel() {
    panel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('chat-open');
  }

  closeBtn.addEventListener('click', closePanel);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && panel.getAttribute('aria-hidden') === 'false') {
      closePanel();
    }
  });

  return panel;
}

function openChatPanel(panel) {
  panel.setAttribute('aria-hidden', 'false');
  document.body.classList.add('chat-open');
}

/**
 * loads and decorates the header
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const resp = await fetch(`${navPath}.plain.html`);
  if (!resp.ok) return;

  const html = await resp.text();
  const fragment = document.createRange().createContextualFragment(html);
  const wrapper = document.createElement('div');
  wrapper.append(fragment);
  const topDivs = wrapper.querySelectorAll(':scope > div');
  const brandNavDiv = topDivs[0];
  const toolsDiv = topDivs[1];
  const localeDiv = topDivs[2] || null;
  const loginDiv = topDivs[3] || null;
  const chatDiv = topDivs[4] || null;

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main navigation');
  nav.setAttribute('aria-expanded', 'false');

  nav.append(buildHeaderBar(brandNavDiv, toolsDiv, nav));
  buildSlidePanel(brandNavDiv, toolsDiv, nav);

  // Desktop horizontal nav (>= 1080px)
  const desktopHeader = buildDesktopHeader(brandNavDiv, toolsDiv);
  nav.append(desktopHeader);
  attachMegamenuBehavior(desktopHeader);

  // Overlay (behind panel)
  const overlay = document.createElement('div');
  overlay.classList.add('nav-overlay');
  overlay.addEventListener('click', () => togglePanel(nav));
  document.body.append(overlay);

  window.addEventListener('keydown', closeOnEscape);

  // Locale popup — content from nav document (3rd section)
  const localePopup = buildLocalePopup();
  const localeData = parseLocaleData(localeDiv);
  populateLocalePopup(localePopup, localeData);
  document.body.append(localePopup);

  // Wire all locale buttons to open popup
  nav.querySelectorAll('.locale-btn, .utility-locale').forEach((btn) => {
    btn.addEventListener('click', () => openLocalePopup(localePopup));
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && localePopup.getAttribute('aria-hidden') === 'false') {
      localePopup.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('locale-open');
    }
  });

  // Login popup — content from nav document (4th section)
  const loginData = parseLoginData(loginDiv);
  if (loginData) {
    const loginPopup = buildLoginPopup(loginData);
    document.body.append(loginPopup);

    // Desktop login, mobile header user, slide-panel login — same popup
    const openLogin = () => openLoginPopup(loginPopup);
    nav.querySelectorAll('.desktop-login, .header-user-btn, .panel-login').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('panel-login') && nav.getAttribute('aria-expanded') === 'true') {
          togglePanel(nav);
        }
        openLogin();
      });
    });
  }

  // Chat panel — content from nav document (5th section)
  const chatData = parseChatData(chatDiv);
  if (chatData) {
    const chatPanel = buildChatPanel(chatData);
    document.body.append(chatPanel);

    // Wire all chat buttons (mobile + desktop utility bar)
    nav.querySelectorAll('.utility-chat').forEach((btn) => {
      btn.addEventListener('click', () => openChatPanel(chatPanel));
    });
  }

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  block.textContent = '';
  navWrapper.append(nav);
  block.append(navWrapper);
}
