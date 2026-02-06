/* eslint-disable indent */
import {
  isAuthorEditMode,
  attachTestId,
  isTouchDevice,
} from '../../scripts/utils/common-utils.js';
import subscribeToResizeListener from '../../scripts/utils/resize-listener.js';
import { fetchLanguagePlaceholders } from '../../scripts/utils/script-utils.js';
import { createElementWithClasses } from '../../scripts/utils/dom.js';

// Configuration and constants
const CLASSES = {
  active: 'active',
  hidden: 'hidden',
  tabsMode: 'tabs-mode',
  accordionMode: 'tabs-acc-mode',
  tabButton: 'tabs-button',
  tabButtonFirst: 'tabs-button-first',
  tabButtonLast: 'tabs-button-last',
  tabItem: 'tabs-item',
  tabItemFirst: 'tabs-item-first',
  tabItemLast: 'tabs-item-last',
  tabsMeasureClone: 'tabs-measure-clone',
  tabsAccHeaderWrapper: 'tabs-acc-header-wrapper',
  tabsAccHeader: 'tabs-acc-header',
  tabsItemAnchorWrapper: 'tabs-item-anchor-wrapper',
  tabsItemBacktotabs: 'back-to-top-link',
  authorEdit: 'author-edit',
};

const SELECTORS = {
  tabsList: '.tabs-list',
  tabButton: 'button[role="tab"]',
  accordionHeader: `.${CLASSES.tabsAccHeader}`,
  tabContent: '.tabs-section',
  backToTabLink: `.${CLASSES.tabsItemBacktotabs}`,
  tabGroup: 'data-tab-group',
  tabContainer: '.tabs-container',
};

function attachTestIdToElements(block, tabGroupName) {
  const mainEle = document.querySelector('main');
  const tabGroupEle = `[data-tab-group="${tabGroupName}"]`;
  const elementsToAttach = [
    { selector: `${SELECTORS.tabButton}`, elementName: 'tab-button' },
    {
      parentEl: mainEle,
      selector: `${tabGroupEle} ${SELECTORS.accordionHeader}`,
      elementName: 'accordion-button',
    },
    {
      parentEl: mainEle,
      selector: `${tabGroupEle} ${SELECTORS.backToTabLink}`,
      elementName: 'link-back-to-tabs',
    },
  ];

  elementsToAttach.forEach(({ parentEl, selector, elementName }) => {
    attachTestId({
      block, parentEl, selector, elementName,
    });
  });
}

/**
 * Announces accordion state changes for accessibility.
 * @param {HTMLElement} headerEl - The accordion header element.
 * @param {HTMLElement} liveRegionEl - The live region element.
 * @param {Object} tab - The tab data object.
 * @param {string} state - The new state ('expanded' or 'collapsed').
 */
function announceAccordionStateChange(headerEl, tab, state, placeholder) {
  if (!headerEl) return;

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

  const announcement = customLabel
    ? customLabel.replace('{state}', state)
    : [tab.name, role, headingLevel, state, instruction].filter(Boolean).join(', ');
  const liveRegionEl = document.createElement('div');
  liveRegionEl.setAttribute('aria-live', 'polite');
  liveRegionEl.setAttribute('aria-atomic', 'true');
  liveRegionEl.classList.add('visually-hidden');

  document.body.appendChild(liveRegionEl);
  liveRegionEl.textContent = announcement;

  setTimeout(() => {
    liveRegionEl.remove();
  }, 1000);
}

// Utility functions
const generateId = (name, tabId) => tabId || name.toLowerCase().replace(/\s+/g, '-');

const setAttributes = (element, attributes) => {
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
};

