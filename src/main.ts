import { FetchHttpClient, type HttpClientConfig } from "./Http";

// 0.2.0重构
export function createFetchHttpClient(config: HttpClientConfig = {}) {
  return new FetchHttpClient(config);
}

export type { HttpInterceptorFn } from "./interceptor";
export type { HttpRequest } from "./request/HttpRequest";
export { ResultErrorType } from "./backend/internal-error";
