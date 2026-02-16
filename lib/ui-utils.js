const WRAPPER_ID = 'vessel-extension-root';

const COMMON_STYLES = `
  :host {
    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    box-sizing: border-box;
  }
  .vessel-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    z-index: 2147483647; /* Max Z-Index */
    display: flex;
    justify-content: center;
    align-items: center;
    backdrop-filter: blur(2px);
  }
  .vessel-modal {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    width: 400px;
    max-width: 90%;
    padding: 24px;
    color: #333;
    animation: vessel-fade-in 0.2s ease-out;
  }
  .vessel-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .vessel-content {
    font-size: 14px;
    line-height: 1.5;
    margin-bottom: 20px;
    color: #555;
  }
  .vessel-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
  .vessel-btn {
    padding: 8px 16px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background 0.2s;
  }
  .vessel-btn-primary {
    background: #2563EB;
    color: white;
  }
  .vessel-btn-primary:hover {
    background: #1D4ED8;
  }
  .vessel-btn-secondary {
    background: #F3F4F6;
    color: #374151;
  }
  .vessel-btn-secondary:hover {
    background: #E5E7EB;
  }
  .vessel-badge {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #2563EB;
    color: white;
    padding: 8px 12px;
    border-radius: 20px;
    font-size: 13px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    cursor: pointer;
    z-index: 2147483646;
    transition: transform 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .vessel-badge:hover {
    transform: scale(1.05);
  }
  @keyframes vessel-fade-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
`;

/**
 * Creates or gets the Shadow DOM container.
 * @returns {ShadowRoot}
 */
export function getShadowRoot() {
  let container = document.getElementById(WRAPPER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = WRAPPER_ID;
    document.body.appendChild(container);
    const shadow = container.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = COMMON_STYLES;
    shadow.appendChild(style);

    container._vesselShadow = shadow;
    return shadow;
  }
  return container._vesselShadow;
}

/**
 * Shows a modal dialog.
 * @param {string} title 
 * @param {string} content 
 * @param {Function} onPrimary - Action for primary button
 * @param {Function} onSecondary - Action for close/secondary
 */
export function showModal(title, content, onPrimary, primaryLabel = "Action", onSecondary = null) {
  const shadow = getShadowRoot();
  const existing = shadow.querySelector('.vessel-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'vessel-overlay';

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      if (onSecondary) onSecondary();
    }
  });

  const modal = document.createElement('div');
  modal.className = 'vessel-modal';

  modal.innerHTML = `
    <div class="vessel-title">🛡️ ${title}</div>
    <div class="vessel-content">${content}</div>
    <div class="vessel-actions">
        <button class="vessel-btn vessel-btn-secondary" id="v-cancel">Close</button>
        <button class="vessel-btn vessel-btn-primary" id="v-action">${primaryLabel}</button>
    </div>
  `;

  overlay.appendChild(modal);
  shadow.appendChild(overlay);

  // Event Listeners
  modal.querySelector('#v-cancel').addEventListener('click', () => {
    overlay.remove();
    if (onSecondary) onSecondary();
  });

  modal.querySelector('#v-action').addEventListener('click', () => {
    if (onPrimary) onPrimary();
    overlay.remove();
  });
}

/**
 * Shows the AI Threat Detection Modal
 * @param {Object} threatDetails - { score, reason }
 * @param {Function} onViewSanitized - Callback
 */
export function showAIModal(threatDetails, onViewSanitized) {
  const scorePct = Math.round(threatDetails.score * 100);
  const content = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
            <h3 style="color: #DC2626; margin: 0 0 10px 0;">Prompt Injection Detected</h3>
            <p style="font-size: 14px; color: #4B5563;">VESSEL has blocked this request to protect your session.</p>
        </div>
        <div style="background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 8px; padding: 12px; margin-bottom: 15px;">
             <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <strong>Threat Score:</strong>
                <span style="color: #DC2626; font-weight: bold;">${scorePct}%</span>
             </div>
             <div style="font-size: 13px; color: #7F1D1D;">
                <strong>Reason:</strong> ${threatDetails.reason}
             </div>
        </div>
    `;

  showModal("Security Alert", content, onViewSanitized, "View Sanitized Input", () => { });

  // Customize the modal title color after creation (hacky but effective for now without full CSS refactor)
  const shadow = getShadowRoot();
  const title = shadow.querySelector('.vessel-title');
  if (title) title.style.color = '#DC2626';
}

/**
 * Shows the Spec Logic Suggestions Modal
 * @param {Array} requirements - List of missing requirements
 * @param {Function} onInject - (index) => void
 */
export function showSpecModal(requirements, onInject) {
  let html = '<ul style="list-style: none; padding: 0;">';
  requirements.forEach((req, index) => {
    html += `
            <li style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <strong style="color: #2563EB;">${req.category}</strong>
                        <p style="font-size: 13px; color: #666; margin: 4px 0;">${req.description}</p>
                    </div>
                    <button 
                        class="vessel-btn vessel-btn-secondary vessel-inject-btn" 
                        data-index="${index}"
                        style="font-size: 12px; padding: 4px 10px; white-space: nowrap;"
                    >
                        + Inject
                    </button>
                </div>
                <div style="display:none;" id="req-text-${index}">${req.suggestion}</div>
            </li>
        `;
  });
  html += '</ul>';

  const onPrimary = () => { }; // Primary is usually "Done"

  showModal("Security Suggestions", html, onPrimary, "Done");

  // Attach logic
  const shadow = getShadowRoot();
  const buttons = shadow.querySelectorAll('.vessel-inject-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = e.target.getAttribute('data-index');
      const text = shadow.getElementById(`req-text-${index}`).innerText;
      if (onInject) onInject(index, text);

      e.target.textContent = "Injected!";
      e.target.disabled = true;
      e.target.style.background = "#D1FAE5";
      e.target.style.color = "#065F46";
    });
  });
}

/**
 * Shows a floating badge.
 * @param {string} text 
 * @param {Function} onClick 
 */
export function showBadge(text, onClick) {
  const shadow = getShadowRoot();

  // Remove existing badges
  const existing = shadow.querySelector('.vessel-badge');
  if (existing) existing.remove();

  const badge = document.createElement('div');
  badge.className = 'vessel-badge';
  badge.innerHTML = `<span>🛡️</span> ${text}`;

  badge.addEventListener('click', onClick);

  shadow.appendChild(badge);
  return badge;
}