const setScrollAndFocus = (element, setScroll, setFocus) => {
  if (setScroll && typeof element.scrollIntoView === 'function') {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (setFocus && typeof element.focus === 'function') {
    element.focus({ preventScroll: true });
  }
};

// Mode detection utilities
const isAccordionMode = ($block) => $block?.classList.contains(CLASSES.accordionMode);
const isTabsMode = ($block) => $block?.classList.contains(CLASSES.tabsMode);

// Smart scrolling utility - handles accordion vs tabs mode intelligently
const scrollToTarget = (tabs, $block, targetTabIndex, delay = 100) => {
  setTimeout(() => {
    const accordionMode = isAccordionMode($block);
    const activeTab = tabs[targetTabIndex];
    const accordionButton = document.getElementById(`${activeTab?.id}-accordion`);
    const tabButton = activeTab.element;
    const tabContent = activeTab?.content || document.getElementById(`${activeTab?.id}-tabpanel`);

    if (accordionMode) {
      setScrollAndFocus(accordionButton || tabContent || $block, true, true);
    } else {
      setScrollAndFocus(tabButton || tabContent || $block, true, true);
    }
  }, delay);
};

// Get all accordion headers for a tabs instance
const getAccordionHeaders = (tabs) => tabs.map((t) => document.getElementById(`${t.id}-accordion`)).filter(Boolean);

// Safely get tab content element
const getTabContent = (tab) => tab.content || document.getElementById(`${tab.id}-tabpanel`);

// Apply mode classes consistently across block and sections
const applyModeClasses = ($block, tabSections, useAccordionMode) => {
  const modeClassToAdd = useAccordionMode ? CLASSES.accordionMode : CLASSES.tabsMode;
  const modeClassToRemove = useAccordionMode ? CLASSES.tabsMode : CLASSES.accordionMode;

  $block.classList.remove(modeClassToRemove);
  $block.classList.add(modeClassToAdd);

  tabSections.forEach((section) => {
    section.classList.remove(modeClassToRemove);
    section.classList.add(modeClassToAdd);

    // Update accordion header aria-hidden based on mode
    const accordionHeader = section.querySelector(`.${CLASSES.tabsAccHeader}`);
    if (accordionHeader) {
      accordionHeader.setAttribute('aria-hidden', useAccordionMode ? 'false' : 'true');
    }

    // Update role and tabindex based on mode
    if (useAccordionMode) {
      section.removeAttribute('role');
      section.removeAttribute('tabindex');
      // Remove aria-hidden on touch devices in accordion mode
      if (isTouchDevice()) {
        section.removeAttribute('aria-hidden');
      }
    } else {
      section.setAttribute('role', 'tabpanel');
      // Set aria-hidden true/false based on hidden class
      if (section.classList.contains(CLASSES.hidden)) {
        section.setAttribute('aria-hidden', 'true');
      } else {
        section.setAttribute('aria-hidden', 'false');
      }
    }
  });
};

// Navigate to accordion header by index with focus and scroll
const navigateToAccordionHeader = (accordionHeaders, targetIndex) => {
  if (targetIndex >= 0 && targetIndex < accordionHeaders.length) {
    const targetHeader = accordionHeaders[targetIndex];
    setScrollAndFocus(targetHeader, true, true);
  }
};

// Update role attributes for all tab content based on current mode
const updateTabContentRoles = ($block, tabSections) => {
  const accordionMode = isAccordionMode($block);
  tabSections.forEach((section) => {
    if (accordionMode) {
      section.removeAttribute('role');
    } else {
      section.setAttribute('role', 'tabpanel');
    }
  });
};

// Accessibility and state management
function updateTabState(tabs, $block, activeIndex) {
  // Store the last active tab
  $block.dataset.lastActiveTab = activeIndex;

  // Update tab buttons
  const tabButtons = $block.querySelectorAll(`${SELECTORS.tabsList} button`);
  tabButtons.forEach((btn, idx) => {
    const isActive = idx === activeIndex;
    btn.classList.toggle(CLASSES.active, isActive);
    if (isActive) {
      btn.removeAttribute('tabindex');
      btn.setAttribute('aria-selected', 'true');
    } else {
      btn.setAttribute('tabindex', '-1');
      btn.setAttribute('aria-selected', 'false');
    }
  });

  // Update accordion headers for this specific tabs block
  tabs.forEach((tab, idx) => {
    const accordionHeader = document.getElementById(`${tab.id}-accordion`);
    if (accordionHeader && accordionHeader.classList.contains(CLASSES.tabsAccHeader)) {
      setAttributes(accordionHeader, {
        'aria-expanded': idx === activeIndex ? 'true' : 'false',
      });
    }
  });

  // Update tab content
  tabs.forEach((tab, idx) => {
    const tabContent = getTabContent(tab);
    if (!tabContent) return;

    const isActive = idx === activeIndex;
    const accordionMode = isAccordionMode($block);

    tabContent.classList.toggle(CLASSES.hidden, !isActive);

    // On touch devices in accordion mode, remove aria-hidden for all tabpanels
    if (accordionMode && isTouchDevice()) {
      tabContent.removeAttribute('aria-hidden');
    } else {
      tabContent.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    }

    // Remove role and tabindex in accordion mode, add role in tabs mode
    if (accordionMode) {
      tabContent.removeAttribute('role');
      tabContent.removeAttribute('tabindex');
    } else {
      tabContent.setAttribute('role', 'tabpanel');
      // Set tabindex=0 when active, remove when inactive
      if (isActive) {
        tabContent.setAttribute('tabindex', '0');
      } else {
        tabContent.removeAttribute('tabindex');
      }
    }
  });
}

// Shared function for handling tab activation with analytics and URL updates
function activateTab(tabs, $block, tabIndex, options = {}) {
  const { scrollToTop = false } = options;
  const activeTab = tabs[tabIndex];

  // Update tab state
  updateTabState(tabs, $block, tabIndex);

  // Update URL hash with the active tab ID
  if (activeTab?.id) {
    window.history.replaceState(null, null, `#${activeTab.id}`);
  }

  // Smooth scroll to top if requested
  if (scrollToTop) {
    const blockRect = $block.getBoundingClientRect();
    const offsetPosition = blockRect.top + window.scrollY - 80;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    });
  }
}

