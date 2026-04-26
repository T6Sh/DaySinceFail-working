// Allowed email providers for account creation.
// Currently restricted to Gmail and Yahoo per product policy.
const ALLOWED_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.co.in",
  "yahoo.co.jp",
  "yahoo.fr",
  "yahoo.de",
  "yahoo.es",
  "yahoo.it",
  "yahoo.ca",
  "yahoo.com.au",
  "yahoo.com.br",
  "ymail.com",
  "rocketmail.com",
]);

export function emailDomain(email: string): string {
  return email.trim().toLowerCase().split("@")[1] ?? "";
}

export function isAllowedSignupEmail(email: string): boolean {
  return ALLOWED_DOMAINS.has(emailDomain(email));
}

export const ALLOWED_EMAIL_HINT = "Only Gmail and Yahoo addresses are allowed.";
export const INVALID_EMAIL_MESSAGE = "Enter a valid email";
