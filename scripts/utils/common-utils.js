/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-globals */
/**
 * @param {string} template - Placeholders in the format `{key}`.
 * @param {Object} values - A key-value pairs to replace in the template.
 * @returns {string} - The string with replaced by actual values.
 */
function stringFormat(template, values) {
  return template.replace(/\{(.*?)}/g, (_, key) => values[key] || '');
}

const sortObjectByAttr = (parentObj, attr, order = 'asc', sensitivity = 'base') => {
  // Validate that parentObj is a non-null object
  if (parentObj === null || typeof parentObj !== 'object') {
    // eslint-disable-next-line no-console
    console.error('Provided input is not a valid object.');
    return {};
  }

  // Normalise to only 'asc' or 'desc'
  order = order.toLowerCase() === 'desc' ? 'desc' : 'asc';

  return Object.fromEntries(
    Object.entries(parentObj).sort(([, a], [, b]) => {
      const aVal = a?.[attr] ?? '';
      const bVal = b?.[attr] ?? '';
      // Numbers Comparison
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      const bothAreNumbers = !isNaN(aNum) && !isNaN(bNum);
      if (bothAreNumbers) {
        return order === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // String Comparison
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { sensitivity });
      return order === 'asc' ? cmp : -cmp;
    }),
  );
};

const setTextContent = (element, ...vars) => {
  if (!element) return;

  const values = vars
    .map((v) => (typeof v !== 'undefined' ? v : ''))
    .join(' ')
    .trim();

  if (values) element.textContent = values;
};

const applyClassToDirectChildren = (parentContainer, styleClass = '') => {
  const directChildren = parentContainer?.children;
  if (directChildren) {
    Array.from(directChildren).forEach((childElement) => {
      childElement.classList.add(styleClass);
    });
  }
};

const isCurrentUrl = (url) => {
  const linkUrl = new URL(url.href, window.location.origin);
  const currentUrl = new URL(window.location.href);

  return linkUrl.pathname === currentUrl.pathname;
};

function isExternalLink(link) {
  const linkUrl = new URL(link, window.location.origin);
  return (
    linkUrl.hostname !== window.location.hostname && linkUrl.hostname !== 'www.qantas.com'
  );
}

const formatStringAsId = (input, replaceChar = '-') => {
  if (!input) return '';
  return input
    .replace(/[^a-zA-Z0-9]+/g, replaceChar) // Replace non-alphanumerics
    .replace(new RegExp(`^${replaceChar}+|${replaceChar}+$`, 'g'), '') // Trim edges
    .replace(new RegExp(`${replaceChar}{2,}`, 'g'), replaceChar) // Collapse repeats
    .toLowerCase();
};

const isAuthorMode = () => window.hlx?.runmode === 'author';

const isAuthorEditMode = () => isAuthorMode() && window.parent !== window;

const isAuthorPreviewMode = () => isAuthorMode() && window.parent === window;

const getContentService = () => (isAuthorMode() ? '' : '/content-services');

const addClassToSelectors = (container, selectors, className) => {
  const elements = selectors.flatMap((selector) => [
    ...container.querySelectorAll(selector),
  ]);

  elements.forEach((element) => {
    element.classList.add(className);
  });
};

/**
 * Gets the block type of a given HTML element.
 *
 * @param {HTMLElement} ele The element to evaluate.
 * @returns {string|null} One of:
 *   - 'title-block' for <h1>–<h6>
 *   - 'text-block' for <ul>, <ol>, or <p> without immediate <img> child
 *   - 'image-block' for <p> with immediate <img> child
 *   - null if none match
 */
function getDefaultBlockType(ele) {
  if (!(ele instanceof HTMLElement)) return null;
  const tag = ele.tagName;
  if (/^H[1-6]$/.test(tag)) {
    return 'title-block';
  }
  if (tag === 'UL' || tag === 'OL') {
    return 'text-block';
  }
  if (tag === 'P') {
    const hasImg = Array.from(ele.children).some((child) => child.tagName === 'IMG');
    return hasImg ? 'image-block' : 'text-block';
  }
  return null;
}

/**
 * @param {Object} params
 * @param {HTMLElement} [params.block] - Optional block element with `data-testid`.
 * @param {HTMLElement} params.parentEl - Element to assign test ID to (or search within).
 * @param {string} [params.selector] - Optional selector to find a nested target.
 * @param {string} [params.elementName] - Optional suffix for the test ID.
 */
function attachTestId({
  block, parentEl, selector, elementName,
}) {
  // Case 1: Assign based on block type (formerly attachBlockTestID)
  if (parentEl && !elementName) {
    const type = getDefaultBlockType(parentEl);
    if (type) {
      if (type === 'image-block') {
        const img = parentEl.querySelector(':scope > img');
        if (img) img.dataset.testid = type;
      } else {
        parentEl.dataset.testid = type;
      }
    }
    return;
  }

  // Case 2: Compose test ID using block’s data-testid and elementName (formerly attachTestId)
  if (block?.dataset?.testid && elementName) {
    const base = block.dataset.testid.split('-')[0];
    const fullTestId = `${base}-${elementName}`;
    let targets = [];
    // If a selector is provided, find elements within the parentEl or block
    // Otherwise, use parentEl directly
    if (selector) {
      targets = (parentEl || block)?.querySelectorAll(selector) || [];
    } else if (parentEl) {
      targets = [parentEl];
    }

    targets.forEach((el) => {
      if (el) el.dataset.testid = fullTestId;
    });
  }
}

