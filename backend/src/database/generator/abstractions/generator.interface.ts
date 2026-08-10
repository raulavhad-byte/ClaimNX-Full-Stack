/**
 * Base contract for all database generators.
 *
 * A generator produces a strongly typed model that can later
 * be rendered into SQL, JSON, Markdown, etc.
 */
export interface Generator<TResult> {
  generate(): TResult;
}