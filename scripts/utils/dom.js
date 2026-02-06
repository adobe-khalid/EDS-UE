/**
 * Promotes the first child of a given DOM node if it exists.
 * Replaces the node with its firstElementChild in the DOM tree.
 * Returns the promoted element, original node, or null.
 */
export const promoteFirstChildIfExists = (element) => {
  if (!(element?.parentNode && element.firstElementChild)) return element ?? null;

  const { parentNode, firstElementChild } = element;
  parentNode.replaceChild(firstElementChild, element);
  return firstElementChild;
};

/**
 * Creates a DOM element with the specified tag and CSS classes.
 * @param {string} tag - The HTML tag to create.
 * @param  {...string} classNames - List of class names to apply.
 * @returns {HTMLElement}
 */
export const createElementWithClasses = (tag, ...classNames) => {
  const element = document.createElement(tag);
  if (classNames.length) {
    element.classList.add(...classNames);
  }
  return element;
};

/**
 * Checks if an element has renderable content
 * @param {HTMLElement} element
 * @returns {boolean}
 */
export const isRenderableElement = (element) => {
  if (!element) return false;

  const hasText = element.textContent?.trim().length > 0;
  const hasImageWithSrc = element.querySelector?.('img')?.getAttribute('src');

  return hasText || !!hasImageWithSrc;
};

export const getTextContent = (node) => node?.textContent?.trim?.() || '';

export const isFieldTrue = (node) => node?.textContent?.trim?.() === 'true';

/**
 * Get HTML content from DOM element (preserves rich text formatting)
 * @param {Element|null} element - The DOM element to extract HTML from
 * @returns {string} - The innerHTML content or empty string if element is null/undefined
 */
export const getHtmlContent = (element) => {
  if (!element) return '';
  return element.innerHTML || '';
};
