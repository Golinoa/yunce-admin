const REDACTED_TEXT = '[REDACTED]';

const SENSITIVE_KEYWORDS = [
  'password',
  'token',
  'refresh',
  'authorization',
  'secret',
  'cookie',
  'phone',
  'mobile',
  'code',
];

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Object.prototype.toString.call(value) === '[object Object]';
};

const isSensitiveKey = (key: string): boolean => {
  const normalizedKey = key.toLowerCase();
  return SENSITIVE_KEYWORDS.some((keyword) => normalizedKey.includes(keyword));
};

const maskPhone = (value: string): string => {
  if (value.length < 7) {
    return REDACTED_TEXT;
  }

  return `${value.slice(0, 3)}****${value.slice(-4)}`;
};

const redactByKey = (key: string, value: unknown): unknown => {
  if (!isSensitiveKey(key)) {
    return redact(value);
  }

  if (typeof value === 'string' && key.toLowerCase().includes('phone')) {
    return maskPhone(value);
  }

  return REDACTED_TEXT;
};

export const redact = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce<Record<string, unknown>>((result, [key, currentValue]) => {
      result[key] = redactByKey(key, currentValue);
      return result;
    }, {});
  }

  return value;
};

export { REDACTED_TEXT };
