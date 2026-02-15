import { isAuthorMode } from '../../scripts/utils/common-utils.js';
import { loadFragment } from '../fragment/fragment.js';

export default async function decorate(block) {
  let globalAlertPath = '/fragments/global-alert';

  if (isAuthorMode()) {
    globalAlertPath = `/content/khalid-EDS${globalAlertPath}`;
  }
  const fragment = await loadFragment(globalAlertPath);

  block.textContent = '';
  block.append(fragment.firstElementChild);
}
