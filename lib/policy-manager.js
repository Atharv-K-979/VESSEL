/**
 * Policy Manager
 * Handles merging of Enterprise Managed Policies (chrome.storage.managed)
 * with Local User Preferences (chrome.storage.local).
 */

const DEFAULT_POLICY = {
    riskThreshold: 0.8,
    blockedSelectors: [
        'button[aria-label="Send message"]',
        'button[data-testid="send-button"]'
    ],
    customRequirements: [], // e.g. { category: "Internal Compliance", keywords: ["gdpr"], ... }
    forceBlock: false
};

class PolicyManager {
    constructor() {
        this.currentPolicy = { ...DEFAULT_POLICY };
    }

    /**
     * Loads policies from storage.
     * Priority: Managed > Local > Default
     */
    async loadPolicy() {
        try {
            // Get Managed
            const managed = await new Promise(resolve =>
                chrome.storage.managed ? chrome.storage.managed.get(null, resolve) : resolve({})
            ).catch(() => ({})); // Fail gracefully if not enterprise enrolled

            // Get Local
            const local = await new Promise(resolve =>
                chrome.storage.local.get(null, resolve)
            );

            // Merge: Default -> Local -> Managed (Managed wins)
            this.currentPolicy = {
                ...DEFAULT_POLICY,
                ...local,
                ...managed
            };

            // Ensure arrays are merged or overwritten based on strategy
            // Strategy: Overwrite for simplicity in this demo
            if (managed.blockedSelectors) this.currentPolicy.blockedSelectors = managed.blockedSelectors;
            else if (local.blockedSelectors) this.currentPolicy.blockedSelectors = local.blockedSelectors;

            console.log('[VESSEL] Policy Loaded:', this.currentPolicy);

            // Sync effective policy back to local storage for content access if needed
            // (Though primarily content scripts should message background, or use storage.local if public)
            await chrome.storage.local.set({ effectivePolicy: this.currentPolicy });

        } catch (err) {
            console.error('[VESSEL] Failed to load policy:', err);
        }

        return this.currentPolicy;
    }

    get() {
        return this.currentPolicy;
    }
}

export const policyManager = new PolicyManager();
