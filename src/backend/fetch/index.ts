import { HttpRequest } from "@/request/HttpRequest";
import { HttpResponse } from "@/response/HttpResponse";
import { timeout as timeoutWrapper } from "./timeout";
import type { CommonConfig, HttpResult, IHttpBackend } from "../base";
import { ResultError, ResultErrorType } from "../internal-error";

function createRequestInit(request: HttpRequest) {
  const headers = new Headers(request.headers);

  if (request.body instanceof FormData) {
    headers.delete("Content-Type");
  }

  return new Request(request.url, {
    method: request.method,
    headers,
    body: request.body,
    // @ts-ignore - Temporary ignore for duplex type
    duplex: request.body instanceof ReadableStream ? "half" : undefined,
    credentials: request.credentials,
    mode: request.mode,
    cache: request.cache,
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    integrity: request.integrity,
    keepalive: request.keepalive,
    signal: request.signal,
  });
}

export class FetchBackend implements IHttpBackend {
  async doRequest(
    request: HttpRequest,
    config: Readonly<CommonConfig>
  ): Promise<HttpResult> {
    let response: Response;
    const { timeout, validateStatus } = config;

    try {
      const requestInit = createRequestInit(request);
      response = await timeoutWrapper(timeout * 1000, fetch(requestInit));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return {
          response: null,
          error: new ResultError(ResultErrorType.AbortError, err.message),
        };
      }
      if (err instanceof Error && err.name === "TimeoutError") {
        return {
          response: null,
          error: new ResultError(ResultErrorType.TimeoutError, err.message),
        };
      }

      // 处理各种类型的请求错误
      let errorMessage = "Request Error";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      }

      return {
        response: null,
        error: new ResultError(ResultErrorType.RequestError, errorMessage),
      };
    }

    const isOK = validateStatus(response.status);
    if (!isOK) {
      return {
        response: HttpResponse.createFromResponse(response),
        error: new ResultError(ResultErrorType.StatusValidateError),
      };
    }

    return {
      response: HttpResponse.createFromResponse(response),
      error: null,
    };
  }
}
