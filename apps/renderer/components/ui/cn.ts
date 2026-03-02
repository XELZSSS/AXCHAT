type ClassValue = string | undefined | null | false;

export const cn = (...values: ClassValue[]): string => values.filter(Boolean).join(' ');
