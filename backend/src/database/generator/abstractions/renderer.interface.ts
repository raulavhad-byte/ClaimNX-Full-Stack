/**
 * Base contract for all renderers.
 *
 * A renderer converts a model into a specific output format.
 */
export interface Renderer<TInput> {
  render(input: TInput): string;
}