import { useState, useEffect } from 'react';
import authClient from '../lib/auth-client';
import { APP_ID } from '../lib/auth-token';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface PasswordRequirement {
    label: string;
    check: (value: string) => boolean;
}

/** Parses a regex policy string into human-readable requirement checkers — mirrors Flutter's _parseRequirements */
function parseRequirements(policy: string): PasswordRequirement[] {
    if (!policy) return [];
    const result: PasswordRequirement[] = [];

    // Min length — matches {8,} or {8,16} or {8}
    const minLen = policy.match(/\{(\d+)(?:,\d*)?\}/);
    if (minLen) {
        const n = parseInt(minLen[1], 10);
        result.push({ label: `At least ${n} characters`, check: (v) => v.length >= n });
    }

    // Uppercase
    if (policy.includes('[A-Z]') || policy.includes('A-Z')) {
        result.push({ label: 'At least one uppercase letter (A–Z)', check: (v) => /[A-Z]/.test(v) });
    }

    // Lowercase
    if (policy.includes('[a-z]') || policy.includes('a-z')) {
        result.push({ label: 'At least one lowercase letter (a–z)', check: (v) => /[a-z]/.test(v) });
    }

    // Digit
    if (policy.includes('\\d') || policy.includes('[0-9]')) {
        result.push({ label: 'At least one number (0–9)', check: (v) => /\d/.test(v) });
    }

    // Special character
    if (
        policy.includes('[!@#$%^&*') ||
        policy.includes('[@$!%*?&]') ||
        policy.includes('\\W') ||
        policy.includes('[^a-zA-Z0-9]') ||
        policy.includes('[^A-Za-z0-9]')
    ) {
        result.push({
            label: 'At least one special character (!@#$%^&*…)',
            check: (v) => /[!@#$%^&*()_+\-=\[\]{};:'"|,.<>\/?]/.test(v),
        });
    }

    return result;
}

/** Fetches password policy from API and returns parsed requirements + the raw regex for validation */
export function usePasswordPolicy() {
    const [requirements, setRequirements] = useState<PasswordRequirement[]>([]);
    const [policyRegex, setPolicyRegex] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        authClient
            .get(`password-policy?appid=${APP_ID}`)
            .then((res) => {
                if (cancelled) return;
                const policy: string = res.data?.data?.policy || res.data?.policy || '';
                setPolicyRegex(policy);
                setRequirements(parseRequirements(policy));
            })
            .catch(() => { /* silently ignore — no policy means no checklist */ })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const validatePassword = (value: string): string | null => {
        if (!policyRegex) return null;
        return new RegExp(policyRegex).test(value) ? null : 'Password does not meet requirements.';
    };

    return { requirements, policyRegex, validatePassword, loading };
}
