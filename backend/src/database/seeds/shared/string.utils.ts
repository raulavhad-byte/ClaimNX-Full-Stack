/**
 * Common string transformation utilities.
 *
 * Used by:
 * - Permission Generator
 * - Organization Generator
 * - Hospital Generator
 * - Provider Generator
 * - Payer Generator
 * - Future SQL generators
 */
export class StringUtils {
  /**
   * Converts a string to kebab-case.
   *
   * Example:
   * Identity & Access -> identity-access
   * Executive Dashboard -> executive-dashboard
   */
  static toKebabCase(value: string): string {
    return value
      .trim()
      .replace(/&/g, 'and')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
      .toLowerCase();
  }

  /**
   * Converts a string to snake_case.
   *
   * Example:
   * Identity & Access -> identity_and_access
   * Display Order -> display_order
   */
  static toSnakeCase(value: string): string {
    return value
      .trim()
      .replace(/&/g, 'and')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  /**
   * Converts a string to camelCase.
   *
   * Example:
   * Permission Module -> permissionModule
   */
  static toCamelCase(value: string): string {
    const pascal = this.toPascalCase(value);

    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  /**
   * Converts a string to PascalCase.
   *
   * Example:
   * permission module -> PermissionModule
   */
  static toPascalCase(value: string): string {
    return value
      .trim()
      .replace(/&/g, ' And ')
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1).toLowerCase(),
      )
      .join('');
  }

  /**
   * Converts a string to Title Case.
   *
   * Example:
   * permission_module -> Permission Module
   * executive-dashboard -> Executive Dashboard
   */
  static toTitleCase(value: string): string {
    return value
      .replace(/[_-]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1).toLowerCase(),
      )
      .join(' ');
  }

  /**
   * Normalizes whitespace.
   */
  static normalize(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  /**
   * Checks whether a string is empty.
   */
  static isBlank(value?: string | null): boolean {
    return !value || value.trim().length === 0;
  }
}