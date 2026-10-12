import { AiJsonSchema } from '../../core/models/ai.model';
import { readPath } from './ai-options.service';

export function isEmptyValue(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

export function missingRequired(schema: AiJsonSchema | null | undefined, values: unknown, parent: string[] = []): string[] {
  if (!schema?.properties) {
    return [];
  }
  const required = new Set(schema.required ?? []);
  const missing: string[] = [];
  for (const [key, property] of Object.entries(schema.properties)) {
    const path = [...parent, key];
    const value = readPath(values, path.join('.'));
    if (property.type === 'object' && property.properties) {
      if (required.has(key) || (value !== undefined && value !== null)) {
        missing.push(...missingRequired(property, values, path));
      }
    } else if (required.has(key) && isEmptyValue(value)) {
      missing.push(path.join('.'));
    }
  }
  return missing;
}
