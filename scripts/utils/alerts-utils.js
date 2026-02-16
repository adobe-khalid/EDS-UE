import { decorateMain } from '../scripts.js';
import { loadSections } from '../aem.js';

/**
 * Loads a fragment and returns its main element
 * @param {string} path The path to the fragment
 * @returns {Promise<HTMLElement>} The main element of the fragment
 */
export async function loadFragment(path) {
  if (path && path.startsWith('/')) {
    const resp = await fetch(`${path}.plain.html`);
    if (resp.ok) {
      const main = document.createElement('main');
      main.innerHTML = await resp.text();

      const resetAttributeBase = (tag, attr) => {
        main.querySelectorAll(`${tag}[${attr}^="./media_"]`).forEach((elem) => {
          // eslint-disable-next-line no-param-reassign
          elem[attr] = new URL(elem.getAttribute(attr), new URL(path, window.location)).href;
        });
      };
      resetAttributeBase('img', 'src');
      resetAttributeBase('source', 'srcset');

      decorateMain(main);
      await loadSections(main);
      return main;
    }
  }
  return null;
}

/**
 * Loads a fragment with picker metadata
 * @param {string} path The path to the fragment
 * @param {Array} pickers Array of picker objects with name, selector, and attribute
 * @returns {Promise<HTMLElement>} The fragment element
 */
export async function loadFragmentWithPickers(path, pickers = []) {
  const fragment = await loadFragment(path);

  if (fragment && pickers.length > 0) {
    pickers.forEach((picker) => {
      const element = fragment.querySelector(picker.selector);
      if (element) {
        const value = element.getAttribute(picker.attribute);
        if (value) {
          fragment.dataset[picker.name] = value;
        }
      }
    });
  }

  return fragment;
}
