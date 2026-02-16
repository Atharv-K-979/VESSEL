import { mlEngine } from './lib/ml-engine.js';
import { sanitizeDOM } from './lib/sanitizer.js';
import { policyManager } from './lib/policy-manager.js';

(async () => {
    console.log('[VESSEL] Background Service Worker Starting...');
    await Promise.all([
        mlEngine.initialize(),
        policyManager.loadPolicy()
    ]);
    console.log('[VESSEL] Services Ready (ML + Policy).');
})();

// Message Handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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

    // Merge with custom policy requirements
    const policy = policyManager.get();
    if (policy.customRequirements && Array.isArray(policy.customRequirements)) {
        SECURITY_REQUIREMENTS.push(...policy.customRequirements);
    }

    const missing = [];
    const lowerText = text.toLowerCase();

    for (const req of SECURITY_REQUIREMENTS) {
        const hasKeyword = req.keywords.some(k => lowerText.includes(k));
        if (!hasKeyword) {
            missing.push(req);
        }
    }

    return { missingRequirements: missing };
}
