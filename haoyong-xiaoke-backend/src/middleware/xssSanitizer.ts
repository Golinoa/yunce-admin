/**
 * XSS 防护中间件 - 对请求体中的字符串值进行 HTML 实体转义
 * 防止存储型 XSS 攻击
 */
import { Request, Response, NextFunction } from 'express';

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
};

const escapeHtml = (str: string): string =>
  str.replace(/[&<>"']/g, (char) => ESCAPE_MAP[char] || char);

const sanitizeValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return escapeHtml(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }
  return value;
};

export const xssSanitizer = (_req: Request, _res: Response, next: NextFunction): void => {
  if (_req.body && typeof _req.body === 'object') {
    _req.body = sanitizeValue(_req.body);
  }
  next();
};
