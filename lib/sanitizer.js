
export function sanitizeDOM(html) {
    if (!html) return '';

    // Environment check: if DOMParser is available (typical browser/content script)
    if (typeof DOMParser !== 'undefined') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Remove comments
        const iterator = document.createNodeIterator(doc.body, NodeFilter.SHOW_COMMENT);
        let currentNode;
        while (currentNode = iterator.nextNode()) {
            currentNode.parentNode.removeChild(currentNode);
        }

        // Remove hidden elements and suspicious attributes
        const elements = doc.body.querySelectorAll('*');
        elements.forEach(el => {
            // Check for hidden styles/attributes
            const style = el.getAttribute('style') || '';
            const isHidden =
                style.includes('display:none') ||
                style.includes('display: none') ||
                style.includes('visibility:hidden') ||
                style.includes('visibility: hidden') ||
                style.includes('opacity:0') ||
                style.includes('opacity: 0') ||
                el.hasAttribute('hidden') ||
                el.getAttribute('aria-hidden') === 'true';

            if (isHidden) {
                el.remove();
                return;
            }

            // Remove suspicious attributes
            const ariaLabel = el.getAttribute('aria-label');
            if (ariaLabel && (ariaLabel.length > 100 || /ignore previous|system prompt/i.test(ariaLabel))) {
                el.removeAttribute('aria-label');
            }
        });

        return doc.body.innerText || doc.body.textContent || '';
    } else {
        console.warn('DOMParser not available, using basic regex fallback.');
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
}
