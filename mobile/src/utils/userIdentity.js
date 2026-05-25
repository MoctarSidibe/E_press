// When a user registers without providing an email, the mobile app sends a
// synthetic placeholder so the backend's email-required schema accepts the
// signup ({phone}@phone.epress.local). The placeholder must never be shown in
// the UI — these helpers filter it out so profile screens fall back to phone.
//
// Long-term cleanup: make the email column nullable and drop this helper.

const SYNTHETIC_EMAIL_SUFFIX = '@phone.epress.local';

export function isSyntheticEmail(email) {
    if (!email || typeof email !== 'string') return true;
    return email.toLowerCase().endsWith(SYNTHETIC_EMAIL_SUFFIX);
}

/**
 * Returns the user's email iff it's a real address (not the synthetic phone
 * placeholder). Otherwise returns null.
 */
export function displayEmail(user) {
    const e = user?.email;
    return isSyntheticEmail(e) ? null : e;
}

/**
 * What to show as the user's primary identifier on profile/header rows:
 *   real email > phone > '—'
 */
export function displayIdentity(user) {
    return displayEmail(user) || user?.phone || '—';
}
