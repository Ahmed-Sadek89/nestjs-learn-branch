import { FindManyOptions, ObjectLiteral, Repository } from 'typeorm';

export type PaginationQuery = {
  page?: number;
  limit?: number;
};

export type PaginatedResult<T> = {
  page: number;
  limit: number;
  totalPage: number;
  total: number;
  data: T[];
};

/**
 * Generic TypeORM pagination helper.
 * Returns { page, limit, totalPage, total, data }.
 */
export async function paginate<T extends ObjectLiteral>(
  repo: Repository<T>,
  query: PaginationQuery = {},
  options: FindManyOptions<T> = {},
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Number(query.limit) || 10);
  const skip = (page - 1) * limit;

  const [data, total] = await repo.findAndCount({
    ...options,
    skip,
    take: limit,
  });

  return {
    page,
    limit,
    totalPage: total === 0 ? 0 : Math.ceil(total / limit),
    total,
    data,
  };
}
