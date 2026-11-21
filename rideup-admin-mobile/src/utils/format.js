export const fmtDate = (value) => (value ? value.substring(0, 10) : '—');

export const fmtDateTime = (value) => (value ? value.substring(0, 16).replace('T', ' ') : '—');

export const fmtNumber = (value) => Number(value || 0).toLocaleString('vi-VN');

export const fmtVnd = (value) => {
  const number = Number(value || 0);
  if (number >= 1000000000) return `${(number / 1000000000).toFixed(1)} tỷ`;
  if (number >= 1000000) return `${(number / 1000000).toFixed(1)} triệu`;
  return `${Math.round(number).toLocaleString('vi-VN')} đ`;
};

export const initialsOf = (name) => {
  const text = (name || '').trim();
  if (!text) return 'A';
  const parts = text.split(/\s+/);
  return parts[parts.length - 1].charAt(0).toUpperCase();
};
