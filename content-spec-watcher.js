(async () => {
    const src = chrome.runtime.getURL('lib/ui-utils.js');
    const { createBadge, createModal, escapeHtml } = await import(src);

    const EDITOR_SELECTORS = [
        '[data-testid="issue-description"]', // Jira?
        '.ProseMirror', // Notion, Linear, many modern editors
        'textarea[name="description"]',
        'div[contenteditable="true"]',
        'textarea' // Generic fallback, might be too broad but good for testing
    ];

    let activeBadge = null;
    let analysisTimer = null;
    const DEBOUNCE_MS = 3000;

    document.addEventListener('input', (e) => {
        const target = e.target;
        if (isEditor(target)) {
            scheduleAnalysis(target);
        }
    }, true);

    function isEditor(element) {
        return EDITOR_SELECTORS.some(sel => element.matches(sel) || element.closest(sel));
    }

    function scheduleAnalysis(target) {
        if (analysisTimer) clearTimeout(analysisTimer);

        analysisTimer = setTimeout(() => {
            analyzeField(target);
        }, DEBOUNCE_MS);
    }

    async function analyzeField(target) {
        const text = getTextFromField(target);
        if (!text || text.length < 10) return; // Ignore empty/short fields

        chrome.runtime.sendMessage({
            action: 'analyzeSpec',
            text: text
        }, (response) => {
            if (chrome.runtime.lastError || !response || !response.missing) return;

            updateUI(target, response.missing);
        });
    }

    function getTextFromField(element) {
        if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
            return element.value;
        }
        return element.innerText; // contenteditable
    }

    function updateUI(target, missingRequirements) {
        if (activeBadge) activeBadge.remove();

        if (missingRequirements.length === 0) return;

        const rect = target.getBoundingClientRect();

        const badgeControl = createBadge(missingRequirements.length, () => {
            showRequirementsModal(target, missingRequirements);
        });

        badgeControl.show();
        badgeControl.updatePosition(rect);

        activeBadge = badgeControl.element;
    }

    function showRequirementsModal(target, requirements) {
        let contentHtml = `<div style="display: flex; flex-direction: column; gap: 12px;">`;

        requirements.forEach((req, index) => {
            contentHtml += `
                <div style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-weight: 600; color: #DC2626; font-size: 13px; text-transform: uppercase;">
                            Missing: ${escapeHtml(req.category)}
                        </span>
                        <button class="vessel-inject-btn" data-index="${index}" style="
                            background: #EFF6FF; color: #2563EB; border: none; 
                            padding: 4px 8px; border-radius: 4px; font-size: 12px; 
                            font-weight: 600; cursor: pointer;">
                            + Inject
                        </button>
                    </div>
                    <div style="font-size: 13px; color: #374151; line-height: 1.4;">
                        ${escapeHtml(req.template)}
                    </div>
                </div>
            `;
        });
        contentHtml += `</div>`;

        const container = document.createElement('div');
        container.innerHTML = contentHtml;

        const modal = createModal(
            "Security Requirements Assistant",
            container,
            [{ text: "Done", primary: true, onClick: () => modal.hide() }]
        );

        container.querySelectorAll('.vessel-inject-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.getAttribute('data-index'));
                const req = requirements[index];
                injectText(target, req.template);

                btn.textContent = "Injected ✓";
                btn.style.background = "#D1FAE5";
                btn.style.color = "#059669";
                btn.disabled = true;
            });
        });

        modal.show();
    }

    function injectText(target, text) {
        target.focus();

        const success = document.execCommand('insertText', false, '\n\n' + text);

        if (!success) {
            if (target.tagName === 'TEXTAREA') {
                const start = target.selectionStart;
                const end = target.selectionEnd;
                const val = target.value;
                target.value = val.substring(0, start) + '\n\n' + text + val.substring(end);

                target.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
                target.innerText += '\n\n' + text; // Simple fallback
            }
        }
    }

})();
