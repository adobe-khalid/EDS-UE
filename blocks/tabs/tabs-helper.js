import { buildBlock, readBlockConfig } from '../../scripts/aem.js';

export default function decorateTabs(main) {
  const sections = [...main.querySelectorAll(':scope > div')];
  const tabGroups = [];
  let currentGroup = [];

  // Process each section and group tabs together
  sections.forEach((section) => {
    // Extract tab metadata from section
    const sectionMeta = section.querySelector('div.section-metadata');
    const tabData = sectionMeta ? readBlockConfig(sectionMeta) : {};
    const tabName = tabData['tab-name'];

    if (tabName) {
      // Set class for tab section
      section.classList.add('tabs-section');

      // Set class to show "Back to Tabs" links
      if (tabData['back-to-tab']) {
        section.classList.add(tabData['back-to-tab']);
      }

      currentGroup.push({
        section,
        tabName,
        tabId: tabData['tab-id'],
        backToTab: tabData['back-to-tab'],
      });
    } else if (currentGroup.length > 0) {
      // End current group when non-tab section is found
      tabGroups.push(currentGroup);
      currentGroup = [];
    }
  });

  // Add final group if it exists
  if (currentGroup.length > 0) {
    tabGroups.push(currentGroup);
  }

  // Create tabs blocks for each group
  tabGroups.forEach((group, groupIndex) => {
    // Generate unique tab group identifier
    const tabGroupId = `tabgroup-${groupIndex + 1}`;

    // Add tab group identifier to each section in the group
    group.forEach(({ section }) => {
      section.setAttribute('data-tab-group', tabGroupId);
    });

    // Create tabs section with buttons
    const section = document.createElement('div');
    section.className = 'section';

    const tabsList = document.createElement('div');
    tabsList.classList.add('tabs-list');
    tabsList.setAttribute('data-tab-group', tabGroupId);

    // Create tab buttons
    group.forEach(({ tabName, tabId, backToTab }) => {
      const button = document.createElement('button');
      button.textContent = tabName;

      if (tabId) button.setAttribute('data-tab-id', tabId);
      if (backToTab) button.setAttribute('data-back-to-tab', backToTab);

      tabsList.appendChild(button);
    });

    const tabsBlock = buildBlock('tabs', [[tabsList]]);
    section.appendChild(tabsBlock);

    // Insert tabs section before the first section of the group
    group[0].section.insertAdjacentElement('beforebegin', section);
  });
}
