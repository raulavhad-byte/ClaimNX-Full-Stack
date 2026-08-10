/**
 * Represents the output of a database generator.
 */
export interface GenerationResult {
  /**
   * Logical name of the generation.
   *
   * Example:
   * permissions
   * organizations
   * hospitals
   */
  name: string;

  /**
   * Sections of generated statements.
   */
  sections: GenerationSection[];
}

/**
 * Represents one logical section.
 */
export interface GenerationSection {
  /**
   * Display title.
   */
  title: string;

  /**
   * SQL statements.
   */
  statements: string[];
}