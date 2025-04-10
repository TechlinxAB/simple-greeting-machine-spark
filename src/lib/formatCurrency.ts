
/**
 * Format a number as SEK currency
 * @param amount The amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  const numberAmount = typeof amount === 'string' ? parseFloat(amount) : amount || 0;
  
  return new Intl.NumberFormat('sv-SE', { 
    style: 'currency', 
    currency: 'SEK'
  }).format(numberAmount);
}
