import { mlEngine } from './lib/ml-engine.js';
import { sanitizeDOM } from './lib/sanitizer.js';

// Initialize ML Engine on startup
(async () => {
    console.log('[VESSEL] Background Service Worker Starting...');
    await mlEngine.initialize();
    console.log('[VESSEL] ML Engine Ready.');
})();

// Message Handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Return true to indicate async response
    handleMessage(request, sender).then(sendResponse);
    return true;
});

async function handleMessage(request, sender) {
    if (request.action === 'analyzePage') {
        return await analyzePage(request.html);
    }
    else if (request.action === 'analyzeSpec') {
        return await analyzeSpec(request.text);
    }
    else if (request.action === 'summarize') {
        return await mlEngine.summarize(request.text);
    }
}

/**
 * Analyzes page content for prompt injection.
 */
async function analyzePage(html) {
    try {
        console.log('[VESSEL] Sanitizing content...');
        const cleanText = sanitizeDOM(html);

        console.log('[VESSEL] Detecting injection...');
        const result = await mlEngine.detectInjection(cleanText);

        return result;
    } catch (err) {
        console.error('[VESSEL] Analysis error:', err);
        return { isThreat: false, error: err.message };
    }
}

/**
 * Analyzes spec text for missing security requirements.
 */
async function analyzeSpec(text) {
    if (!text) return { missingRequirements: [] };

    // Define standard security requirements to check for
    const SECURITY_REQUIREMENTS = [
        {
            category: "Authentication",
            keywords: ["login", "signin", "auth", "password", "mfa", "oauth", "sso"],
            description: "Verify user identity securely.",
            suggestion: "Ensure all user access requires multi-factor authentication (MFA). Use industry-standard protocols like OAuth2/OIDC. Never store passwords in plain text."
        },
        {
            category: "Authorization",
            keywords: ["role", "permission", "access control", "rbac", "scope"],
            description: "Enforce least privilege access.",
            suggestion: "Implement Role-Based Access Control (RBAC). Ensure users can only access data strictly necessary for their role."
        },
        {
            category: "Input Validation",
            keywords: ["sanitize", "validate", "input", "encoding", "escape"],
            description: "Prevent injection attacks.",
            suggestion: "Validate and sanitize all user inputs on the server side. Use parameterized queries to prevent SQL injection."
        },
        {
            category: "Encryption",
            keywords: ["encrypt", "tls", "ssl", "https", "hashing", "aes"],
            description: "Protect data at rest and in transit.",
            suggestion: "Encrypt sensitive data at rest using AES-256. Enforce TLS 1.3 for all data in transit. Do not hardcode encryption keys."
        }
    ];

    const missing = [];
    const lowerText = text.toLowerCase();

    // Mock Logic: Check if keywords are missing
    // In a real implementation, we would use NLI (Natural Language Inference) model
    // to check entailment: "Does this text entail [Requirement]?"

    for (const req of SECURITY_REQUIREMENTS) {
        const hasKeyword = req.keywords.some(k => lowerText.includes(k));

        // If no keywords found, assume it might be missing
        // (Very naive, but works for the "Check" logic in Task 6 plan)
        if (!hasKeyword) {
            // Basic heuristic: check if it returns a high score for "Not Relevant" 
            // or low score for existing.
            // For now, we simulate finding "missing" items.
            missing.push(req);
        }
    }

    return { missingRequirements: missing };
}
