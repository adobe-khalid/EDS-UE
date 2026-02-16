/* eslint-disable indent */
import {
  isAuthorEditMode,
  attachTestId,
} from '../../scripts/utils/common-utils.js';
import subscribeToResizeListener from '../../scripts/utils/resize-listener.js';
import { fetchLanguagePlaceholders, moveInstrumentation } from '../../scripts/scripts.js';
import { isMobileScreen } from '../../scripts/utils/dom.js';
import { loadFragment } from '../fragment/fragment.js';

// Configuration and constants
const SELECTORS = {
  tabsList: '.tabs-fragment-list',
  tabButton: 'button[role="tab"]',
  accordionHeader: '.tabs-fragment-acc-header',
  tabContent: '.tabs-fragment-content',
};

const CLASSES = {
  active: 'active',
  hidden: 'hidden',
  tabsMode: 'tabs-mode',
  accordionMode: 'tabs-acc-mode',
  tabButton: 'tabs-fragment-button',
  tabButtonFirst: 'tabs-fragment-button-first',
  tabButtonLast: 'tabs-fragment-button-last',
  tabContent: 'tabs-fragment-content',
  tabContentFirst: 'tabs-fragment-content-first',
  tabContentLast: 'tabs-fragment-content-last',
  tabsMeasureClone: 'tabs-fragment-measure-clone',
  tabsAccHeaderWrapper: 'tabs-fragment-acc-header-wrapper',
  tabsAccHeader: 'tabs-fragment-acc-header',
  authorEdit: 'author-edit',
  tabsDivider: 'tabs-fragment-divider',
};

/**
 * Adds a visually hidden live region for announcing accordion state changes to screen readers.
 */
let tabsLiveRegion = document.getElementById('tabs-fragment-aria-live');
if (!tabsLiveRegion) {
  tabsLiveRegion = document.createElement('div');
  tabsLiveRegion.id = 'tabs-fragment-aria-live';
  tabsLiveRegion.setAttribute('aria-live', 'polite');
  tabsLiveRegion.setAttribute('role', 'status');
  tabsLiveRegion.classList.add('visually-hidden');
  document.body.appendChild(tabsLiveRegion);
}

/**
 * Announces accordion state changes for accessibility.
 */
function announceAccordionStateChange(headerEl, liveRegionEl, tab, state, placeholder) {
  if (!headerEl || !liveRegionEl) return;

  const tag = headerEl.parentElement?.tagName?.toLowerCase() || '';
  const headingLevel = /^h[1-6]$/.test(tag) ? `heading level ${tag[1]}` : '';
  const role = headerEl.getAttribute('role') || 'button';
  const customLabel = headerEl.getAttribute('data-aria-live-label');
  let instruction = '';
  if (state === 'collapsed') {
    instruction = placeholder?.voDoubleTapToExpand || 'Double tap to expand.';
  } else if (state === 'expanded') {
    instruction = placeholder?.voDoubleTapToCollapse || 'Double tap to collapse.';
  }

  let message = customLabel
    || `${tab.name} ${headingLevel} ${role}. ${state}. ${instruction}`;

  if (tab.index !== undefined) {
    message = `${tab.index + 1} of ${tab.total}. ${message}`;
  }

  // Clear and update live region
  liveRegionEl.textContent = '';
  setTimeout(() => {
    liveRegionEl.textContent = message;
  }, 100);
}

/**
 * Creates tab data structure from block content
 */
function createTabsData(block) {
  const tabs = [];
  const items = [...block.children];

  items.forEach((item, index) => {
    // Each item has divs containing: tab-name, tab-id, fragment, back-to-tab
    const fields = [...item.children];

    if (fields.length >= 3) {
      const tabName = fields[0]?.textContent.trim() || '';
      const tabId = fields[1]?.textContent.trim() || '';
      const fragmentPath = fields[2]?.textContent.trim() || '';
      const backToTab = fields.length >= 4 ? fields[3]?.textContent.trim() : '';

      // Generate ID from tab-id or fall back to tab name
      const generatedId = tabId || tabName.toLowerCase().replace(/\s+/g, '-');

      tabs.push({
        index,
        name: tabName,
        tabId,
        fragmentPath,
        backToTab,
        id: generatedId,
        element: null,
        contentElement: null,
        originalItem: item,
      });
    }
  });

  return tabs;
}

/**
 * Builds the tab navigation
 */
function buildTabsList(tabs) {
  const tabsList = document.createElement('div');
  tabsList.classList.add('tabs-fragment-list');
  tabsList.setAttribute('role', 'tablist');

  tabs.forEach((tab, index) => {
    const button = document.createElement('button');
    button.classList.add(CLASSES.tabButton, 'body-01');
    button.setAttribute('role', 'tab');
    button.setAttribute('id', tab.id);
    button.setAttribute('data-tab-index', index);
    button.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
    button.setAttribute('aria-controls', `${tab.id}-panel`);
    button.setAttribute('tabindex', index === 0 ? '0' : '-1');
    button.textContent = tab.name;

    if (index === 0) {
      button.classList.add(CLASSES.tabButtonFirst);
    }
    if (index === tabs.length - 1) {
      button.classList.add(CLASSES.tabButtonLast);
    }

    tab.element = button;
    tabsList.appendChild(button);
  });

  // Add divider for styling (similar to tabs block)
  const divider = document.createElement('div');
  divider.className = CLASSES.tabsDivider;
  tabsList.appendChild(divider);

  return tabsList;
}

