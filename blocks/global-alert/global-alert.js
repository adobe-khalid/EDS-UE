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

const STORAGE_KEY = 'dismissed_alerts';
const EXPIRE_DAYS = 30;
const ALERT_TYPES = ['global-alert-information', 'global-alert-alert'];

export function getDismissedAlertsData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return { alerts: {} };

  try {
    const data = JSON.parse(stored);
    const now = new Date().getTime();
    // Clean up expired alerts
    if (data && data.alerts) {
      Object.keys(data.alerts).forEach((key) => {
        const alert = data.alerts[key];
        if (!alert.dismissedAt
          || now > alert.dismissedAt + EXPIRE_DAYS * 24 * 60 * 60 * 1000) {
          delete data.alerts[key];
        }
      });
      return { alerts: data.alerts };
    }
    // Handle old format - reset to new structure
    return { alerts: {} };
  } catch (e) {
    localStorage.removeItem(STORAGE_KEY);
    return { alerts: {} };
  }
}

// Store dismissed alerts data structure
function storeDismissedAlertsData(alertsData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alertsData));
}

// Generate base hash ID from alert text only (for tracking dismissals)
function generateBaseAlertId(alertText) {
  return generateHashId(alertText);
}

// Generate current version hash (alert text + caption)
// Generate current version hash (alertType + alert text + caption + dismissible)
function generateCurrentVersionHash(combinedText = '') {
  return generateHashId(combinedText);
}

// Store dismissed alert with version tracking
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

// Check if current alert version was already dismissed
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

// Dismiss an alert (returns version info for debugging)
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

export default async function decorate(block) {
  const [alertText, alertCaption, dismissAlert] = block.children;
  const dismissibleAlert = promoteFirstChildIfExists(dismissAlert);
  const isDismissibleAlert = dismissibleAlert?.textContent === 'true';
  const alertType = ALERT_TYPES.find((type) => block.classList.contains(type));

  // Combine alertType and all text content from block children, separated by '|'
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

  // Check if this alert was previously dismissed before any DOM manipulation
  const dismissed = await isAlertDismissed(alertTextContent, combinedBlockText);
  if (!isAuthorEditMode() && dismissed) {
    block.innerHTML = '';
    block.style.display = 'none';
    if (!block.hasAttribute('aria-hidden')) {
      block.setAttribute('aria-hidden', 'true');
    }
    return;
  }

  // Only proceed with DOM creation if alert should be shown
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

  // testing requirement - set attribute 'data-testid' for elements
  attachTestIdToElements(block);

  // Add dismiss functionality if alert is dismissible
  if (isDismissibleAlert && alertTextContent) {
    const dismissButton = block.querySelector('.close-icon');
    if (dismissButton) {
      dismissButton.addEventListener('click', async () => {
        await dismissAlertOnClick(
          alertTextContent,
          combinedBlockText,
        );

        block.style.display = 'none';
        if (!block.hasAttribute('aria-hidden')) {
          block.setAttribute('aria-hidden', 'true');
        }
      });
    }
  }
}
