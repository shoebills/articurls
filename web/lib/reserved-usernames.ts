/** Single-segment routes that must not be treated as public usernames */
export const RESERVED_USERNAMES = new Set(
  [
    "login",
    "signup",
    "verify",
    "dashboard",
    "analytics",
    "billing",
    "settings",
    "forgot-password",
    "reset-password",
    "api",
    "_next",
    "favicon.ico",
  ].map((s) => s.toLowerCase())
);

export function isReservedUsername(name: string): boolean {
  return RESERVED_USERNAMES.has(name.toLowerCase());
}
