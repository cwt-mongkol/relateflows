// Shared condition-matching logic for automation.js (workflow engine) and leadScoring.js (scoring rules) —
// both evaluate the same { field, operator, value } shape against an event payload.

export function evaluateCondition(payload, cond) {
  const { field, operator, value } = cond || {};
  if (!field) return true;
  const actual = payload[field];
  if (actual === undefined || actual === null) return false;
  switch (operator) {
    case 'eq': return String(actual) === String(value);
    case 'neq': return String(actual) !== String(value);
    case 'gt': return Number(actual) > Number(value);
    case 'gte': return Number(actual) >= Number(value);
    case 'lt': return Number(actual) < Number(value);
    case 'lte': return Number(actual) <= Number(value);
    case 'contains': return String(actual).toLowerCase().includes(String(value).toLowerCase());
    default: return false;
  }
}

export function evaluateConditions(payload, conditions) {
  if (!Array.isArray(conditions) || conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(payload, c));
}
