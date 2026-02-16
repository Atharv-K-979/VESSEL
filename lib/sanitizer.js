export function sanitizeDOM(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const dangerousTags = ['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template'];
    dangerousTags.forEach(tag => {
        const elements = doc.querySelectorAll(tag);
        elements.forEach(el => el.remove());
    });

    const removeComments = (node) => {
        const children = Array.from(node.childNodes);
        children.forEach(child => {
            if (child.nodeType === Node.COMMENT_NODE) {
                child.remove();
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                removeComments(child);
            }
        });
    };
    removeComments(doc.body);

    const hiddenSelectors = [
        '[hidden]',
        '[aria-hidden="true"]',
        '[style*="display: none"]',
        '[style*="display:none"]',
        '[style*="visibility: hidden"]',
        '[style*="visibility:hidden"]',
        '[style*="opacity: 0"]',
        '[style*="opacity:0"]',
        '[style*="font-size: 0"]', // Sometimes used to hide text
        '[style*="font-size:0"]'
    ];

    hiddenSelectors.forEach(selector => {
        const elements = doc.querySelectorAll(selector);
        elements.forEach(el => el.remove());
    });
    const cleanText = doc.body.textContent || "";
    return cleanText.replace(/\s+/g, ' ').trim();
}

/**
 * Validates if a string contains safe HTML (basic check).
 * @param {string} html 
 * @returns {boolean}
 */
export function isSafeHTML(html) {
    return !/<script|onload|onerror/i.test(html);
}
