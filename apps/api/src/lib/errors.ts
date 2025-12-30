/**
 * Error classes and utilities
 * 
 * Re-exports from http/middleware for backward compatibility.
 */

export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  InsufficientCreditsError,
  asyncHandler,
  errorHandler,
} from '../http/middleware';
