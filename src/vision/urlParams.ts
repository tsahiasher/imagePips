/**
 * Checks whether the `?solve=1` or `?solve=true` URL query parameter is active.
 */
export function isSolveOptionEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const val = params.get('solve');
    return val === '1' || val === 'true';
  } catch {
    return false;
  }
}
