/**
 * Best-effort "Chrome on Windows" label from a User-Agent. Display only: never used for any decision, and the raw string
 * stays available as a tooltip. Order matters (Edge and Chrome both contain "Chrome"; iOS UAs contain "Mac OS X").
 */
export function describeUserAgent(ua: string | null): string {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\/|CriOS\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /curl|node|axios|PostmanRuntime|undici/i.test(ua) ? "API client" : null;
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iOS/.test(ua) ? "iOS" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Linux|X11/.test(ua) ? "Linux" : null;
  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os ?? "Unknown device";
}