// Enhanced accordion click handler with close functionality
function handleAccordionClick(tabs, $block, tabIndex, placeholder) {
  const accordionMode = isAccordionMode($block);
  const activeTab = tabs[tabIndex];

  // Get the tab content element once (avoid multiple lookups)
  const tabContent = getTabContent(activeTab);
  if (!tabContent) return; // Safety check

  const isCurrentlyActive = !tabContent.classList.contains(CLASSES.hidden);
  const accordionHeader = document.getElementById(`${activeTab.id}-accordion`);

  // In accordion mode, allow closing if clicking on already active accordion
  if (accordionMode && isCurrentlyActive) {
    $block.dataset.lastActiveTab = tabIndex;
    tabContent.classList.add(CLASSES.hidden);
    if (isTouchDevice()) {
      tabContent.removeAttribute('aria-hidden');
    } else {
      tabContent.setAttribute('aria-hidden', 'true');
    }
    if (accordionHeader) {
      accordionHeader.setAttribute('aria-expanded', 'false');
    }
    // Announce state change for screen readers (collapsed)
    // Pass placeholder from $block
    announceAccordionStateChange(accordionHeader, activeTab, 'collapsed', placeholder);
    const tabButtons = $block.querySelectorAll(`${SELECTORS.tabsList} button`);
    tabButtons.forEach((btn) => {
      btn.classList.remove(CLASSES.active);
      btn.setAttribute('aria-selected', 'false');
    });
    if (accordionHeader) {
      accordionHeader.focus({ preventScroll: true });
    }
    return;
  }

  // For all other cases (open accordion or tab mode), use shared activation
  // Only trigger analytics if tab was not already active (state change occurred)
  activateTab(tabs, $block, tabIndex, {
    scrollToTop: false,
  });

  // Announce state change for screen readers (expanded)
  announceAccordionStateChange(accordionHeader, activeTab, 'expanded', placeholder);
  if (accordionHeader) setScrollAndFocus(accordionHeader, true, false);
}

