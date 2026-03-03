export const getHttpStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") return undefined;

  const status = (error as { status?: unknown }).status;
  if (typeof status === "number") return status;

  const responseStatus = (error as { response?: { status?: unknown } }).response
    ?.status;
  if (typeof responseStatus === "number") return responseStatus;

  return undefined;
};

export const shouldRetry429 = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= 2) return false;
  return getHttpStatusCode(error) === 429;
};
