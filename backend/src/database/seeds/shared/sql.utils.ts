/**
 * Utility methods for safely rendering SQL literals.
 *
 * These methods only format values for SQL generation.
 * They do not execute SQL.
 */
export class SqlUtils {
  /**
   * Escapes a string for use in a SQL string literal.
   */
  static escape(value: string): string {
    return value.replace(/'/g, "''");
  }

  /**
   * Formats a string as a SQL string literal.
   *
   * Example:
   * Hello -> 'Hello'
   */
  static string(value: string): string {
    return `'${this.escape(value)}'`;
  }

  /**
   * Formats a boolean.
   */
  static boolean(value: boolean): string {
    return value ? 'TRUE' : 'FALSE';
  }

  /**
   * Formats a nullable string.
   */
  static nullable(value?: string | null): string {
    return value == null ? 'NULL' : this.string(value);
  }

  /**
   * Formats a number.
   */
  static number(value: number): string {
    return value.toString();
  }
}