# VESSEL - Browser Extension

VESSEL is a comprehensive security tool for developers using AI assistants. It operates entirely locally within the browser to protect against prompt injection, identify missing security requirements in specifications, and redact sensitive data from being pasted.

## Features

### 1. AI Prompt Injection Defense
*   **What it does:** Intercepts clicks on AI extension buttons (e.g., "Summarize", "Explain") to prevent malicious hidden instructions in the page content from manipulating the AI.
*   **How it works:** 
    *   Detects clicks on known AI triggers.
    *   Scans the page content for hidden text, comments, and suspicious attributes.
    *   Analyzes the content for prompt injection patterns.
    *   If a threat is detected, it blocks the action and shows a warning modal with a sanitized version of the content.

### 2. Secure Specification Assistant
*   **What it does:** Watches specification editors (Jira, Notion, Linear, etc.) to ensure security requirements are included.
*   **How it works:**
    *   Monitors typing in description fields.
    *   Analyzes the text for missing security categories (Authentication, Authorization, Encryption, Input Validation, etc.).
    *   Displays a non-intrusive badge if requirements are missing.
    *   Allows one-click injection of standard security requirement templates.

### 3. Paste Redactor
*   **What it does:** Prevents accidental pasting of sensitive data (API keys, PII, Credit Cards) into any input field.
*   **How it works:**
    *   Intercepts paste events globally.
    *   Scans clipboard text for sensitive patterns (Credit Cards, AWS Keys, Emails, IPs, etc.).
    *   If detected, blocks the paste and offers to **Redact** (replace with X's), **Cancel**, or **Proceed Anyway**.

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-repo/vessel-chrome-extension.git
    cd vessel-chrome-extension
    ```

2.  **Load into Chrome:**
    *   Open `chrome://extensions/`.
    *   Enable **Developer mode** (top right toggle).
    *   Click **Load unpacked**.
    *   Select the `vessel-chrome-extension` directory.

3.  **Usage:**
    *   The extension runs automatically in the background.
    *   Click the extension icon to view the dashboard with blockage stats and recent incidents.
    *   Right-click the icon and select **Options** (or click "Settings" in the popup) to configure features and sensitivity.

## Configuration

Go to the **Options** page to:
*   Enable/Disable specific features.
*   Adjust the **Threat Threshold** for AI prompt injection detection (0.1 - 1.0).
*   View the list of active sensitive data patterns.

## Development

*   **Manifest V3:** This extension uses the latest Chrome Extension Manifest V3.
*   **Local Processing:** All analysis happens locally using a lightweight mock ML engine (designed to be swapped with Transformers.js or Firefox ML API).
*   **Privacy:** No data is sent to external servers.

## License

MIT
