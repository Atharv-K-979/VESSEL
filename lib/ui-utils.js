const STYLES = `
  :host {
    all: initial;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    z-index: 2147483647; /* Max z-index */
    position: fixed;
  }
  
  .vessel-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2147483647;
    backdrop-filter: blur(2px);
  }

  .vessel-modal {
    background: white;
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    max-width: 500px;
    width: 90%;
    color: #1F2937;
    font-size: 14px;
    line-height: 1.5;
    animation: vessel-fade-in 0.2s ease-out;
  }

  @keyframes vessel-fade-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }

  .vessel-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 12px;
    color: #111827;
  }

  .vessel-content {
    margin-bottom: 20px;
    color: #4B5563;
  }

  .vessel-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .vessel-btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.15s ease;
    font-size: 14px;
  }

  .vessel-btn-primary {
    background: #2563EB; /* Blue-600 */
    color: white;
  }
  .vessel-btn-primary:hover {
    background: #1D4ED8;
  }

  .vessel-btn-secondary {
    background: white;
    border-color: #D1D5DB;
    color: #374151;
  }
  .vessel-btn-secondary:hover {
    background: #F3F4F6;
  }

  .vessel-badge {
    position: absolute; /* Relative to positioned parent or fixed if needed */
    background: #DC2626; /* Red-600 */
    color: white;
    border-radius: 9999px;
    padding: 2px 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    z-index: 1000;
    transform: translateY(-50%);
  }
`;

let shadowHost = null;
let shadowRoot = null;

function ensureShadowRoot() {
  if (shadowHost) return shadowRoot;

  shadowHost = document.createElement('div');
  shadowHost.id = 'vessel-extension-root';
  document.body.appendChild(shadowHost);

  // Create closed shadow DOM
  shadowRoot = shadowHost.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = STYLES;
  shadowRoot.appendChild(style);

  return shadowRoot;
}

export function createModal(titleText, contentHtml, buttons = []) {
  const root = ensureShadowRoot();
  const overlay = document.createElement('div');
  overlay.className = 'vessel-overlay';

  const modal = document.createElement('div');
  modal.className = 'vessel-modal';

  const title = document.createElement('div');
  title.className = 'vessel-title';
  title.textContent = titleText;

  const content = document.createElement('div');
  content.className = 'vessel-content';
  content.innerHTML = typeof contentHtml === 'string' ? contentHtml : '';
  if (contentHtml instanceof HTMLElement) content.appendChild(contentHtml);

  const actions = document.createElement('div');
  actions.className = 'vessel-actions';

  buttons.forEach(btnConfig => {
    const btn = document.createElement('button');
    btn.className = `vessel-btn ${btnConfig.primary ? 'vessel-btn-primary' : 'vessel-btn-secondary'}`;
    btn.textContent = btnConfig.text;
    btn.onclick = (e) => {
      if (btnConfig.onClick) btnConfig.onClick(e);
    };
    actions.appendChild(btn);
  });

  modal.appendChild(title);
  modal.appendChild(content);
  modal.appendChild(actions);
  overlay.appendChild(modal);

  return {
    show: () => root.appendChild(overlay),
    hide: () => {
      if (overlay.parentNode === root) root.removeChild(overlay);
    },
    element: overlay
  };
}

export function createBadge(number, onClick) {
  const root = ensureShadowRoot();
  const badge = document.createElement('div');
  badge.className = 'vessel-badge';
  badge.textContent = number;
  badge.addEventListener('click', onClick);

  return {
    show: () => root.appendChild(badge),
    hide: () => { if (badge.parentNode === root) root.removeChild(badge); },
    updatePosition: (rect) => {
      badge.style.position = 'fixed';
      badge.style.top = `${rect.top}px`;
      badge.style.left = `${rect.right}px`;
    },
    updateCount: (n) => { badge.textContent = n; }
  };
}

export function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
