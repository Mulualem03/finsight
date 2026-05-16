const GBP = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

/** Format a pence amount (passed as string or bigint) to a GBP currency string. */
export function formatMoney(pence: string | bigint, options: { signed?: boolean } = {}): string {
  const big = typeof pence === 'string' ? BigInt(pence) : pence;
  const pounds = Number(big) / 100;
  const formatted = GBP.format(Math.abs(pounds));
  if (options.signed) {
    return big < 0n ? `−${formatted}` : `+${formatted}`;
  }
  return big < 0n ? `−${formatted}` : formatted;
}

/** Pence as a signed plain number - for charts. */
export function penceToPounds(pence: string | bigint): number {
  const big = typeof pence === 'string' ? BigInt(pence) : pence;
  return Number(big) / 100;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((today.getTime() - date.getTime()) / msPerDay);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(iso);
}
