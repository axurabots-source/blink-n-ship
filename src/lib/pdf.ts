type PDFResult = {
  blob: Blob;
  url: string;
};

export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768;
}

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function userAgentIncludes(pattern: RegExp): boolean {
  if (typeof navigator === 'undefined') return false;
  return pattern.test(navigator.userAgent);
}

export function isSamsungBrowser(): boolean {
  return userAgentIncludes(/samsung/i);
}

export function isFirefox(): boolean {
  return userAgentIncludes(/firefox/i);
}

export async function fetchAsBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.statusText}`);
  return res.blob();
}

export async function extractPDFSource(response: Response): Promise<PDFResult> {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/pdf')) {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    return { blob, url };
  }

  const body = await response.json();

  if (body.labelUrl) {
    const blob = await fetchAsBlob(body.labelUrl);
    const url = URL.createObjectURL(blob);
    return { blob, url };
  }

  if (body.pdf) {
    const raw = atob(body.pdf);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    const blob = new Blob([arr], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    return { blob, url };
  }

  throw new Error('Unrecognised PDF response format');
}

export function openPDFOnMobile(blob: Blob, filename = 'labels.pdf'): void {
  const url = URL.createObjectURL(blob);

  if (isIOS() || isSamsungBrowser()) {
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function createPDFBlobURL(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function cleanupPDF(url: string): void {
  URL.revokeObjectURL(url);
}
