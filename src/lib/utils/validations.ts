export type ValidationRule = (value: any) => string | true;

export const required = (message: string): ValidationRule => (value) => {
  if (value === null || value === undefined || value === "") return message;
  if (Array.isArray(value) && value.length === 0) return message;
  return true;
};

export const minLength = (length: number, message: string): ValidationRule => (value) => {
  if (!value || String(value).length < length) return message;
  return true;
};

export const maxLength = (length: number, message: string): ValidationRule => (value) => {
  if (value && String(value).length > length) return message;
  return true;
};

export const email = (message: string): ValidationRule => (value) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (value && !emailRegex.test(value)) return message;
  return true;
};

export const pattern = (regex: RegExp, message: string): ValidationRule => (value) => {
  if (value && !regex.test(value)) return message;
  return true;
};
