// Two-pass validate + atomic write for configuration import.
// Pass 1: walk schema, collect { key, value } pairs and error strings.
// Pass 2: if no error strings, write all collected pairs to target; else return errors without touching target.
// Warnings (clamped values) are included in the return array but do NOT block the write.

function getActualType(value) {
	if (value === null) return 'null';
	if (Array.isArray(value)) {
		if (value.length === 0) return 'array';
		const elementType = typeof value[0];
		return `${elementType}[]`;
	}
	return typeof value;
}

function typeMatches(value, expectedType) {
	if (expectedType === 'int') {
		return Number.isInteger(value);
	}
	if (expectedType === 'float') {
		return typeof value === 'number' && !Number.isNaN(value);
	}
	if (expectedType === 'bool') {
		return typeof value === 'boolean';
	}
	if (expectedType === 'string') {
		return typeof value === 'string';
	}
	if (expectedType === 'int[]') {
		return Array.isArray(value) && value.every(v => Number.isInteger(v));
	}
	if (expectedType === 'float[]') {
		return Array.isArray(value) && value.every(v => typeof v === 'number' && !Number.isNaN(v));
	}
	if (expectedType === 'bool[]') {
		return Array.isArray(value) && value.every(v => typeof v === 'boolean');
	}
	return false;
}

function getScalarType(arrayType) {
	// 'int[]' -> 'int', 'float[]' -> 'float', etc.
	return arrayType.slice(0, -2);
}

function clampScalar(value, type, min, max) {
	if (type === 'float' || type === 'int') {
		if (min !== undefined && value < min) return min;
		if (max !== undefined && value > max) return max;
	}
	return value;
}

function validateAndApply(schema, source, target) {
	const errors = [];
	const warnings = [];
	const pending = [];

	// Pass 1: validate and collect
	// Clamped-value messages go into warnings; type mismatches, length errors,
	// and required-missing go into errors.
	for (const descriptor of schema) {
		const { key, type, required, min, max, minLength, maxLength, exactLength, default: _ } = descriptor;
		const sourceValue = source[key];

		// Check if required field is missing
		if (required && sourceValue === undefined) {
			errors.push(`${key}: required field missing`);
			continue;
		}

		// Skip validation if field is absent and not required
		if (sourceValue === undefined) {
			continue;
		}

		// Type check
		if (!typeMatches(sourceValue, type)) {
			const actualType = getActualType(sourceValue);
			errors.push(`${key}: expected ${type}, got ${actualType}`);
			continue;
		}

		// Type-specific validation
		if (type === 'int' || type === 'float') {
			let clampedValue = sourceValue;
			if (min !== undefined && sourceValue < min) {
				clampedValue = min;
				warnings.push(`${key}: ${sourceValue} out of range ${min}–${max ?? 'unlimited'}, clamped to ${clampedValue}`);
			}
			if (max !== undefined && sourceValue > max) {
				clampedValue = max;
				warnings.push(`${key}: ${sourceValue} out of range ${min ?? 'unlimited'}–${max}, clamped to ${clampedValue}`);
			}
			pending.push({ key, value: clampedValue });
		} else if (type === 'bool' || type === 'string') {
			pending.push({ key, value: sourceValue });
		} else if (type === 'int[]' || type === 'float[]' || type === 'bool[]') {
			// Array field: check length and element-level constraints
			let hasArrayError = false;
			const scalarType = getScalarType(type);
			const processedArray = [];

			// Process array elements for range clamping
			for (let i = 0; i < sourceValue.length; i++) {
				const element = sourceValue[i];
				let clampedElement = element;

				if ((type === 'float[]' || type === 'int[]') && (min !== undefined || max !== undefined)) {
					if (min !== undefined && element < min) {
						clampedElement = min;
						warnings.push(`${key}[${i}]: ${element} out of range ${min}–${max ?? 'unlimited'}, clamped to ${clampedElement}`);
					} else if (max !== undefined && element > max) {
						clampedElement = max;
						warnings.push(`${key}[${i}]: ${element} out of range ${min ?? 'unlimited'}–${max}, clamped to ${clampedElement}`);
					}
				}
				processedArray.push(clampedElement);
			}

			// Check minLength
			if (minLength !== undefined && sourceValue.length < minLength) {
				errors.push(`${key}: length ${sourceValue.length} does not meet minLength ${minLength}`);
				hasArrayError = true;
			}

			// Check maxLength
			if (maxLength !== undefined && sourceValue.length > maxLength) {
				errors.push(`${key}: length ${sourceValue.length} exceeds maxLength ${maxLength}`);
				hasArrayError = true;
			}

			// Check exactLength
			if (exactLength !== undefined) {
				const refValue = source[exactLength];
				// Only check if the referenced field exists and is a valid integer
				if (refValue !== undefined && Number.isInteger(refValue)) {
					if (sourceValue.length !== refValue) {
						errors.push(`${key}: length ${sourceValue.length} does not match ${exactLength} (${refValue})`);
						hasArrayError = true;
					}
				}
				// If reference is missing or invalid, silently skip the length check
			}

			if (!hasArrayError) {
				pending.push({ key, value: processedArray });
			}
		}
	}

	// Pass 2: write atomically only if there are no hard errors.
	// Warnings (clamped values) do not block the write.
	if (errors.length === 0) {
		for (const { key, value } of pending) {
			target[key] = value;
		}
		return [...warnings];
	}

	return [...errors, ...warnings];
}

function serialize(schema, source) {
	const result = {};

	for (const descriptor of schema) {
		const { key, default: defaultValue } = descriptor;
		if (source[key] !== undefined) {
			result[key] = source[key];
		} else if (defaultValue !== undefined) {
			result[key] = defaultValue;
		}
	}

	return result;
}

export { validateAndApply, serialize };
