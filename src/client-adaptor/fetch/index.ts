import type { IHTTPRequestConfig } from "@/client-adaptor/request";
import type { IHttpClientAdaptor } from "@/client-adaptor/base";
import { buildFailResult, buildSuccessResult } from "@/utils";
import type { IResponseParser } from "@/parser";
import type { LifecycleCaller } from "@/lifecycle";
import { timeout as timeoutWrapper } from "./timeout";

function createRequestInit(config: IHTTPRequestConfig) {
  const headers = new Headers(config.headers);
  // https://muffinman.io/blog/uploading-files-using-fetch-multipart-form-data/
  if (config.body instanceof FormData) {
    headers.delete("Content-Type");
  }
  // 为了兼容NODEJS ReadableStream
  const requestInit: globalThis.RequestInit & { duplex?: "half" } = {
    method: config.method,
    headers,
    // body只在对应的method下有效
    body: config.body,
    // 如果body是ReadableStream，需要设置 duplex
    duplex: config.body instanceof ReadableStream ? "half" : undefined,
    credentials: config.credentials,
    mode: config.mode,
    cache: config.cache,
    redirect: config.redirect,
    referrer: config.referrer,
    referrerPolicy: config.referrerPolicy,
    integrity: config.integrity,
    keepalive: config.keepalive,
    signal: config.signal,
  };

  return new Request(config.url, requestInit);
}

// client-adaptor/fetch 实现
export const fetchAdaptor: IHttpClientAdaptor = {
  fetch: async <R>(
    requestConfig: IHTTPRequestConfig,
    responseParser: IResponseParser,
    lifecycle: LifecycleCaller
  ) => {
    let res: Response;

    const beforeRequestResult = await lifecycle.call(
      "beforeRequest",
      requestConfig
    );

    if (beforeRequestResult.error) {
      return buildFailResult(beforeRequestResult.error);
    }

    if (beforeRequestResult.result) {
      requestConfig = beforeRequestResult.result;
    }

    const { validateStatus, timeout } = requestConfig;
    const requestInit = createRequestInit(requestConfig);
    try {
      // 包裹一层 用于 验证是否超时
      res = await timeoutWrapper(timeout * 1000, fetch(requestInit));
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      const isTimeout = err instanceof Error && err?.name === "TimeoutError";

      if (isAbort) {
        // porcess abort error
        return buildFailResult(err);
      } else if (isTimeout) {
        // process timeout error
        return buildFailResult(err);
      } else {
        // porcess cors | network block or no network error

        // this error should call `onResponseStatusError` lifecycle
        lifecycle.emit("onResponseError", requestConfig);
        let error = err instanceof Error ? err : new Error("request error");
        return buildFailResult(error);
      }
    }

    // 通过状态码判断成功与否
    const isOK = validateStatus(res.status);
    // TODO: 状态码为0的情况如何判断类别

    if (isOK) {
      return await parseResponse<R>(res, responseParser);
      // try {
      //   // headers中的Content-Type设为application/json 才能使用json解析
      //   // 根据解析逻辑处理成对应类型的数据结构
      //   const parseResult = await responseParser.parse<R>(res);

      //   if (parseResult.isSuccess) {
      //     return buildSuccessResult(parseResult.result);
      //   } else {
      //     // TODO: 暂时返回原生错误对象
      //     return buildFailResult(
      //       parseResult.error.cause ?? new Error("response parse error")
      //     );
      //   }
      // } catch (err) {
      //   return buildFailResult(
      //     err instanceof Error ? err : new Error("response parse error")
      //   );
      // }
    } else {
      lifecycle.emit("onResponseError", requestConfig, res);
      // 处理状态码错误
      const onResponseStatusErrorResult = await lifecycle.call(
        "onResponseStatusError",
        requestConfig,
        res
      );

      if (
        onResponseStatusErrorResult.result ||
        onResponseStatusErrorResult.error
      ) {
        // 判断是否有返回Error对象
        if (onResponseStatusErrorResult.result instanceof Error) {
          return buildFailResult(onResponseStatusErrorResult.result);
        }

        if (onResponseStatusErrorResult.error instanceof Error) {
          return buildFailResult(onResponseStatusErrorResult.error);
        }

        return buildFailResult(
          new Error(`获取数据失败${res.status ? `, 状态码${res.status}` : ""}`)
        );
      } else {
        return buildFailResult(
          new Error(`获取数据失败${res.status ? `, 状态码${res.status}` : ""}`)
        );
      }
    }
  },
};

async function parseResponse<R>(
  res: Response,
  responseParser: IResponseParser
) {
  try {
    const parseResult = await responseParser.parse<R>(res);
    if (parseResult.isSuccess) {
      return buildSuccessResult(parseResult.result);
    }
    return buildFailResult(
      parseResult.error.cause ?? new Error("response parse error")
    );
  } catch (err) {
    return buildFailResult(
      err instanceof Error ? err : new Error("response parse error")
    );
  }
}