function handleTabClick(tabs, $block, tabIndex) {
  activateTab(tabs, $block, tabIndex, {
    scrollToTop: true,
  });
}

function ensureActiveTabInTabsMode(tabs, $block) {
  const tabsMode = isTabsMode($block);
  if (!tabsMode) return;

  // Find the current active tab index
  let activeIndex = tabs.findIndex((tab) => {
    const tabContent = getTabContent(tab);
    return tabContent && !tabContent.classList.contains(CLASSES.hidden);
  });

  if (activeIndex === -1) {
    // Restore the last active tab or default to first tab
    const lastActiveIndex = parseInt($block.dataset.lastActiveTab, 10) || 0;
    activeIndex = lastActiveIndex < tabs.length ? lastActiveIndex : 0;
  }

  // Always call updateTabState to ensure tabindex is set correctly
  updateTabState(tabs, $block, activeIndex);
}

// Tab creation and setup
function createTabData($tabsContainer) {
  return [...$tabsContainer.querySelectorAll('button')].map(($button, index) => {
    const name = $button.textContent.trim();
    const tabId = $button.getAttribute('data-tab-id');
    const backToTab = $button.getAttribute('data-back-to-tab');

    return {
      index,
      name,
      tabId,
      backToTab,
      element: $button,
      id: generateId(name, tabId),
    };
  });
}

function setupTabContent(tab, $tabContent) {
  $tabContent.classList.add(CLASSES.tabItem, CLASSES.hidden);

  const attributes = {
    id: `${tab.id}-tabpanel`,
    'aria-labelledby': tab.id,
    'aria-hidden': tab.index === 0 ? 'false' : 'true',
    'data-tab-index': tab.index,
    role: 'tabpanel',
  };

  setAttributes($tabContent, attributes);

  tab.content = $tabContent;
  return $tabContent;
}

function createAccordionHeader(tab) {
  const wrapper = document.createElement('h3');
  wrapper.className = CLASSES.tabsAccHeaderWrapper;

  const header = document.createElement('button');
  header.className = `${CLASSES.tabsAccHeader} body-01`;

  setAttributes(header, {
    id: `${tab.id}-accordion`,
    type: 'button',
    'aria-expanded': tab.index === 0 ? 'true' : 'false',
    'aria-controls': `${tab.id}-tabpanel`,
    'data-tab-index': tab.index,
    tabindex: '0',
  });

  header.textContent = tab.name;
  wrapper.appendChild(header);

  return wrapper;
}

function buildBackToTabLink(tab, tabContent, placeholders) {
  if (!tabContent) return;

  // Always create back to tabs link, regardless of preset configuration
  const backToTab = document.createElement('a');
  backToTab.href = `#${tab.id}`;
  backToTab.classList.add(CLASSES.tabsItemBacktotabs, 'body-02');
  backToTab.textContent = placeholders?.backToTabs;

  const anchorWrapper = createElementWithClasses('div', 'anchor-wrapper');
  anchorWrapper.appendChild(backToTab);

  let container = tabContent;
  if (tabContent.lastElementChild && tabContent.lastElementChild.tagName === 'DIV') {
    container = tabContent.lastElementChild;
  }
  container.appendChild(anchorWrapper);
}

function getAriaLabel($block) {
  // Find the first heading above the tab container
  const tabContainer = $block.closest(SELECTORS.tabContainer);
  const previousSection = tabContainer?.previousElementSibling;

  if (previousSection) {
    const headings = previousSection.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const lastHeading = headings[headings.length - 1];
    return lastHeading?.textContent?.trim() || '';
  }

  return '';
}

