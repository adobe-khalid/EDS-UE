/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-cycle */
import {
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlock,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  loadBlock,
  getMetadata,
  buildBlock,
  fetchPlaceholders,
} from './aem.js';
import { isAuthorMode } from './utils/common-utils.js';
import buildAutoBlocksLazy from './auto-block-lazy.js';
import decorateTabs from '../blocks/tabs/tabs-helper.js';

// -----------------------------
// Custom code start

export const ENVIRONMENT = {
  DEV: 'dev',
  PROD: 'prod',
  STAGE: 'stage',
  TEST: 'test',
  UAT: 'uat',
};

const CONTENT_ROOT_PATH = '/content/khalid-EDS';

export const isHomePage = String(getMetadata('template') || '') === 'homepage';

async function loadGlobalAlert() {
  const alertsExists = document.querySelector('.alerts.block');
  if (alertsExists) {
    return null;
  }

  const alertsBlock = buildBlock('alerts', '');

  const section = document.createElement('div');
  section.classList.add('section');
  section.append(alertsBlock);

  const header = document.querySelector('header');
  document.body.insertBefore(section, header);

  decorateBlock(alertsBlock);
  await loadBlock(alertsBlock);
  return alertsBlock;
}

/**
 * Helper function that check if It is EDS path.
 */
export function isEDSLink(linkURL) {
  return linkURL.includes(CONTENT_ROOT_PATH);
}

/**
 * Helper function that converts an AEM path into an EDS path.
 */
export function getEDSLink(aemPath) {
  if (!aemPath) {
    return '';
  }

  let aemRoot = CONTENT_ROOT_PATH;

  if (window.hlx && window.hlx.aemRoot) {
    aemRoot = window.hlx.aemRoot;
  }

  return aemPath.replace(aemRoot, '').replace('.html', '');
}
/**
 * Helper function that adapts the path to work on EDS and AEM rendering
 */
export function getLink(edsPath) {
  return window.hlx.aemRoot && !edsPath.startsWith(window.hlx.aemRoot) && edsPath.indexOf('.html') === -1
    ? `${window.hlx.aemRoot}${edsPath}.html`
    : edsPath;
}

/**
 * Process current pathname and return details for use in language switching
 * Considers pathnames like /en-au/page and /content/qcom/en-au/page.html
 * for both EDS and AEM
 */
export function getPathDetails() {
  const { pathname } = window.location;
  const extParts = pathname.split('.');
  const ext = extParts.length > 1 ? extParts[extParts.length - 1] : '';
  const isContentPath = pathname.startsWith('/content');
  const parts = pathname.split('/').filter(Boolean); // remove empty entries

  // Utility to safely extract language/region parts
  const safeLangGet = (index) => {
    const val = parts[index];
    return val ? val.split('.')[0].toLowerCase() : '';
  };

  let langRegion = 'en-au';

  if (window.hlx && window.hlx.isExternalSite === true) {
    // Handle third-party site with /lang/region
    // Use langregion from hlx if present and non-empty
    const hlxLangRegion = window.hlx.langregion?.toLowerCase();

    if (hlxLangRegion) {
      langRegion = hlxLangRegion;
    } else if (parts.length >= 2) {
      const ISO_2_LETTER = /^[a-z]{2}$/;
      const region = isContentPath ? safeLangGet(2) : safeLangGet(0);
      let language = isContentPath ? safeLangGet(3) : safeLangGet(1);

      // Normalize language if it contains underscore (e.g.: zh_CN -> zh)
      [language] = language.split('_');

      // Validate both language and region before assignment
      if (ISO_2_LETTER.test(language) && ISO_2_LETTER.test(region)) {
        langRegion = `${language}-${region}`;
      }
    }
  } else {
    // AEM/EDS paths
    langRegion = isContentPath ? safeLangGet(2) : safeLangGet(0);
  }

  // Split langRegion into lang and region
  const [lang, region] = langRegion.split('-');

  // substring before langRegion
  const prefix = pathname.substring(0, pathname.indexOf(`/${langRegion}`)) || '';
  const suffix = pathname.substring(pathname.indexOf(`/${langRegion}`) + langRegion.length + 1) || '';

  return {
    ext,
    prefix,
    suffix,
    langRegion,
    lang,
    region,
    isContentPath,
  };
}

