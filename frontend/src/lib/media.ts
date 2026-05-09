const API_ORIGIN = import.meta.env.VITE_API_URL
  ? String(import.meta.env.VITE_API_URL).replace(/\/api\/?$/, '').replace(/\/$/, '')
  : '';
const isLocalhostApiOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(API_ORIGIN);

function shouldUseStorageProxy(): boolean {
  return (
    API_ORIGIN === '' ||
    (typeof window !== 'undefined' &&
      isLocalhostApiOrigin &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1')
  );
}

export function resolvePublicAssetUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/storage\//i.test(value) && shouldUseStorageProxy()) {
    try {
      return new URL(value).pathname;
    } catch {
      return value.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, '');
    }
  }

  if (/^(blob:|data:|https?:\/\/)/i.test(value)) {
    return value;
  }

  if (value.startsWith('/')) {
    return API_ORIGIN && !shouldUseStorageProxy() ? `${API_ORIGIN}${value}` : value;
  }

  return API_ORIGIN && !shouldUseStorageProxy() ? `${API_ORIGIN}/${value}` : `/${value}`;
}