/**
 * Extracts the file name (including extension) from a URL-ish string.
 *
 * @param {string} input - Absolute URL, relative path, or plain file name.
 * @returns {string} The file name, or an empty string if none is found.
 */
const getFilename = (input) => {
  const clean = input.split(/[?#]/)[0];
  try {
    const { pathname } = new URL(clean, 'http://dummy-base/');
    return pathname.replace(/\/$/, '').split('/').pop();
  } catch {
    return clean.split('/').pop();
  }
};

function getMainContentId() {
  const MAIN_CONTENT_ID = 'main-content';
  const FALLBACK_ID = 'main';

  if (document.getElementById(MAIN_CONTENT_ID)) {
    return MAIN_CONTENT_ID;
  }
  if (document.getElementById(FALLBACK_ID)) {
    return FALLBACK_ID;
  }

  return MAIN_CONTENT_ID;
}

/**
 * Checks if a paragraph element contains only a single anchor link
 * @param {Element} element - The element to check
 * @returns {boolean} - True if element is a paragraph with only an anchor link
 */
const isStandaloneLink = (element) => element?.tagName === 'P'
  && element.children.length === 1
  && element.firstElementChild.tagName === 'A'
  && Array.from(element.childNodes).every((node) => node === element.firstElementChild
      || (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()));

/**
 * Returns the appropriate title style class based on block layout, heading tag, and parent offset.
 * @param {HTMLElement} block - The block element to check for layout classes and offset parent.
 * @param {string} headingTag - The heading tag (e.g., 'h2', 'h3').
 * @param {Object} classes - Mapping of columns to title classes.
 * @returns {string} - The class name to apply, or empty string if none found.
 */
function getTitleStyleClass(block, headingTag, classes) {
  if (!headingTag) return '';

  const sectionType = block.closest('.offset-section') ? 'offset' : 'default';
  const matchedLayout = Object.keys(classes).find((layout) => block.classList.contains(layout));
  if (!matchedLayout) return '';

  return classes[matchedLayout]?.[sectionType]?.[headingTag.toLowerCase()] || '';
}

/**
 * Generates a short, deterministic ID for an alert based on its content.
 * - Uses SHA-1 hashing via the Web Crypto API
 * - Ensures alerts with the same content always get the same ID
 * - A content change produces a new ID, so dismissed alerts can be re-shown
 *
 * @param {string} text   The alert content to hash
 * @param {number} length Number of characters to keep from the hash (default: 12)
 * @returns {Promise<string>} A short, unique, and deterministic alert ID
 */
async function generateHashId(text, length = 12) {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const fullHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return fullHash.slice(0, length);
}

/**
 * Capitalizes the first letter of a string and makes the rest lowercase.
 * @param {string} str - The string to capitalize
 * @returns {string} - The capitalized string, or empty string if input is falsy
 */
function capitalizeFirst(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
}

function formatUriName(text) {
  if (!text) return '';

  // Remove parentheses and commas, replace spaces with hyphens
  let formatted = text
    .replace(/[(),]/g, '') // Remove parentheses and commas
    .replace(/\s+/g, '-'); // Replace spaces with hyphens

  // Remove accents/diacritics
  formatted = formatted.normalize('NFKD').replace(/[\u0300-\u036f]/g, ''); // Remove combining diacritical marks

  return formatted.toLowerCase();
}

/**
 * Map a language–region code to its CFM folder.
 * Uses folderMapping from window.eds_config.
 * Returns mapped value, or the full langRegion if configured that way.
 */
function resolveCfmFolder(langRegion) {
  const folderMapping = window.eds_config?.cfm?.folderMapping || {};

  // Default to 'en' if no match
  let result = 'en';

  Object.entries(folderMapping).some(([pattern, mappedValue]) => {
    const prefix = pattern.replace(/\*/g, '');
    if (langRegion.startsWith(prefix)) {
      result = mappedValue === pattern ? langRegion : mappedValue;
      return true;
    }
    return false;
  });

  return result;
}

// Utility to detect touch devices (mobile/tablet)
function isTouchDevice() {
  return ('ontouchstart' in window
    || (window.DocumentTouch && document instanceof window.DocumentTouch)
    || navigator.maxTouchPoints > 0
    || navigator.msMaxTouchPoints > 0);
}

export {
  isCurrentUrl,
  isExternalLink,
  formatStringAsId,
  stringFormat,
  sortObjectByAttr,
  setTextContent,
  applyClassToDirectChildren,
  isAuthorMode,
  isAuthorEditMode,
  isAuthorPreviewMode,
  getContentService,
  addClassToSelectors,
  attachTestId,
  getFilename,
  getMainContentId,
  isStandaloneLink,
  getTitleStyleClass,
  generateHashId,
  capitalizeFirst,
  formatUriName,
  resolveCfmFolder,
  isTouchDevice,
};
