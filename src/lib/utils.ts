import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitizes an email address for use in table names
 */
export function sanitizeEmailForTableName(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9]/g, '_');
}