/**
 * Returns fallback path details by normalizing region, language, and language-region values.
 * If the region is 'masters', it defaults to 'au'.
 * If the language is 'language', it defaults to 'en'.
 * If the language-region is 'language-masters', it defaults to 'en-au'.
 *
 * @returns {{ region: string, lang: string, langRegion: string }} The normalized path details.
 */
export function getFallbackPathDetails() {
  let { region, lang, langRegion } = getPathDetails();
  if (region === 'masters') region = 'au';
  if (lang === 'language') lang = 'en';
  if (langRegion === 'language-masters') langRegion = 'en-au';
  return { region, lang, langRegion };
}

function getLanguageCode(langRegion) {
  let langCode = langRegion || getPathDetails()?.langRegion || 'en-au';
  if (isAuthorMode() && langCode === 'language-masters') {
    langCode = 'en-au';
  }
  return langCode;
}

const languageMastersMarker = '/language-masters/en/';

export function convertToLangRegionLink(link) {
  if (!link) return '';

  const { langRegion } = getPathDetails();
  const { langRegion: fallbackLangRegion } = getFallbackPathDetails();
  const langRegionMarker = `/${fallbackLangRegion}/`;

  let url = isAuthorMode() ? link : getEDSLink(link);

  if (
    url?.startsWith('/')
    && url.includes(languageMastersMarker)
    && !languageMastersMarker.includes(langRegion)
  ) {
    url = url.replace(languageMastersMarker, langRegionMarker);
  }
  return url;
}

export async function fetchLanguagePlaceholders(langRegion) {
  const langCode = getLanguageCode(langRegion);
  try {
    // Try fetching placeholders with the specified language
    return await fetchPlaceholders(`${window.hlx.codeBasePath}/${langCode}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error fetching placeholders for lang: ${langCode}. Will try to get en placeholders`, error);
    // Retry without specifying a language (using the default language)
    try {
      return await fetchPlaceholders(`${window.hlx.codeBasePath}/en-au`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error fetching placeholders:', err);
    }
  }
  return {}; // default to empty object
}

/**
 * Builds and initializes blocks that should render before the body appears to avoid CLS
 *
 * @param {HTMLElement} main - The main content container element.
 */
async function buildPreHeaderBlocks(main) {
  await loadGlobalAlert(main);
}

// Custom code end
// ------------------------------

/**
 * Moves all the attributes from a given elmenet to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveAttributes(from, to, attributes) {
  if (!attributes) {
    // eslint-disable-next-line no-param-reassign
    attributes = [...from.attributes].map(({ nodeName }) => nodeName);
  }
  attributes.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      to?.setAttribute(attr, value);
      from.removeAttribute(attr);
    }
  });
}

/**
 * Move instrumentation attributes from a given element to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-')),
  );
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 */
function buildAutoBlocks(main) {
  try {
    decorateTabs(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    await buildPreHeaderBlocks(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds and initializes blocks that should render early
 * (immediately after the main content is loaded),
 * but are still part of the lazy-loading phase.
 *
 * @param {HTMLElement} main - The main content container element.
 */
async function buildEarlyBlocks() {
  // build early block like breadcrumbs
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  loadHeader(doc.querySelector('header'));
  const main = doc.querySelector('main');
  const { hash } = window.location;
  buildEarlyBlocks(main);
  await loadSections(main);
  await loadFooter(doc.querySelector('footer'));
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();
  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
  buildAutoBlocksLazy(main);
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed(document);
}

loadPage();
