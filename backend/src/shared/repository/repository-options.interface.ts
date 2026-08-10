export type SortOrder = 'asc' | 'desc';

export interface RepositoryOptions {
  /**
   * Database table name
   */
  table: string;

  /**
   * Searchable columns
   */
  searchableColumns?: string[];

  /**
   * Default sorting column
   */
  defaultSortBy?: string;

  /**
   * Default sort direction
   */
  defaultSortOrder?: SortOrder;

  /**
   * Whether this table supports soft delete
   * Default: true
   */
  enableSoftDelete?: boolean;
}

export interface QueryBuilderOptions {
  /**
   * Search keyword
   */
  search?: string;

  /**
   * Columns used for search
   */
  searchableColumns?: string[];

  /**
   * Exact match filters
   */
  filters?: Record<string, any>;

  /**
   * Page number
   */
  page?: number;

  /**
   * Records per page
   */
  limit?: number;

  /**
   * Sort column
   */
  sortBy?: string;

  /**
   * Sort direction
   */
  sortOrder?: SortOrder;
}