/**
 * Builds tab content containers
 */
async function buildTabsContent(tabs, placeholder) {
  const contentContainer = document.createElement('div');
  contentContainer.classList.add('tabs-fragment-content-container');

  // Load all fragments in parallel
  const fragmentPromises = tabs.map((tab) => (
    tab.fragmentPath ? loadFragment(tab.fragmentPath) : Promise.resolve(null)
  ));
  const fragments = await Promise.all(fragmentPromises);

  const isAuthorMode = isAuthorEditMode();

  tabs.forEach((tab, index) => {
    // Create accordion header for mobile
    const accordionHeader = document.createElement('button');
    accordionHeader.classList.add(CLASSES.tabsAccHeader);
    accordionHeader.setAttribute('role', 'button');
    accordionHeader.setAttribute('aria-expanded', index === 0 ? 'true' : 'false');
    accordionHeader.setAttribute('aria-controls', `${tab.id}-panel`);
    accordionHeader.textContent = tab.name;

    const accordionWrapper = document.createElement('div');
    accordionWrapper.classList.add(CLASSES.tabsAccHeaderWrapper);
    if (index === 0) {
      accordionWrapper.classList.add(CLASSES.active);
    }
    accordionWrapper.appendChild(accordionHeader);

    // Create content panel
    const contentPanel = document.createElement('div');
    contentPanel.classList.add(CLASSES.tabContent);
    contentPanel.setAttribute('id', `${tab.id}-panel`);
    contentPanel.setAttribute('role', 'tabpanel');
    contentPanel.setAttribute('aria-labelledby', tab.id);
    contentPanel.setAttribute('tabindex', '0');

    // Move instrumentation from original item to content panel
    if (tab.originalItem) {
      moveInstrumentation(tab.originalItem, contentPanel);
    }

    // Add author edit class if in author mode
    if (isAuthorMode) {
      contentPanel.classList.add(CLASSES.authorEdit);
    }

    if (index === 0) {
      contentPanel.classList.add(CLASSES.active);
    } else if (!isAuthorMode) {
      // Only hide non-active tabs if not in author mode
      contentPanel.classList.add(CLASSES.hidden);
    }

    if (index === 0) {
      contentPanel.classList.add(CLASSES.tabContentFirst);
    }
    if (index === tabs.length - 1) {
      contentPanel.classList.add(CLASSES.tabContentLast);
    }

    // Add loaded fragment content
    const fragment = fragments[index];
    if (fragment) {
      contentPanel.appendChild(fragment);
    } else if (tab.fragmentPath) {
      contentPanel.innerHTML = '<p>Fragment not found</p>';
    }

    // Add back-to-tabs link if enabled
    if (tab.backToTab && tab.backToTab.includes('show-back-to-tabs')) {
      const linkWrapper = document.createElement('div');
      linkWrapper.classList.add('tabs-fragment-back-to-tabs-wrapper');

      const link = document.createElement('a');
      link.href = `#${tab.id}`;
      link.classList.add('tabs-fragment-back-to-tabs', 'body-02');
      link.textContent = placeholder?.backToTabs || 'Back to tabs';

      linkWrapper.appendChild(link);
      contentPanel.appendChild(linkWrapper);
    }

    tab.contentElement = contentPanel;
    tab.accordionElement = accordionHeader;

    contentContainer.appendChild(accordionWrapper);
    contentContainer.appendChild(contentPanel);
  });

  return contentContainer;
}

/**
 * Updates the active tab state
 */
function updateTabState(tabs, block, activeIndex) {
  tabs.forEach((tab, index) => {
    const isActive = index === activeIndex;

    // Update tab buttons
    if (tab.element) {
      tab.element.setAttribute('aria-selected', isActive ? 'true' : 'false');
      tab.element.setAttribute('tabindex', isActive ? '0' : '-1');
      if (isActive) {
        tab.element.classList.add(CLASSES.active);
      } else {
        tab.element.classList.remove(CLASSES.active);
      }
    }

    // Update content panels
    if (tab.contentElement) {
      if (isActive) {
        tab.contentElement.classList.add(CLASSES.active);
        tab.contentElement.classList.remove(CLASSES.hidden);
      } else {
        tab.contentElement.classList.remove(CLASSES.active);
        tab.contentElement.classList.add(CLASSES.hidden);
      }
    }

    // Update accordion headers
    if (tab.accordionElement) {
      const wrapper = tab.accordionElement.parentElement;
      if (isActive) {
        tab.accordionElement.setAttribute('aria-expanded', 'true');
        wrapper?.classList.add(CLASSES.active);
      } else {
        tab.accordionElement.setAttribute('aria-expanded', 'false');
        wrapper?.classList.remove(CLASSES.active);
      }
    }
  });
}