// Main tab creation function
export function createTabs($block, tabSections, placeholder) {
  const $tabsContainer = $block.querySelector(SELECTORS.tabsList);
  if (!$tabsContainer) return null;

  if (isAuthorEditMode()) $block.classList.add(CLASSES.authorEdit);

  // Create tab data structure
  const tabs = createTabData($tabsContainer);

  // Setup container attributes
  setAttributes($tabsContainer, {
    'aria-label': getAriaLabel($block),
    role: 'tablist',
  });

  $block.replaceChildren($tabsContainer);

  // Process tab content sections
  const sectionsArray = [...tabSections];

  sectionsArray.forEach(($tabContent, index) => {
    const name = $tabContent.dataset.tabName;
    const tab = tabs.find((t) => t.name === name);

    if (tab) {
      setupTabContent(tab, $tabContent);

      // add author edit mode class
      if (isAuthorEditMode()) {
        $tabContent.classList.add(CLASSES.authorEdit);
      }

      // Add tabs-item-first class to the first tab section
      if (index === 0) {
        $tabContent.classList.add(CLASSES.tabItemFirst);
      }

      // Add tabs-item-last class to the last tab section
      if (index === sectionsArray.length - 1) {
        $tabContent.classList.add(CLASSES.tabItemLast);
      }

      // Add accordion header
      const accordionHeader = createAccordionHeader(tab);
      $tabContent.insertBefore(accordionHeader, $tabContent.firstChild);

      // Add back to tabs link (always present now)
      buildBackToTabLink(tab, $tabContent, placeholder);
    }
  });

  return tabs;
}

// Responsive behavior management
function getTabsWidths($block) {
  // Clone the tabs-list to measure its width when visible
  const clone = $block.cloneNode(true);
  const cloneTabsList = clone.querySelector(SELECTORS.tabsList);
  const mainTag = $block.closest('main');

  // Remove any mode classes that might hide it
  clone.classList.remove(CLASSES.accordionMode);
  clone.classList.add(CLASSES.tabsMode);

  // Add measurement utility class instead of inline styles
  clone.classList.add(CLASSES.tabsMeasureClone);

  // Add to document to measure
  mainTag.appendChild(clone);

  const totalWidth = cloneTabsList.scrollWidth;

  // Clean up - remove the clone
  mainTag.removeChild(clone);

  return totalWidth;
}

export function checkTabsOverflow($block, tabSections) {
  const $tabsList = $block.querySelector(SELECTORS.tabsList);

  if (!$tabsList) return;

  // Get tabs data for this block
  const tabs = createTabData($block);

  // Helper function to apply mode classes
  const applyMode = (useAccordionMode) => {
    applyModeClasses($block, tabSections, useAccordionMode);

    if (!useAccordionMode) {
      // Ensure an active tab when switching to tabs mode
      ensureActiveTabInTabsMode(tabs, $block);
    }
  };

  requestAnimationFrame(() => {
    // In author edit mode, always show tabs mode for easier editing
    // if (isAuthorEditMode()) {
    //   applyMode(false);
    //   return;
    // }

    // Check for overflow on larger screens
    const contentWidth = getTabsWidths($block);
    const availableWidth = $block.clientWidth;
    const isOverflowing = contentWidth > availableWidth;
    // Apply correct classes based on overflow state
    applyMode(isOverflowing);
  });
}

// Global state to track if global handlers are already set up
let globalHandlersInitialized = false;
const tabsRegistry = new Map(); // Store all tab instances

// Hash navigation and external link handling
function handleHashNavigation(tabs, $block) {
  const hash = window.location.hash.substring(1); // Remove the # symbol
  if (!hash) return false;

  const targetTabIndex = tabs.findIndex((tab) => tab.id === hash);
  if (targetTabIndex !== -1) {
    updateTabState(tabs, $block, targetTabIndex);
    // Smart scroll based on current mode
    scrollToTarget(tabs, $block, targetTabIndex);
    return true;
  }
  return false;
}

function findTabAndBlock(targetId) {
  // Search through all registered tab instances
  const entries = Array.from(tabsRegistry.entries());
  const result = entries.find(([, tabs]) => tabs.some((tab) => tab.id === targetId));

  if (result) {
    const [block, tabs] = result;
    const tabIndex = tabs.findIndex((tab) => tab.id === targetId);
    return { tabs, block, tabIndex };
  }

  return null;
}

