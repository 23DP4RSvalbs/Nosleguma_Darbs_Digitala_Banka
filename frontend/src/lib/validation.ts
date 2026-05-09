export const PERSON_NAME_PATTERN = /^(?=.{1,20}$)[A-Za-zĀ-ž]+(?:\s+[A-Za-zĀ-ž]+)+\s*$/u;
export const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;
export const MAX_TRANSFER_AMOUNT = 999_999_999_999.99;

export function sanitizePersonName(value: string): string {
  return value
    .replace(/[^A-Za-zĀ-ž\s]/gu, '')
    .replace(/\s+/g, ' ')
    .slice(0, 20);
}

export function sanitizeAccountName(value: string): string {
  return value.replace(/[<>{}[\]"]/g, '').replace(/\s+/g, ' ').slice(0, 80);
}

export function sanitizePlainText(value: string, maxLength: number): string {
  return value.replace(/[<>{}]/g, '').slice(0, maxLength);
}

export function sanitizePhone(value: string): string {
  return value.replace(/[^\d\s-]/g, '').slice(0, 24);
}

export function sanitizePostalCode(value: string): string {
  return value.replace(/[^A-Za-z0-9\s-]/g, '').slice(0, 20);
}

export function normalizeIban(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 34);
}
