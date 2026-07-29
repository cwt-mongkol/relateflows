// Lightweight input validation — validates request body against a schema
// Usage:
//   validate({
//     name: { required: true, type: 'string', maxLength: 200 },
//     email: { required: true, type: 'email' },
//     role_id: { type: 'number', min: 1, max: 5 },
//   })

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[a-zA-Z0-9_-]+$/;

export function validate(schema) {
  return (req, res, next) => {
    const errors = [];
    for (const [field, rules] of Object.entries(schema)) {
      const val = req.body[field];
      const isPresent = val !== undefined && val !== null && val !== '';

      if (rules.required && !isPresent) {
        errors.push({ field, message: `${field} is required` });
        continue;
      }
      if (!isPresent) continue;

      if (rules.type === 'string' && typeof val !== 'string') {
        errors.push({ field, message: `${field} must be a string` });
        continue;
      }
      if (rules.type === 'string' && typeof val === 'string') {
        if (rules.trim !== false) req.body[field] = val.trim();
        const trimmed = req.body[field];
        if (rules.minLength != null && trimmed.length < rules.minLength) {
          errors.push({ field, message: `${field} must be at least ${rules.minLength} characters` });
        }
        if (rules.maxLength != null && trimmed.length > rules.maxLength) {
          errors.push({ field, message: `${field} must be at most ${rules.maxLength} characters` });
        }
        if (rules.pattern && !rules.pattern.test(trimmed)) {
          errors.push({ field, message: `${field} format is invalid` });
        }
      }

      if (rules.type === 'email') {
        const emailVal = String(val).trim();
        if (!EMAIL_RE.test(emailVal)) {
          errors.push({ field, message: 'Invalid email format' });
        }
        req.body[field] = emailVal.toLowerCase();
      }

      if (rules.type === 'number') {
        const num = Number(val);
        if (isNaN(num)) {
          errors.push({ field, message: `${field} must be a number` });
          continue;
        }
        if (rules.min != null && num < rules.min) {
          errors.push({ field, message: `${field} must be at least ${rules.min}` });
        }
        if (rules.max != null && num > rules.max) {
          errors.push({ field, message: `${field} must be at most ${rules.max}` });
        }
        req.body[field] = num;
      }

      if (rules.type === 'boolean') {
        if (typeof val !== 'boolean') {
          errors.push({ field, message: `${field} must be a boolean` });
        }
      }

      if (rules.type === 'array' && !Array.isArray(val)) {
        errors.push({ field, message: `${field} must be an array` });
      }

      if (rules.type === 'object' && (typeof val !== 'object' || Array.isArray(val) || val === null)) {
        errors.push({ field, message: `${field} must be an object` });
      }

      if (rules.oneOf && !rules.oneOf.includes(val)) {
        errors.push({ field, message: `${field} must be one of: ${rules.oneOf.join(', ')}` });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    next();
  };
}

// Sanitize: strip known-dangerous fields from request body
const SENSITIVE_FIELDS = ['is_admin', 'isSuperAdmin', 'role_id', 'tenant_id'];

export function stripSensitiveFields(req, res, next) {
  for (const field of SENSITIVE_FIELDS) {
    delete req.body[field];
  }
  next();
}
