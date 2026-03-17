/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroParser from './parsers/hero.js';
import heroBookingCtaParser from './parsers/hero-booking-cta.js';
import cardsDestinationsParser from './parsers/cards-destinations.js';
import cardsHighlightsParser from './parsers/cards-highlights.js';
import heroAppCtaParser from './parsers/hero-app-cta.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/singaporeair-cleanup.js';
import sectionsTransformer from './transformers/singaporeair-sections.js';

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'homepage',
  description: 'Singapore Airlines homepage with hero masthead, flight booking widget, trending destinations, highlights promotions, mobile app CTA, and comprehensive footer',
  urls: [
    'https://www.singaporeair.com/en_UK/sg/home'
  ],
  blocks: [
    {
      name: 'hero',
      instances: ['#masthead']
    },
    {
      name: 'hero-booking-cta',
      instances: ['#hwidget']
    },
    {
      name: 'cards-destinations',
      instances: ['.trending-destinations .destination-cards']
    },
    {
      name: 'cards-highlights',
      instances: ['.highlights .highlight-cards']
    },
    {
      name: 'hero-app-cta',
      instances: ['.seamless-travel']
    }
  ],
  sections: [
    {
      id: 'section-hero',
      name: 'Hero / Masthead',
      selector: '#masthead',
      style: 'dark',
      blocks: ['hero'],
      defaultContent: []
    },
    {
      id: 'section-login-prompt',
      name: 'KrisFlyer Login Prompt',
      selector: '#hlogin',
      style: 'navy',
      blocks: [],
      defaultContent: ['#hlogin p', '#hlogin a', '#hlogin button']
    },
    {
      id: 'section-booking',
      name: 'Booking Widget',
      selector: '#hwidget',
      style: null,
      blocks: ['hero-booking-cta'],
      defaultContent: []
    },
    {
      id: 'section-trending',
      name: 'Trending Destinations',
      selector: '.trending-destinations',
      style: 'light',
      blocks: ['cards-destinations'],
      defaultContent: ['.trending-destinations h3', '.trending-destinations .view-more']
    },
    {
      id: 'section-highlights',
      name: 'Highlights',
      selector: '.highlights',
      style: null,
      blocks: ['cards-highlights'],
      defaultContent: ['.highlights h3']
    },
    {
      id: 'section-app-cta',
      name: 'Mobile App CTA',
      selector: '.seamless-travel',
      style: 'dark',
      blocks: ['hero-app-cta'],
      defaultContent: []
    }
  ]
};

// PARSER REGISTRY
const parsers = {
  'hero': heroParser,
  'hero-booking-cta': heroBookingCtaParser,
  'cards-destinations': cardsDestinationsParser,
  'cards-highlights': cardsHighlightsParser,
  'hero-app-cta': heroAppCtaParser,
};

// TRANSFORMER REGISTRY
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE,
  };

  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];

  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
        });
      });
    });
  });

  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, html, params } = payload;
    const main = document.body;

    // 1. Execute beforeTransform transformers (initial cleanup)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page using embedded template
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block using registered parsers
    pageBlocks.forEach((block) => {
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. Execute afterTransform transformers (final cleanup + section breaks/metadata)
    executeTransformers('afterTransform', main, payload);

    // 5. Apply WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Generate sanitized path
    const path = WebImporter.FileUtils.sanitizePath(
      new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, '')
    );

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
