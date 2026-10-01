/**
 * Normalised API error. The backend's exact error envelope is not verified in
 * the current contract, so parsing is defensive: we look for a string
 * `message` (top-level or under `error`) and never surface raw bodies to users.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
  get isForbidden(): boolean {
    return this.status === 403;
  }
  get isNotFound(): boolean {
    return this.status === 404;
  }
}

const FALLBACK: Record<number, string> = {
  400: "That request wasn't valid. Check the details and try again.",
  401: "Your session has expired. Please sign in again.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  409: "That conflicts with existing data.",
  429: "Too many requests. Please slow down and retry shortly.",
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function parseErrorBody(status: number, body: unknown): ApiError {
  let message: string | undefined;
  let code: string | undefined;
  let details: unknown;

  if (isRecord(body)) {
    const err = isRecord(body.error) ? body.error : body;
    if (typeof err.message === "string") message = err.message;
    if (typeof err.code === "string") code = err.code;
    details = err.details ?? err.errors;
  }

  const safe =
    message && status < 500
      ? message
      : (FALLBACK[status] ?? "Something went wrong on our side. Please try again.");
  return new ApiError(status, safe, code, details);
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) return "Can't reach the server. Check your connection and try again.";
  return "Something went wrong. Please try again.";
}
