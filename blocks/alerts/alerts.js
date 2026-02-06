import { isAuthorMode } from '../../scripts/utils/common-utils.js';
import { getPathDetails } from '../../scripts/utils/script-utils.js';
import { loadFragmentWithPickers } from '../../scripts/utils/alerts-utils.js';

export default async function decorate(block) {
  const pathDetails = getPathDetails();
  const langRegion = pathDetails?.langRegion || 'en';

  let alertsPath = `/${langRegion}/fragments/alerts`;

  if (isAuthorMode() && alertsPath.startsWith('/language-masters')) {
    alertsPath = `/${langRegion}/en/fragments/alerts`;
  }

  const pickers = [
    {
      name: 'alerts-published-time',
      selector: 'meta[name="published-time"]',
      attribute: 'content',
    },
  ];

  const fragment = await loadFragmentWithPickers(alertsPath, pickers);

  block.textContent = '';

  if (fragment && fragment.firstElementChild) {
    block.append(fragment.firstElementChild);
  }
}
