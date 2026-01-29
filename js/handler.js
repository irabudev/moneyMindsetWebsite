// js/handler.js

// --- Global Constants & Variables ---
const RELEVANT_PARAMS = ['refCode', 'refcode', 'source', 'donation', 'lang', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']; // Parameters to track
const translations = { en: {}, sw: {} };
let translatableElements, translatablePlaceholders, translatableAltText, translatableAriaLabel;

// --- DOM Element Variables (queried in DOMContentLoaded) ---
let mobileMenuButton, mobileMenu, header, backToTopButton;
let langEnDesktop, langSwDesktop, langEnMobile, langSwMobile;
let uzaEmbed;

// --- I. Parameter Handling Functions ---

/**
 * Stores or clears parameters in localStorage based on the current URL.
 * If a RELEVANT_PARAM is in the URL:
 *  - If its value is empty (e.g., "?refCode="), it's removed from localStorage.
 *  - If its value is non-empty, it's stored in localStorage.
 * @param {URLSearchParams} paramsFromUrl - The URLSearchParams object from the current window.location.search.
 */
function storeOrClearPersistentParams(paramsFromUrl) {
    RELEVANT_PARAMS.forEach(pName => {
        if (paramsFromUrl.has(pName)) { // Parameter is present in the current URL
            const value = paramsFromUrl.get(pName);
            if (value === '') { // Explicitly empty in URL, e.g., ?refCode=
                localStorage.removeItem(`mm_${pName}`);
                // console.log(`Cleared mm_${pName} from localStorage due to empty URL param.`);
            } else {
                localStorage.setItem(`mm_${pName}`, value);
                // console.log(`Stored mm_${pName}: ${value} from URL to localStorage.`);
            }
        }
        // If param is NOT in URL, we don't touch localStorage here.
        // getEffectiveParams will decide based on URL (if present) or fallback to localStorage.
    });
}

/**
 * Determines the effective parameters to use, prioritizing URL over localStorage.
 * If a RELEVANT_PARAM is in the URL (even if empty), that value is used.
 * Otherwise, the value from localStorage is used (or an empty string if not in localStorage).
 * @returns {object} An object with RELEVANT_PARAMS as keys and their effective values.
 */
function getEffectiveParams() {
    const urlParams = new URLSearchParams(window.location.search);
    let effectiveParams = {};

    RELEVANT_PARAMS.forEach(pName => {
        if (urlParams.has(pName)) {
            effectiveParams[pName] = urlParams.get(pName); // Value from URL (can be empty string)
        } else {
            effectiveParams[pName] = localStorage.getItem(`mm_${pName}`) || ''; // Value from localStorage or default empty
        }
    });
    // console.log("Effective params:", effectiveParams);
    return effectiveParams;
}


/**
 * Updates the browser's current URL in the address bar based on effective parameters.
 * - If an effective param is non-empty and not in the URL, it's added.
 * - If an effective param is empty (due to URL like ?refCode=) and the URL currently has it with a value, it's removed.
 * - If an effective param is empty and the URL doesn't have it, nothing changes for that param.
 * This ensures the URL bar reflects the desired state without a page reload.
 * @param {object} effectiveParams - The parameters that should be reflected in the URL.
 */
function syncUrlWithEffectiveParams(effectiveParams) {
    const currentUrlParams = new URLSearchParams(window.location.search);
    let paramsToUpdate = new URLSearchParams(); // Start with a fresh set for clarity
    let urlNeedsChange = false;

    // Build the new set of search parameters based on effectiveParams
    RELEVANT_PARAMS.forEach(pName => {
        if (effectiveParams[pName] !== '') { // Only add non-empty effective params
            paramsToUpdate.set(pName, effectiveParams[pName]);
        }
    });

    // Check if the new query string is different from the current one
    const newQueryString = paramsToUpdate.toString();
    const currentQueryString = currentUrlParams.toString();

    if (newQueryString !== currentQueryString) {
        urlNeedsChange = true;
    }

    if (urlNeedsChange) {
        const newUrl = `${window.location.pathname}${newQueryString ? '?' + newQueryString : ''}${window.location.hash}`;
        history.replaceState(null, '', newUrl);
        // console.log("URL synced to:", newUrl);
    }
}


/**
 * Updates all relevant internal links on the page to include non-empty effective parameters.
 * If an effective parameter is empty, it will not be added to links.
 * @param {object} effectiveParams - The parameters to append to links if non-empty.
 */
function updatePageLinks(effectiveParams) {
    document.querySelectorAll('a').forEach(a => {
        try {
            if (!a.href || a.href.startsWith('mailto:') || a.href.startsWith('tel:')) return;

            // Check if the link is internal or relative
            const isSameHostname = a.hostname === window.location.hostname;
            const isRelative = !a.hostname || a.href.startsWith('/') || a.href.startsWith('.') || a.href.startsWith('#');

            if (isSameHostname || isRelative) {
                const linkUrl = new URL(a.href, window.location.origin);

                // Clear existing RELEVANT_PARAMS from the link first to ensure clean state
                RELEVANT_PARAMS.forEach(pName => {
                    linkUrl.searchParams.delete(pName);
                });

                // Add non-empty effective parameters
                let linkChanged = false;
                RELEVANT_PARAMS.forEach(pName => {
                    if (effectiveParams[pName] && effectiveParams[pName] !== '') {
                        linkUrl.searchParams.set(pName, effectiveParams[pName]);
                        linkChanged = true;
                    }
                });

                // Only update href if it actually changed or if original query had relevant params that are now cleared
                if (linkChanged || RELEVANT_PARAMS.some(p => new URL(a.getAttribute('href'), window.location.origin).searchParams.has(p))) {
                    // The getAttribute('href') is used to compare against the original state before any modifications in this session.
                    if (a.href !== linkUrl.toString()) {
                        a.href = linkUrl.toString();
                    }
                }
            }
        } catch (e) {
            // console.warn("Could not parse URL for link modification:", a.href, e);
        }
    });
}

/**
 * Updates the Uza embed attributes based on effective parameters.
 * If an effective parameter is empty, the corresponding attribute is removed.
 * @param {object} effectiveParams - The parameters to apply to the Uza embed.
 */
function updateUzaEmbedAttributes(effectiveParams) {
    if (uzaEmbed) {
        RELEVANT_PARAMS.forEach(pName => {
            if (effectiveParams[pName] && effectiveParams[pName] !== '') {
                uzaEmbed.setAttribute(pName, effectiveParams[pName]);
            }
        });
    }
}

// --- II. Language Switching Functions ---
// (These functions remain largely the same as your provided version, minor tweaks for robustness if any)
function queryTranslatableElements() {
    translatableElements = document.querySelectorAll('[data-sw]');
    translatablePlaceholders = document.querySelectorAll('[data-sw-placeholder]');
    translatableAltText = document.querySelectorAll('[data-sw-alt]');
    translatableAriaLabel = document.querySelectorAll('[data-sw-aria-label]');
}

function storeOriginalTexts() {
    queryTranslatableElements();
    translations.en = {};
    translations.sw = {};

    translatableElements.forEach(el => {
        const key = el.innerHTML;
        translations.en[key] = el.innerHTML;
        translations.sw[key] = el.dataset.sw;
    });

    translatablePlaceholders.forEach(el => {
        const key = `placeholder-${el.id || el.name || Math.random().toString(36).substring(7)}`;
        translations.en[key] = el.placeholder;
        translations.sw[key] = el.dataset.swPlaceholder;
        el.dataset.translationKey = key;
    });

    translatableAltText.forEach(el => {
        const key = `alt-${el.src ? el.src.split('/').pop() : Math.random().toString(36).substring(7)}`;
        translations.en[key] = el.alt;
        translations.sw[key] = el.dataset.swAlt;
        el.dataset.translationKey = key;
    });

    translatableAriaLabel.forEach(el => {
        const key = `aria-${el.id || el.getAttribute('aria-controls') || el.tagName + Math.random().toString(36).substring(7)}`;
        translations.en[key] = el.getAttribute('aria-label');
        translations.sw[key] = el.dataset.swAriaLabel;
        el.dataset.translationKey = key;
    });

    const titleElement = document.querySelector('title');
    if (titleElement && titleElement.dataset.sw) {
        const titleKey = 'page-title';
        translations.en[titleKey] = titleElement.textContent;
        translations.sw[titleKey] = titleElement.dataset.sw;
        titleElement.dataset.translationKey = titleKey;
    }
}

function setLanguage(lang) {
    if (lang !== 'en' && lang !== 'sw') return;
    if (!translatableElements || translatableElements.length === 0) {
        queryTranslatableElements();
        if (!translatableElements || translatableElements.length === 0) return;
    }

    translatableElements.forEach(el => {
        let currentKey = el.innerHTML;
        let originalEnHTML = Object.keys(translations.en).find(enKey => translations.en[enKey] === currentKey || translations.sw[enKey] === currentKey);
        if (originalEnHTML && translations[lang] && translations[lang][originalEnHTML] !== undefined) {
            el.innerHTML = translations[lang][originalEnHTML];
        }
    });

    translatablePlaceholders.forEach(el => {
        const key = el.dataset.translationKey;
        if (key && translations[lang] && translations[lang][key] !== undefined) {
            el.placeholder = translations[lang][key];
        }
    });

    translatableAltText.forEach(el => {
        const key = el.dataset.translationKey;
        if (key && translations[lang] && translations[lang][key] !== undefined) {
            el.alt = translations[lang][key];
        }
    });

    translatableAriaLabel.forEach(el => {
        const key = el.dataset.translationKey;
        if (key && translations[lang] && translations[lang][key] !== undefined) {
            el.setAttribute('aria-label', translations[lang][key]);
        }
    });

    const titleElement = document.querySelector('title');
    if (titleElement && titleElement.dataset.translationKey) {
        const titleKey = titleElement.dataset.translationKey;
        if (titleKey && translations[lang] && translations[lang][titleKey] !== undefined) {
            document.title = translations[lang][titleKey];
        }
    }

    document.documentElement.lang = lang;

    if (langEnDesktop) langEnDesktop.classList.toggle('active', lang === 'en');
    if (langSwDesktop) langSwDesktop.classList.toggle('active', lang === 'sw');
    if (langEnMobile) langEnMobile.classList.toggle('active', lang === 'en');
    if (langSwMobile) langSwMobile.classList.toggle('active', lang === 'sw');

    localStorage.setItem('preferredLang', lang);
}


// --- III. UI Interaction Functions ---
// (These functions remain largely the same)
function toggleMobileMenu() {
    if (mobileMenuButton && mobileMenu) {
        const expanded = mobileMenuButton.getAttribute('aria-expanded') === 'true' || false;
        mobileMenuButton.setAttribute('aria-expanded', !expanded);
        mobileMenu.classList.toggle('hidden');
    }
}

function handleScrollEffects() {
    if (header) {
        if (window.scrollY > 100) {
            header.classList.add('shadow-md', 'py-2');
            header.classList.remove('py-3');
        } else {
            header.classList.remove('shadow-md', 'py-2');
            header.classList.add('py-3');
        }
    }
    if (backToTopButton) {
        if (window.scrollY > 500) {
            backToTopButton.classList.remove('opacity-0', 'invisible', 'translate-y-10');
            backToTopButton.classList.add('opacity-100', 'visible', 'translate-y-0');
        } else {
            backToTopButton.classList.add('opacity-0', 'invisible', 'translate-y-10');
            backToTopButton.classList.remove('opacity-100', 'visible', 'translate-y-0');
        }
    }
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleSmoothScroll(event) {
    const anchor = event.currentTarget; // Use currentTarget
    const href = anchor.getAttribute('href');
    if (href && href.length > 1 && href.startsWith('#')) {
        event.preventDefault();
        const targetId = href.substring(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
            const headerOffset = header ? header.offsetHeight : 0;
            const elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - headerOffset - 20;

            window.scrollTo({
                top: offsetPosition,
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
            });

            if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                toggleMobileMenu();
            }
        }
    }
    // If it's not a hash link, the default navigation will occur.
    // The updatePageLinks function should have already appended parameters if needed.
}

// --- IV. Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    mobileMenuButton = document.getElementById('mobile-menu-button');
    mobileMenu = document.getElementById('mobile-menu');
    header = document.querySelector('nav.sticky-nav') || document.querySelector('nav');
    backToTopButton = document.getElementById('back-to-top');
    uzaEmbed = document.querySelector('uza-products');
    langEnDesktop = document.getElementById('lang-en-desktop');
    langSwDesktop = document.getElementById('lang-sw-desktop');
    langEnMobile = document.getElementById('lang-en-mobile-btn');
    langSwMobile = document.getElementById('lang-sw-mobile-btn');

    // --- Parameter Handling Logic ---
    const paramsFromUrlOnLoad = new URLSearchParams(window.location.search);
    storeOrClearPersistentParams(paramsFromUrlOnLoad); // Step 1: Update localStorage based on current URL
    const effectiveParams = getEffectiveParams();      // Step 2: Determine what params should ideally be active
    syncUrlWithEffectiveParams(effectiveParams);       // Step 3: Update browser URL bar to reflect this, if needed
    updatePageLinks(effectiveParams);                  // Step 4: Update links on the page with these effective params
    if (uzaEmbed) {
        updateUzaEmbedAttributes(effectiveParams);     // Step 5: Update Uza embed
    }
    // --- End Parameter Handling ---


    queryTranslatableElements();
    if (translatableElements && translatableElements.length > 0) {
        storeOriginalTexts();
        const preferredLang = localStorage.getItem('preferredLang') || 'en';
        setLanguage(preferredLang);

        if (langEnDesktop) langEnDesktop.addEventListener('click', () => setLanguage('en'));
        if (langSwDesktop) langSwDesktop.addEventListener('click', () => setLanguage('sw'));
        if (langEnMobile) langEnMobile.addEventListener('click', () => setLanguage('en'));
        if (langSwMobile) langSwMobile.addEventListener('click', () => setLanguage('sw'));
    }

    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', toggleMobileMenu);
    }
    window.addEventListener('scroll', handleScrollEffects);
    if (backToTopButton) {
        backToTopButton.addEventListener('click', scrollToTop);
    }

    document.querySelectorAll('a').forEach(anchor => {
        // We only add smooth scroll for hash links. Other links navigate normally.
        if (anchor.getAttribute('href') && anchor.getAttribute('href').startsWith('#')) {
            anchor.addEventListener('click', handleSmoothScroll);
        }
        // For non-hash links, default browser navigation will happen.
        // updatePageLinks() has already modified their hrefs if necessary.
    });

    console.log('Money Mindset site initialized.');
    if (document.getElementById('series-recap-heading')) {
        console.log('Series 2 resources available. Series 3 coming 2026.');
    }
    if (uzaEmbed) {
        console.log('Digital resources and notes available for download.');
    }
});