function setupGlobalLinkHandlers() {
  // Only set up global handlers once
  if (globalHandlersInitialized) return;
  globalHandlersInitialized = true;

  // Handle clicks on any anchor links that point to tab IDs, excluding 'Back to tabs' link
  document.addEventListener('click', (event) => {
    const anchor = event.target.closest(`a[href^="#"]:not(${SELECTORS.backToTabLink})`);
    if (!anchor) return;

    const targetId = anchor.getAttribute('href').substring(1);
    if (!targetId) return;

    const result = findTabAndBlock(targetId);
    if (result) {
      event.preventDefault();
      const { tabs, block, tabIndex } = result;
      updateTabState(tabs, block, tabIndex);

      // Update URL hash
      window.history.replaceState(null, null, `#${targetId}`);

      // Smart scroll based on current mode
      scrollToTarget(tabs, block, tabIndex);
    }
  });

  // Handle browser back/forward navigation
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.substring(1);
    if (!hash) return;

    const result = findTabAndBlock(hash);
    if (result) {
      const { tabs, block, tabIndex } = result;
      updateTabState(tabs, block, tabIndex);
      scrollToTarget(tabs, block, tabIndex);
    }
  });
}

// Event handling
function setupTabEvents(tabs, $block, tabGroupName, placeholder) {
  const currentTabGroup = document.querySelectorAll(`[data-tab-group='${tabGroupName}']`);

  // Tab button clicks
  tabs.forEach((tab) => {
    tab.element.addEventListener('click', () => {
      if (!tab.element.classList.contains(CLASSES.active)) {
        handleTabClick(tabs, $block, tab.index);
      }
    });
  });

  currentTabGroup.forEach((tabElement) => {
    // Unified keyboard navigation for both tab buttons and accordion headers
    tabElement.addEventListener('keydown', (ev) => {
      const isTabButton = ev.target.matches(SELECTORS.tabButton);
      const isAccordionHeader = ev.target.matches('.tabs-acc-header');

      if (!isTabButton && !isAccordionHeader) return;

      // Handle tab button navigation
      if (isTabButton) {
        const tabButtons = Array.from($block.querySelectorAll(SELECTORS.tabButton));
        const currentIndex = tabButtons.indexOf(ev.target);
        let nextIndex = currentIndex;

        switch (ev.key) {
          case 'ArrowRight':
            nextIndex = (currentIndex + 1) % tabButtons.length;
            break;
          case 'ArrowLeft':
            nextIndex = (currentIndex - 1 + tabButtons.length) % tabButtons.length;
            break;
          case 'Home':
            nextIndex = 0;
            break;
          case 'End':
            nextIndex = tabButtons.length - 1;
            break;
          case 'Enter':
          case ' ': // Space bar
            ev.preventDefault();
            if (!ev.target.classList.contains(CLASSES.active)) {
              handleTabClick(tabs, $block, currentIndex);
            }
            return;
          default:
            return;
        }

        if (nextIndex !== currentIndex) {
          ev.preventDefault();
          const nextButton = tabButtons[nextIndex];

          // Activate the tab first
          handleTabClick(tabs, $block, nextIndex);

          // Then ensure focus is on the newly active tab
          setTimeout(() => {
            nextButton.focus();
          }, 0);
        }
      } else if (isAccordionHeader) {
        // Handle accordion header navigation
        const accordionHeaders = getAccordionHeaders(tabs);
        const currentIndex = accordionHeaders.indexOf(ev.target);
        const tabIndex = parseInt(ev.target.getAttribute('data-tab-index'), 10);

        switch (ev.key) {
          case 'Enter':
          case ' ': // Space bar
            ev.preventDefault();
            handleAccordionClick(tabs, $block, tabIndex, placeholder);
            break;
          case 'ArrowRight': {
            ev.preventDefault();
            const nextIndex = (currentIndex + 1) % accordionHeaders.length;
            navigateToAccordionHeader(accordionHeaders, nextIndex);
            break;
          }
          case 'ArrowLeft': {
            ev.preventDefault();
            const prevIndex = (
                currentIndex - 1 + accordionHeaders.length
            ) % accordionHeaders.length;
            navigateToAccordionHeader(accordionHeaders, prevIndex);
            break;
          }
          case 'Home':
            ev.preventDefault();
            navigateToAccordionHeader(accordionHeaders, 0);
            break;
          case 'End':
            ev.preventDefault();
            navigateToAccordionHeader(accordionHeaders, accordionHeaders.length - 1);
            break;
          default:
            break;
        }
      }
    });
  });

  // Accordion header clicks - scope to this specific tabs instance with enhanced handler
  tabs.forEach((tab) => {
    const accordionHeader = document.getElementById(`${tab.id}-accordion`);
    if (accordionHeader) {
      // Mouse/touch click events
      accordionHeader.addEventListener('click', () => {
        handleAccordionClick(tabs, $block, tab.index);
      });
    }
  });

  // Back to tabs links
  const backLinks = document.querySelectorAll(
    `[data-tab-group='${tabGroupName}'] ${SELECTORS.backToTabLink}`,
  );
  backLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        setScrollAndFocus(targetElement, true, true);
      } else {
        setScrollAndFocus($block, true, true);
      }
    });
  });
}

