/**
 * Shared account/password validation helpers.
 * Previously copy-pasted between ChangePassword.jsx and CreateAccount.jsx.
 */

export function getValidationBorder(isValid) {
  return isValid ? "border-green-500" : "border-red-500";
}

export function passwordsMatch(a, b) {
  return typeof a === "string" && a.length > 0 && a === b;
}

export function isValidAccountName(name) {
  if (!name || typeof name !== "string") return false;
  if (name.length > 63 || name.length < 1) return false;
  return /^[a-z0-9.-]+$/.test(name);
}
