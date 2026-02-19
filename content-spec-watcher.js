(async () => {
    try {
        const src = chrome.runtime.getURL('lib/ui-utils.js');
        const { createBadge, createModal, escapeHtml } = await import(src);

        const EDITOR_SELECTORS = [
            '[data-testid="issue-description"]',
            '.ProseMirror',
            'textarea[name="description"]',
            'div[contenteditable="true"]',
            'textarea',
            '[data-testid="issue-description"]',
            '[contenteditable="true"]'
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
            return element.isContentEditable ||
                (element.getAttribute && element.getAttribute('contenteditable') === 'true') ||
                element.closest('[contenteditable="true"]') ||
                EDITOR_SELECTORS.some(sel => element.matches(sel) || element.closest(sel));
        }

        function scheduleAnalysis(target) {
            if (analysisTimer) clearTimeout(analysisTimer);
            analysisTimer = setTimeout(() => {
                analyzeField(target);
            }, DEBOUNCE_MS);
        }

        async function analyzeField(target) {
            const text = getTextFromField(target);
            if (!text || text.length < 10) return;

            if (!chrome.runtime?.id) {
                console.warn('[VESSEL] Extension reloaded. Please refresh this page to continue.');
                return;
            }

            chrome.runtime.sendMessage({
                action: 'analyzeSpec',
                text: text
            }, (response) => {
                if (chrome.runtime.lastError) return;
                if (response && response.missing) {
                    updateUI(target, response.missing);
                }
            });
        }

        function getTextFromField(element) {
            if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
                return element.value;
            }
            return element.innerText;
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
                if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
                    const start = target.selectionStart || 0;
                    const end = target.selectionEnd || 0;
                    const val = target.value;
                    target.value = val.substring(0, start) + '\n\n' + text + val.substring(end);
                } else {
                    target.innerText += '\n\n' + text;
                }
            }

            // Dispatch input event that bubbles to support frameworks like React
            const inputEvent = new Event('input', { bubbles: true, cancelable: true });
            target.dispatchEvent(inputEvent);
            const changeEvent = new Event('change', { bubbles: true });
            target.dispatchEvent(changeEvent);
        }

    } catch (e) {
        console.error('[VESSEL] content-spec-watcher error:', e);
    }
})();
