declare module 'graphql-depth-limit' {
  import { ValidationRule } from 'graphql';

  interface DepthLimitOptions {
    ignore?: (string | RegExp | ((queryDepths: Record<string, number>) => boolean))[];
  }

  function depthLimit(
    maxDepth: number,
    options?: DepthLimitOptions,
    callback?: (depths: Record<string, number>) => void
  ): ValidationRule;

  export default depthLimit;
}
