import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to check if a language is RTL (Right-to-Left)
export function isRTL(language: string): boolean {
  return language === 'arab' || language === 'il';
}
