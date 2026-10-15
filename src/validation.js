export const MAX_HOURS_PER_ENTRY = 24;
export const MAX_DESCRIPTION_LENGTH = 500;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function validateEntry(input, { projects = [], users = [] } = {}) {
  const errors = {};

  if (!projects.some((p) => p.id === input.projectId)) {
    errors.projectId = 'Choose a project.';
  }

  if (!users.some((u) => u.id === input.userId)) {
    errors.userId = 'Unknown user.';
  }

  if (!isValidDate(input.date)) {
    errors.date = 'Enter a valid date (YYYY-MM-DD).';
  }

  if (typeof input.hours !== 'number' || Number.isNaN(input.hours)) {
    errors.hours = 'Hours must be a number.';
  } else if (input.hours > MAX_HOURS_PER_ENTRY) {
    errors.hours = `Hours cannot exceed ${MAX_HOURS_PER_ENTRY} per entry.`;
  }

  const description = typeof input.description === 'string' ? input.description.trim() : '';
  if (!description) {
    errors.description = 'Add a short description.';
  } else if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Keep the description under ${MAX_DESCRIPTION_LENGTH} characters.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
