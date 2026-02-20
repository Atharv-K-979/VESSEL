
export function createStatsBadge(blocksToday, avgRiskScore) {
    const container = document.createElement('div');
    const shadow = container.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
    .stats-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 16px;
      padding: 20px;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      min-width: 280px;
      z-index: 10000;
    }
    .stats-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .stats-title {
      font-size: 18px;
      font-weight: 600;
      opacity: 0.9;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .stat-item {
      background: rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 12px;
      text-align: center;
    }
    .stat-value {
      font-size: 32px;
      font-weight: 700;
      line-height: 1.2;
    }
    .stat-label {
      font-size: 12px;
      opacity: 0.8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .incidents-section {
      margin-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.2);
      padding-top: 16px;
    }
    .incidents-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      opacity: 0.9;
    }
    .incident-item {
      background: rgba(0,0,0,0.2);
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 8px;
      font-size: 12px;
    }
    .incident-site {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .incident-details {
      display: flex;
      justify-content: space-between;
      opacity: 0.8;
    }
    .incident-risk {
      color: #ff6b6b;
      font-weight: 600;
    }
  `;

    const html = `
    <div class="stats-container">
      <div class="stats-header">
        <span class="stats-title">Human Error Firewall</span>
        <span>🛡️</span>
      </div>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">${blocksToday}</div>
          <div class="stat-label">Blocks Today</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${avgRiskScore}</div>
          <div class="stat-label">Avg Risk Score</div>
        </div>
      </div>
      <div class="incidents-section">
        <div class="incidents-title">RECENT INCIDENTS</div>
        <div id="incidents-list"></div>
      </div>
    </div>
  `;

    shadow.appendChild(style);

    const template = document.createElement('div');
    template.innerHTML = html;
    shadow.appendChild(template);

    return container;
}

export function createRequirementsModal(requirements, onInject, isConfigured = true) {
    const container = document.createElement('div');
    const shadow = container.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10001;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .modal-content {
      background: white;
      border-radius: 24px;
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      padding: 24px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .modal-title {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #1a1a1a;
    }
    .requirement-card {
      background: #f8f9fa;
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 16px;
      border-left: 4px solid;
    }
    .requirement-card.missing-auth { border-left-color: #f56565; }
    .requirement-card.missing-authz { border-left-color: #ed8936; }
    .requirement-card.missing-encryption { border-left-color: #48bb78; }
    .requirement-card.missing-validation { border-left-color: #4299e1; }
    .requirement-card.missing-audit { border-left-color: #9f7aea; }
    .requirement-card.missing-ratelimit { border-left-color: #ed64a6; }
    
    .requirement-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .requirement-category {
      font-weight: 600;
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 0.5px;
      color: #4a5568;
    }
    .requirement-confidence {
      font-size: 11px;
      background: rgba(0,0,0,0.05);
      padding: 2px 8px;
      border-radius: 12px;
    }
    .requirement-description {
      font-size: 14px;
      line-height: 1.5;
      color: #2d3748;
      margin-bottom: 12px;
    }
    .inject-button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .inject-button:hover {
      transform: translateY(-1px);
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 20px;
    }
    .accept-all-button {
      background: #48bb78;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 10px 20px;
      font-weight: 600;
      cursor: pointer;
    }
    .dismiss-button {
      background: transparent;
      border: 1px solid #cbd5e0;
      border-radius: 8px;
      padding: 10px 20px;
      cursor: pointer;
    }
  `;

    let requirementsHtml = '';
    requirements.forEach((req, index) => {
        let categoryClass = 'missing-auth';
        if (req.category.toLowerCase().includes('authz')) categoryClass = 'missing-authz';
        else if (req.category.toLowerCase().includes('encrypt')) categoryClass = 'missing-encryption';
        else if (req.category.toLowerCase().includes('valid')) categoryClass = 'missing-validation';
        else if (req.category.toLowerCase().includes('audit')) categoryClass = 'missing-audit';
        else if (req.category.toLowerCase().includes('rate')) categoryClass = 'missing-ratelimit';

        requirementsHtml += `
      <div class="requirement-card ${categoryClass}">
        <div class="requirement-header">
          <span class="requirement-category">MISSING: ${req.category.toUpperCase()}</span>
          <span class="requirement-confidence">${Math.round(req.confidence * 100)}% match</span>
        </div>
        <div class="requirement-description">${req.description}</div>
        <button class="inject-button" data-index="${index}">+ Inject</button>
      </div>
    `;
    });

    let warningHtml = '';
    if (!isConfigured) {
        warningHtml = `
            <div style="background-color: #FFFBEB; border: 1px solid #FCD34D; color: #92400E; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 13px;">
                <strong>⚠️ AI Not Configured</strong><br>
                Please set your Gemini API Key in the extension settings to generate specific requirements. Using generic defaults.
                <br><a href="#" id="open-settings-link" style="color: #B45309; text-decoration: underline;">Open Settings</a>
            </div>
        `;
    }

    const html = `
    <div class="modal-overlay">
      <div class="modal-content">
        <div class="modal-title">Security Requirements Assistant</div>
        ${warningHtml}
        <div class="requirements-list">
          ${requirementsHtml}
        </div>
        <div class="modal-actions">
          <button class="dismiss-button">Dismiss</button>
          <button class="accept-all-button">Accept All</button>
        </div>
      </div>
    </div>
  `;

    shadow.appendChild(style);

    const template = document.createElement('div');
    template.innerHTML = html;
    shadow.appendChild(template);

    const settingsLink = shadow.getElementById('open-settings-link');
    if (settingsLink) {
        settingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage();
            } else {
                window.open(chrome.runtime.getURL('options.html'));
            }
        });
    }

    shadow.querySelectorAll('.inject-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            onInject(requirements[index].description);
            container.remove();
        });
    });

    shadow.querySelector('.dismiss-button').addEventListener('click', () => {
        container.remove();
    });

    shadow.querySelector('.accept-all-button').addEventListener('click', () => {
        const allText = requirements.map(r => r.description).join('\n\n');
        onInject(allText);
        container.remove();
    });

    return container;
}

export function createBadge(count, onClick) {
    const badge = document.createElement('div');
    Object.assign(badge.style, {
        position: 'absolute',
        background: '#e53e3e',
        color: 'white',
        borderRadius: '50%',
        width: '24px',
        height: '24px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '12px',
        fontWeight: 'bold',
        cursor: 'pointer',
        zIndex: '1000',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    });
    badge.textContent = count;
    badge.title = `${count} missing security requirements`;
    badge.addEventListener('click', onClick);
    return badge;
}

export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
