import { MetadataDefinition } from './metadata-definition.interface';

/**
 * Provides metadata definitions for the platform.
 */
export interface MetadataProvider {
  /**
   * Returns all metadata definitions.
   */
  getDefinitions(): ReadonlyArray<MetadataDefinition>;
}