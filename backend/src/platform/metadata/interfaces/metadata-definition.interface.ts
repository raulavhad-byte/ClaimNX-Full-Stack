/**
 * Base contract for all ClaimNX metadata definitions.
 *
 * Every business module (IAM, Organization, Hospital, etc.)
 * implements this interface.
 */
export interface MetadataDefinition {
  /**
   * Unique metadata name.
   *
   * Example:
   * permissions
   * organizations
   * hospitals
   */
  readonly name: string;

  /**
   * Metadata version.
   */
  readonly version: string;
}