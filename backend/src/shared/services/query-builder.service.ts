import { Injectable } from '@nestjs/common';

import { QueryBuilderOptions } from '../repository/repository-options.interface';

@Injectable()
export class QueryBuilderService {
  build(query: any, options: QueryBuilderOptions): any {
    const {
      search,
      searchableColumns = [],
      filters = {},
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = options;

    // Search
    if (search && searchableColumns.length > 0) {
      const expression = searchableColumns
        .map((column) => `${column}.ilike.%${search}%`)
        .join(',');

      query = query.or(expression);
    }

    // Exact filters
    Object.entries(filters).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        query = query.eq(key, value);
      }
    });

    // Sorting
    query = query.order(sortBy, {
      ascending: sortOrder === 'asc',
    });

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to);

    return query;
  }
}