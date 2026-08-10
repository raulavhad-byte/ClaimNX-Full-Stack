/**
 * Represents a named generator that can participate
 * in migration generation.
 */
export interface GeneratorRegistryItem {
  /**
   * Unique generator name.
   *
   * Examples:
   * permissions
   * organizations
   * hospitals
   */
  name: string;

  /**
   * Executes the generator.
   *
   * Returns the generated SQL.
   */
  generate(): string;
}