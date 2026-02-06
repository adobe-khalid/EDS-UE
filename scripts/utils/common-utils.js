/**
 * Checks if the site is in author mode
 * @returns {boolean}
 */
export const isAuthorMode = () => window.hlx?.runmode === 'author';

/**
 * Checks if the site is in author edit mode
 * @returns {boolean}
 */
export const isAuthorEditMode = () => isAuthorMode() && window.parent !== window;

/**
 * Utility to detect touch devices (mobile/tablet)
 * @returns {boolean}
 */
export function isTouchDevice() {
  return (
    'ontouchstart' in window
    || (window.DocumentTouch && document instanceof window.DocumentTouch)
    || navigator.maxTouchPoints > 0
    || navigator.msMaxTouchPoints > 0
  );
}

/**
 * Gets the block type of a given HTML element.
 * @param {HTMLElement} ele The element to evaluate.
 * @returns {string|null} One of: 'title-block', 'text-block', 'image-block', or null
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
export function attachTestId({
  block, parentEl, selector, elementName,
}) {
  // Case 1: Assign based on block type
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

  // Case 2: Compose test ID using block's data-testid and elementName
  if (block?.dataset?.testid && elementName) {
    const base = block.dataset.testid.split('-')[0];
    const fullTestId = `${base}-${elementName}`;
    let targets = [];

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
 * Generates a short, deterministic ID for an alert based on its content.
 * @param {string} text The alert content to hash
 * @param {number} length Number of characters to keep from the hash (default: 12)
 * @returns {Promise<string>} A short, unique, and deterministic alert ID
 */
export async function generateHashId(text, length = 12) {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const fullHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return fullHash.slice(0, length);
}