/**
 * Handle hash navigation (URL hash changes)
 */
function handleHashNavigation(tabs, block) {
  const hash = window.location.hash.slice(1);
  if (!hash) return false;

  const targetIndex = tabs.findIndex((tab) => tab.id === hash);
  if (targetIndex !== -1) {
    updateTabState(tabs, block, targetIndex);
    return true;
  }
  return false;
}

/**
 * Setup back-to-tabs link handlers
 */
function setupBackToTabsLinks(tabs, block) {
  const backToTabsLinks = block.querySelectorAll('.tabs-fragment-back-to-tabs');
  backToTabsLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').slice(1);
      const targetIndex = tabs.findIndex((tab) => tab.id === targetId);

      if (targetIndex !== -1) {
        updateTabState(tabs, block, targetIndex);
        window.history.pushState(null, '', `#${targetId}`);

        // Scroll to tab button
        const targetButton = tabs[targetIndex].element;
        if (targetButton) {
          targetButton.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setTimeout(() => {
            targetButton.focus();
          }, 100);
        }
      }
    });
  });

  // Listen for hash changes
  window.addEventListener('hashchange', () => {
    handleHashNavigation(tabs, block);
  });
}

/**
 * Checks if tabs overflow and switches to accordion mode
 */
function checkTabsOverflow(block) {
  const tabsList = block.querySelector(SELECTORS.tabsList);
  if (!tabsList) return;

  const isMobile = isMobileScreen();

  if (isMobile) {
    block.classList.add(CLASSES.accordionMode);
    block.classList.remove(CLASSES.tabsMode);
  } else {
    block.classList.remove(CLASSES.accordionMode);
    block.classList.add(CLASSES.tabsMode);
  }
}

/**
 * Setup tab events
 */
function setupTabEvents(tabs, block, placeholder) {
  // Tab button clicks
  tabs.forEach((tab, index) => {
    if (tab.element) {
      tab.element.addEventListener('click', () => {
        updateTabState(tabs, block, index);
      });

      // Keyboard navigation
      tab.element.addEventListener('keydown', (e) => {
        let newIndex = index;

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          newIndex = (index + 1) % tabs.length;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          newIndex = (index - 1 + tabs.length) % tabs.length;
        } else if (e.key === 'Home') {
          e.preventDefault();
          newIndex = 0;
        } else if (e.key === 'End') {
          e.preventDefault();
          newIndex = tabs.length - 1;
        } else {
          return;
        }

        updateTabState(tabs, block, newIndex);
        tabs[newIndex].element?.focus();
      });
    }

    // Accordion header clicks
    if (tab.accordionElement) {
      tab.accordionElement.addEventListener('click', () => {
        const isExpanded = tab.accordionElement.getAttribute('aria-expanded') === 'true';
        updateTabState(tabs, block, index);

        // Announce state change for accessibility
        if (!isExpanded) {
          announceAccordionStateChange(
            tab.accordionElement,
            tabsLiveRegion,
            { ...tab, total: tabs.length },
            'expanded',
            placeholder,
          );
        } else {
          announceAccordionStateChange(
            tab.accordionElement,
            tabsLiveRegion,
            { ...tab, total: tabs.length },
            'collapsed',
            placeholder,
          );
        }
      });
    }
  });
}

/**
 * Main decorate function
 */
export default async function decorate(block) {
  const placeholder = await fetchLanguagePlaceholders();

  // Create tabs data from block content
  const tabs = createTabsData(block);

  if (!tabs.length) {
    block.innerHTML = '<p>No tabs found</p>';
    return;
  }

  // Clear block
  block.innerHTML = '';

  // Add author edit class if in author mode
  if (isAuthorEditMode()) {
    block.classList.add(CLASSES.authorEdit);
  }

  // Build tabs list
  const tabsList = buildTabsList(tabs);
  block.appendChild(tabsList);

  // Build tabs content
  const contentContainer = await buildTabsContent(tabs, placeholder);
  block.appendChild(contentContainer);

  // Setup event handling
  setupTabEvents(tabs, block, placeholder);

  // Setup back-to-tabs links and hash navigation
  setupBackToTabsLinks(tabs, block);

  // Check for initial hash navigation, otherwise set initial state
  if (!handleHashNavigation(tabs, block)) {
    updateTabState(tabs, block, 0);
  }

  // Setup responsive behavior
  setTimeout(() => {
    checkTabsOverflow(block);
  }, 100);

  // Add resize listener
  subscribeToResizeListener(() => {
    checkTabsOverflow(block);
  });

  // Re-check when fonts are loaded
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      checkTabsOverflow(block);
    });
  }

  // Testing requirement - set attribute 'data-testid' for elements
  if (!isAuthorEditMode()) {
    attachTestId({
      block,
      selector: SELECTORS.tabButton,
      elementName: 'tab-button',
    });
    attachTestId({
      block,
      selector: SELECTORS.accordionHeader,
      elementName: 'accordion-button',
    });
  }
}
