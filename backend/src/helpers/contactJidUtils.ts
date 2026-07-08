const digitsOnly = (value: string): string =>
  String(value || "").replace(/\D/g, "");

export const isLikelyPhone = (value: string): boolean => {
  const digits = digitsOnly(value);
  return digits.length >= 10 && digits.length <= 13;
};

export const isLikelyLid = (value: string): boolean => {
  const digits = digitsOnly(value);
  return digits.length > 13;
};