// Tab button setup
function setupTabButton(tab, index, totalTabs) {
  setAttributes(tab.element, {
    id: tab.id,
    role: 'tab',
    tabindex: tab.index === 0 ? '0' : '-1',
    'data-tab-index': tab.index,
    'aria-selected': tab.index === 0 ? 'true' : 'false',
    'aria-controls': `${tab.id}-tabpanel`,
  });

  tab.element.classList.add(CLASSES.tabButton, 'body-01');

  // Add tabs-button-first class to the first tab button
  if (index === 0) {
    tab.element.classList.add(CLASSES.tabButtonFirst);
  }

  // Add tabs-button-last class to the last tab button
  if (index === totalTabs - 1) {
    tab.element.classList.add(CLASSES.tabButtonLast);
  }
}

// Main decorate function
export default async function decorate($block) {
  const placeholder = await fetchLanguagePlaceholders();

  // Check if tabs-list exists
  const tabsListElement = $block.querySelector(SELECTORS.tabsList);
  if (!tabsListElement) {
    return; // Early return if no tabs-list found
  }

  // tabs group name
  const tabGroupName = tabsListElement.getAttribute(SELECTORS.tabGroup);

  // Get all tab content sections related to this tab
  const tabSections = document.querySelectorAll(
    `.tabs-section[data-tab-group="${tabGroupName}"]`,
  );

  const tabs = createTabs($block, tabSections, placeholder);

  if (!tabs?.length) return;

  // Register this tab instance in the global registry
  tabsRegistry.set($block, tabs);

  // Setup global link handlers only once
  setupGlobalLinkHandlers();

  // Setup tab buttons
  tabs.forEach((tab, index) => setupTabButton(tab, index, tabs.length));

  // Setup event handling
  setupTabEvents(tabs, $block, tabGroupName, placeholder);

  // Check for initial hash navigation, otherwise set initial state
  if (!handleHashNavigation(tabs, $block)) {
    updateTabState(tabs, $block, 0);
  }

  // Setup responsive behavior
  // Initial check with delay for styles to load
  setTimeout(() => {
    checkTabsOverflow($block, tabSections);
    // Ensure role attributes are correct after mode is determined
    updateTabContentRoles($block, tabSections);
  }, 100);

  // Add resize listener (debouncing handled internally)
  subscribeToResizeListener(() => {
    checkTabsOverflow($block, tabSections);
    // Update role attributes after resize
    updateTabContentRoles($block, tabSections);
  });

  // Re-check when fonts are loaded
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      checkTabsOverflow($block, tabSections);
      updateTabContentRoles($block, tabSections);
    });
  }

  // testing requirement - set attribute 'data-testid' for elements
  attachTestIdToElements($block, tabGroupName);
}
