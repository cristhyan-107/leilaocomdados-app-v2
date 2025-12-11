
export const formatCurrencyShort = (value: number): string => {
  if (Math.abs(value) >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`.replace('.', ',');
  }
  if (Math.abs(value) >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(0)} Mil`;
  }
  return `R$ ${value.toFixed(0)}`;
};

export const formatCurrencyBRL = (value: number): string => {
  if (isNaN(value)) value = 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const parseCurrencyBRL = (value: string | number): number => {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;
    const numberString = value.replace(/R\$\s?/, '').replace(/\./g, '').replace(/,/, '.');
    const parsed = parseFloat(numberString);
    return isNaN(parsed) ? 0 : parsed;
};