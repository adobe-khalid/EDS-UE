import {
  promoteFirstChildIfExists,
  getTextContent,
  getHtmlContent,
} from '../../scripts/utils/dom.js';
import {
  attachTestId,
  generateHashId,
  isAuthorEditMode,
} from '../../scripts/utils/common-utils.js';
import { getPathDetails } from '../../scripts/utils/script-utils.js';

const STORAGE_KEY = 'dismissed_alerts';
const PUBLISHED_TIME_KEY = 'published-time';
const EXPIRE_DAYS = 30;
const ALERT_TYPES = ['global-alert-information', 'global-alert-alert'];

let publishedTimeChecked = false;

function getDismissedAlertsData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return { alerts: {}, [PUBLISHED_TIME_KEY]: null };

  try {
    const data = JSON.parse(stored);
    const now = new Date().getTime();
    if (data && data.alerts) {
      Object.keys(data.alerts).forEach((key) => {
        const alert = data.alerts[key];
        if (
          !alert.dismissedAt
          || now > alert.dismissedAt + EXPIRE_DAYS * 24 * 60 * 60 * 1000
        ) {
          delete data.alerts[key];
        }
      });
      return { alerts: data.alerts, [PUBLISHED_TIME_KEY]: data[PUBLISHED_TIME_KEY] };
    }
    return { alerts: {}, [PUBLISHED_TIME_KEY]: null };
  } catch (e) {
    localStorage.removeItem(STORAGE_KEY);
    return { alerts: {}, [PUBLISHED_TIME_KEY]: null };
  }
}

function storeDismissedAlertsData(alertsData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alertsData));
}

function generateBaseAlertId(alertText) {
  return generateHashId(alertText);
}

function generateCurrentVersionHash(combinedText = '') {
  return generateHashId(combinedText);
}

function storeDismissedAlert(alertText, combinedBlockText = '') {
  const alertsData = getDismissedAlertsData();
  return (async () => {
    const baseId = await generateBaseAlertId(alertText);
    const currentVersionHash = await generateCurrentVersionHash(combinedBlockText);
    alertsData.alerts[baseId] = {
      dismissedVersion: currentVersionHash,
      dismissedAt: new Date().getTime(),
    };
    storeDismissedAlertsData(alertsData);
  })();
}

function isAlertDismissed(alertText, combinedBlockText = '') {
  if (!alertText || alertText.trim() === '') {
    return false;
  }
  const alertsData = getDismissedAlertsData();
  return (async () => {
    const baseId = await generateBaseAlertId(alertText);
    const currentVersionHash = await generateCurrentVersionHash(combinedBlockText);
    const dismissedAlert = alertsData.alerts[baseId];
    if (!dismissedAlert) {
      return false;
    }
    const now = new Date().getTime();
    if (now > dismissedAlert.dismissedAt + EXPIRE_DAYS * 24 * 60 * 60 * 1000) {
      delete alertsData.alerts[baseId];
      storeDismissedAlertsData(alertsData);
      return false;
    }
    return dismissedAlert.dismissedVersion === currentVersionHash;
  })();
}

function dismissAlertOnClick(alertText, combinedBlockText = '') {
  return (async () => {
    const currentVersionHash = await generateCurrentVersionHash(combinedBlockText);
    await storeDismissedAlert(alertText, combinedBlockText);
    return {
      baseId: await generateBaseAlertId(alertText),
      versionHash: currentVersionHash,
    };
  })();
}

function attachTestIdToElements(block) {
  const elementsToAttach = [
    { selector: '.global-alert-information', elementName: 'type-information' },
    { selector: '.global-alert-alert', elementName: 'type-alert' },
    { selector: '.global-alert-text-content', elementName: 'text-content' },
    { selector: '.caption', elementName: 'caption' },
  ];

  elementsToAttach.forEach(({ selector, elementName }) => {
    attachTestId({ block, selector, elementName });
  });
}

function checkAndUpdatePublishedTime(fragmentPublishedTime) {
  if (publishedTimeChecked) return;
  publishedTimeChecked = true;
  let alertsData = getDismissedAlertsData();
  if (fragmentPublishedTime && alertsData[PUBLISHED_TIME_KEY] !== fragmentPublishedTime) {
    alertsData = { alerts: {}, [PUBLISHED_TIME_KEY]: fragmentPublishedTime };
    storeDismissedAlertsData(alertsData);
  }
}

async function fetchPublishedTime() {
  try {
    const pathDetails = getPathDetails();
    const langRegion = pathDetails?.langRegion || 'en';

    const data = await fetch(`/${langRegion}/global-alert-index.json`).then(
      (response) => {
        if (!response?.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      },
    );

    return data?.data?.[0]?.publishedTime ?? null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Error fetching global alert published time:', error);
    return null;
  }
}

export default async function decorate(block) {
  const fragmentPublishedTime = await fetchPublishedTime();
  checkAndUpdatePublishedTime(fragmentPublishedTime);

  const [alertText, alertCaption, dismissAlert] = block.children;
  const dismissibleAlert = promoteFirstChildIfExists(dismissAlert);
  const isDismissibleAlert = dismissibleAlert?.textContent === 'true';
  const alertType = ALERT_TYPES.find((type) => block.classList.contains(type));

  const combinedBlockText = [
    alertType,
    ...Array.from(block.children)
      .filter((child) => child && child.nodeType === Node.ELEMENT_NODE && child.textContent?.trim())
      .map((child) => child.textContent.trim()),
  ].join('|');

  const alertElement = alertText ? promoteFirstChildIfExists(alertText) : null;
  const alertTextContent = getTextContent(alertElement);
  const alertHtmlContent = getHtmlContent(alertElement);

  const captionElement = alertCaption.querySelector('p');
  if (captionElement) {
    captionElement.classList.add('caption');
  }

  const dismissed = await isAlertDismissed(alertTextContent, combinedBlockText);
  if (!isAuthorEditMode() && dismissed) {
    block.innerHTML = '';
    block.style.display = 'none';
    if (!block.hasAttribute('aria-hidden')) {
      block.setAttribute('aria-hidden', 'true');
    }
    return;
  }

  block.innerHTML = `
    <div class="global-alert-icon" role="status">
      <div class="global-alert-text-content">
        <div class="content">
          <div class="global-alert-content body-02">${alertHtmlContent}</div>
          ${captionElement ? captionElement.outerHTML : ''}
        </div>
        ${isDismissibleAlert ? '<button class="close-icon" aria-controls="main-menu" aria-label="Close Alert"><span class="mask-icon" aria-hidden="true"></span></button>' : ''}
      </div>
    </div>`;

  attachTestIdToElements(block);

  if (isDismissibleAlert && alertTextContent) {
    const dismissButton = block.querySelector('.close-icon');
    if (dismissButton) {
      dismissButton.addEventListener('click', async () => {
        const dismissInfo = await dismissAlertOnClick(
          alertTextContent,
          combinedBlockText,
        );
        // eslint-disable-next-line no-console
        console.log('Alert dismissed:', {
          baseId: dismissInfo.baseId,
          versionHash: dismissInfo.versionHash,
          combinedBlockText,
        });

        block.style.display = 'none';
        if (!block.hasAttribute('aria-hidden')) {
          block.setAttribute('aria-hidden', 'true');
        }

        document.dispatchEvent(new CustomEvent('alert-dismissed'));
      });
    }
  }
}
