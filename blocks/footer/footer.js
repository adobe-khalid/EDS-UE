import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { isAuthorMode } from '../../scripts/utils/common-utils.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  let footerPath;
  if (footerMeta) {
    footerPath = new URL(footerMeta, window.location).pathname;
  } else {
    footerPath = isAuthorMode() ? '/content/khalid-EDS/footer' : '/footer';
  }
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  block.append(footer);
}
