/* ═══════════════════════════════════════════════════════════
   Feature Flags — Flavor-based configuration
   Mirrors Flutter's --dart-define-from-file flavor system.

   Usage:
     import { features, flavor } from '../config/features';
     if (features.editProfile) { ... }
     if (flavor === 'prd') { ... }

   Run with flavor:
     npm run dev          → a365 flavor (VITE_FEATURE_EDIT_PROFILE=true)
     npm run dev:prd      → prd flavor  (VITE_FEATURE_EDIT_PROFILE=false)
   ═══════════════════════════════════════════════════════════ */

/** Active flavor name: 'a365' | 'prd' | 'staging' | etc. */
export const flavor = import.meta.env.VITE_FLAVOR ?? 'a365';

/** Feature flags derived from the active flavor */
export const features = {
    /**
     * Whether users can edit their own profile.
     * - a365 flavor: true
     * - prd flavor:  false
     */
    editProfile: import.meta.env.VITE_FEATURE_EDIT_PROFILE !== 'false',
} as const;
