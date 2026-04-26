/**
 * Fallback for the "your salesman" surface across the customer portal.
 *
 * Used when a customer profile has no `created_by` link (legacy rows
 * predating the W1 migration), or when the linked salesman is missing
 * a contact name / phone. When `phone` is null, the Call button in
 * `<PortalTopBar>` hides itself.
 */
export const FALLBACK_SALESMAN: {
  name: string
  phone: string | null
} = {
  name: 'Your salesman',
  phone: null,
}
