import { getMetadata } from '../../scripts/aem.js';

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

      const catLink = cat.querySelector(':scope > a');
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

function buildHeaderBar(brandNavDiv, nav) {
  const headerBar = document.createElement('div');
  headerBar.classList.add('header-bar');

  // Logo
  const navBrand = document.createElement('div');
  navBrand.classList.add('nav-brand');
  if (brandNavDiv) {
    const logoDiv = brandNavDiv.querySelector(':scope > div:first-child');
    if (logoDiv) {
      const logoLink = logoDiv.querySelector('a');
      if (logoLink) {
        const logo = logoLink.cloneNode(true);
        logo.classList.add('nav-logo');
        navBrand.append(logo);
      }
    }
  }
  headerBar.append(navBrand);

  // Header right icons
  const headerRight = document.createElement('div');
  headerRight.classList.add('header-right');

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

  if (toolsDiv) {
    const authDiv = document.createElement('div');
    authDiv.classList.add('panel-auth');

    const loginBtn = toolsDiv.querySelector('.login-btn');
    if (loginBtn) {
      const login = document.createElement('button');
      login.classList.add('panel-login');
      login.textContent = 'Log in';
      login.setAttribute('aria-label', 'Log in to access your account');
      authDiv.append(login);
    }

    const signUpLink = toolsDiv.querySelector('a[href*="registration"]');
    if (signUpLink) {
      const signup = signUpLink.cloneNode(true);
      signup.classList.add('panel-signup');
      signup.textContent = 'Sign Up';
      signup.setAttribute('aria-label', 'Sign up for a new account');
      authDiv.append(signup);
    }
    panelBottom.append(authDiv);

    const localeBtn = toolsDiv.querySelector('.locale-selector');
    if (localeBtn) {
      const localeDiv = document.createElement('div');
      localeDiv.classList.add('panel-locale');
      const locale = document.createElement('button');
      locale.classList.add('locale-btn');
      locale.textContent = localeBtn.textContent;
      localeDiv.append(locale);
      panelBottom.append(localeDiv);
    }
  }
  return panelBottom;
}

function buildSlidePanel(brandNavDiv, toolsDiv, nav) {
  const slidePanel = document.createElement('div');
  slidePanel.classList.add('slide-panel');

  // Panel top: Help link
  const panelTop = document.createElement('div');
  panelTop.classList.add('panel-top');
  if (toolsDiv) {
    const helpLink = toolsDiv.querySelector('a[href*="help"]');
    if (helpLink) {
      const help = helpLink.cloneNode(true);
      help.classList.add('panel-help');
      panelTop.append(help);
    }
  }
  slidePanel.append(panelTop);

  // Main nav items list
  const navList = document.createElement('div');
  navList.classList.add('nav-list');
  if (brandNavDiv) {
    const navUl = brandNavDiv.querySelector(':scope > div:nth-child(2) > ul');
    if (navUl) {
      navUl.querySelectorAll(':scope > li').forEach((item) => {
        const link = item.querySelector(':scope > a');
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
  }
  slidePanel.append(navList);

  // Panel bottom: Login/SignUp + Locale
  slidePanel.append(buildPanelBottom(toolsDiv));

  nav.append(slidePanel);
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

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main navigation');
  nav.setAttribute('aria-expanded', 'false');

  nav.append(buildHeaderBar(brandNavDiv, nav));
  buildSlidePanel(brandNavDiv, toolsDiv, nav);

  // Overlay (behind panel)
  const overlay = document.createElement('div');
  overlay.classList.add('nav-overlay');
  overlay.addEventListener('click', () => togglePanel(nav));
  document.body.append(overlay);

  window.addEventListener('keydown', closeOnEscape);

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  block.textContent = '';
  navWrapper.append(nav);
  block.append(navWrapper);
}
