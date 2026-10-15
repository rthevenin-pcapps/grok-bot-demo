export const TAX_RATE = 0.08;

const currencyFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function roundCurrency(amount) {
  return Math.round(amount * 100) / 100;
}

export function formatCurrency(amount) {
  return currencyFormat.format(amount);
}

export function invoiceNumber(project, issuedOn) {
  return `INV-${project.code}-${issuedOn.replaceAll('-', '')}`;
}

export function buildInvoice(project, entries, options = {}) {
  const issuedOn = options.issuedOn ?? new Date().toISOString().slice(0, 10);
  const taxRate = options.taxRate ?? TAX_RATE;

  const lineItems = entries.map((entry) => ({
    date: entry.date,
    userId: entry.userId,
    description: entry.description,
    hours: entry.hours,
    rate: project.hourlyRate,
    amount: roundCurrency(entry.hours * project.hourlyRate),
  }));

  const subtotal = roundCurrency(lineItems.map((item) => item.amount).reduce((a, b) => a + b));
  const tax = roundCurrency(subtotal * taxRate);

  return {
    number: invoiceNumber(project, issuedOn),
    issuedOn,
    client: project.client,
    project: project.name,
    lineItems,
    subtotal,
    taxRate,
    tax,
    total: roundCurrency(subtotal + tax),
  };
}
