/**
 * Runtime debug diagnostics configuration for image import pipeline.
 *
 * Can be enabled via:
 * 1. Console command: `enableImportDebug()` or `window.DEBUG_IMPORT = true`
 * 2. URL parameter: `http://localhost:5174/?debug=true` or `?debug=1`
 * 3. LocalStorage: `localStorage.setItem('DEBUG_IMPORT', 'true')`
 */

export function isImportDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const win = window as unknown as { DEBUG_IMPORT?: boolean; __DEBUG_IMPORT__?: boolean };
    return Boolean(
      win.DEBUG_IMPORT ||
      win.__DEBUG_IMPORT__ ||
      localStorage.getItem('DEBUG_IMPORT') === 'true' ||
      localStorage.getItem('DEBUG_IMPORT') === '1' ||
      (typeof window.location !== 'undefined' && (
        window.location.search.includes('debug=true') ||
        window.location.search.includes('debug=1')
      ))
    );
  } catch {
    return false;
  }
}

// Expose convenient helper functions on window for developer console usage
if (typeof window !== 'undefined') {
  const win = window as unknown as {
    enableImportDebug?: (enable?: boolean) => void;
    disableImportDebug?: () => void;
    DEBUG_IMPORT?: boolean;
  };

  win.enableImportDebug = (enable = true) => {
    if (enable) {
      localStorage.setItem('DEBUG_IMPORT', 'true');
      win.DEBUG_IMPORT = true;
      console.log(
        '%c[DEBUG_IMPORT] Enabled! Full badge, region, and domino diagnostics will log on next image upload/import.',
        'color: #0284c7; font-weight: bold;'
      );
    } else {
      win.disableImportDebug?.();
    }
  };

  win.disableImportDebug = () => {
    localStorage.removeItem('DEBUG_IMPORT');
    win.DEBUG_IMPORT = false;
    console.log(
      '%c[DEBUG_IMPORT] Disabled. Diagnostic logs silenced.',
      'color: #64748b; font-style: italic;'
    );
  };
}
