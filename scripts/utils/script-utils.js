import { toCamelCase } from '../aem.js';

/**
 * Gets placeholders object.
 * @param {string} [prefix] Location of placeholders
 * @returns {object} Window placeholders object
 */
export async function fetchPlaceholders(prefix = 'default') {
  window.placeholders = window.placeholders || {};
  if (!window.placeholders[prefix]) {
    window.placeholders[prefix] = new Promise((resolve) => {
      fetch(`${prefix === 'default' ? '' : prefix}/placeholders.json`)
        .then((resp) => {
          if (resp.ok) {
            return resp.json();
          }
          return {};
        })
        .then((json) => {
          const placeholders = {};
          json.data
            ?.filter((placeholder) => placeholder.Key)
            .forEach((placeholder) => {
              placeholders[toCamelCase(placeholder.Key)] = placeholder.Text;
            });
          window.placeholders[prefix] = placeholders;
          resolve(window.placeholders[prefix]);
        })
        .catch(() => {
          window.placeholders[prefix] = {};
          resolve(window.placeholders[prefix]);
        });
    });
  }
  return window.placeholders[`${prefix}`];
}

/**
 * Process current pathname and return details for use in language switching
 * @returns {Object} Object containing langRegion, lang, and region
 */
export function getPathDetails() {
  const defaultLangRegion = 'en';
  const defaultLanguage = 'en';
  const defaultRegion = 'us';

  let langRegion = defaultLangRegion;
  let lang = defaultLanguage;
  let region = defaultRegion;

  const { pathname } = window.location;
  const parts = pathname.split('/').filter(Boolean);

  if (parts.length > 0) {
    const firstPart = parts[0].toLowerCase();
    if (firstPart.includes('-')) {
      langRegion = firstPart;
      [lang, region] = langRegion.split('-');
    } else if (firstPart.length === 2) {
      lang = firstPart;
      langRegion = `${lang}-${region}`;
    }
  }

  return {
    langRegion,
    lang,
    region,
  };
}

/**
 * Fetch language-specific placeholders
 * @returns {Promise<Object>} Placeholders object
 */
export async function fetchLanguagePlaceholders() {
  const pathDetails = getPathDetails();
  const langRegion = pathDetails?.langRegion || 'default';
  return fetchPlaceholders(`/${langRegion}`);
}
