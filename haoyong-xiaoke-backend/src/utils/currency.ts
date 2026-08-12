/**
 * 金额转换工具
 * 统一使用分作为内部存储单位，输出给前端时转换为元
 */

type NumericLike = number | string | { toNumber: () => number };

const normalizeNumeric = (value: NumericLike): number => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return parseFloat(value);
  }

  return value.toNumber();
};

/**
 * 将元转换为分（存储用）
 * @param yuan 金额（元），可以是 number、string 或 Decimal
 * @returns 金额（分）整数
 */
export const yuanToFen = (yuan: NumericLike | null | undefined): number | null => {
  if (yuan === null || yuan === undefined) {
    return null;
  }

  const num = normalizeNumeric(yuan);

  if (isNaN(num)) {
    return null;
  }

  // 避免浮点精度问题，先乘 100 再四舍五入
  return Math.round(num * 100);
};

/**
 * 将分转换为元（输出用）
 * @param fen 金额（分）整数
 * @returns 金额（元），保留两位小数的字符串或 null
 */
export const fenToYuan = (fen: NumericLike | null | undefined): string | null => {
  if (fen === null || fen === undefined) {
    return null;
  }

  // 先转换为字符串，确保精度
  const yuan = normalizeNumeric(fen) / 100;
  return yuan.toFixed(2);
};

/**
 * 将分转换为元的数字形式（计算用）
 * @param fen 金额（分）整数
 * @returns 金额（元）数字或 null
 */
export const fenToYuanNumber = (fen: NumericLike | null | undefined): number | null => {
  if (fen === null || fen === undefined) {
    return null;
  }

  return normalizeNumeric(fen) / 100;
};
