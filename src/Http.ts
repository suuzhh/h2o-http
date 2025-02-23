import { CommonConfig, IHttpBackend } from "./backend/base";
import { FetchBackend } from "./backend/fetch";
import { HttpInterceptorFn, HttpInterceptorHandler } from "./interceptor";
import { IResponseParser, JSONParser } from "./parser";
import { HttpRequest } from "./request/HttpRequest";
import { buildFailResult, buildSuccessResult, type IResult } from "./utils";
import { mergeHeaders } from "./utils/mergeHeaders";

/** 替换掉RequestConfig */
export interface CompleteHttpClientConfig {
  /** 请求拦截器函数 */
  interceptors: HttpInterceptorFn[];
}

export type HttpClientConfig = Partial<CompleteHttpClientConfig>;

export interface CompleteRequestConfig {
  /**
   * a function that takes a numeric status code and returns a boolean indicating whether the status is valid. If the status is not valid, the result will be failed. then call `onResponseStatusError` lifecycle method
   * @param status HTTP status code
   * @returns
   */
  validateStatus: (status: number) => boolean;

  /**
   * 请求超时时间
   *
   * 0 表示不限制 使用系统默认超时时间
   */
  timeout: number;

  /**
   * support safari 13+
   * @docs https://developer.mozilla.org/zh-CN/docs/Web/API/Request/signal
   */
  signal: globalThis.RequestInit["signal"] | null;
  url: string;

  // method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

  headers: Record<string, string> | Headers;

  /**
   *  传递给请求体的数据（目前只支持FormData 和 string 和 js对象）
    Only applicable for request methods 'PUT', 'POST', 'DELETE , and 'PATCH'
    When no `transformRequest` is set, must be of one of the following types:
    - string, plain object, ArrayBuffer, ArrayBufferView, URLSearchParams
    - Browser only: FormData, File, Blob
    - Node only: Stream, Buffer, FormData (form-data package)
   */
  body?: FormData | string | Record<string | number, any>;
}

export type RequestConfig = Partial<CompleteRequestConfig>;

interface IHttpMethods {
  request<R = unknown>(config: RequestConfig): Promise<IResult<R>>;
  post<R = unknown, P = unknown>(
    url: string,
    data?: P,
    config?: RequestConfig
  ): Promise<IResult<R>>;
  get<P = Record<string, string | number>, R = unknown>(
    url: string,
    options?: Omit<RequestConfig, "url" | "method" | "body"> & { query?: P }
  ): Promise<IResult<R>>;
}

abstract class HttpClient {
  protected interceptorHandler: HttpInterceptorHandler;

  constructor(
    { interceptors }: CompleteHttpClientConfig,
    protected httpBackend: IHttpBackend
  ) {
    this.interceptorHandler = new HttpInterceptorHandler(
      interceptors,
      this.httpBackend
    );
  }
}

export class FetchHttpClient extends HttpClient implements IHttpMethods {
  readonly responseParser = new JSONParser();

  constructor({ interceptors = [] }: HttpClientConfig = {}) {
    super({ interceptors }, new FetchBackend());
  }

  async request<R = unknown>(
    config: RequestConfig & { method?: string }
  ): Promise<IResult<R>> {
    const method = config.method || "GET";
    const url = config.url || "";
    if (method === "GET") {
      return this.get<R>(url, config);
    } else if (method === "POST") {
      return this.post<R>(url, config);
    } else {
      return buildFailResult(new Error("method not supported"));
    }
  }

  async post<R = unknown, P = unknown>(
    url: string,
    data?: P,
    config?: RequestConfig
  ): Promise<IResult<R>> {
    let body: RequestConfig["body"] = undefined;
    const headers = mergeHeaders(config?.headers);

    if (data instanceof FormData) {
      body = data;
    } else {
      // 这里有可能解析异常
      body = JSON.stringify(data) as string;
    }

    const req = new HttpRequest({
      url: new URL(url),
      method: "POST",
      headers: headers,
      body: <FormData | string>body,
      signal: config?.signal ?? null,
    });

    const conf = {
      timeout: config?.timeout || 0,
      validateStatus:
        config?.validateStatus || ((status) => status >= 200 && status < 300),
    };

    const { response, error } = await this.interceptorHandler.handle(req, conf);

    if (error) {
      return buildFailResult(error);
    }

    // 有响应才算成功
    if (response) {
      // 解析数据
      // TODO: 是否需要使用response.parse替换该方法
      return await parseResponse<R>(response, this.responseParser);
    } else {
      return buildFailResult(new Error("unknown response error"));
    }
  }
  async get<R = unknown, P = Record<string, string | number>>(
    url: string,
    options?: Omit<RequestConfig, "url" | "body"> & { query?: P }
  ): Promise<IResult<R>> {
    if (options?.query) {
      if (typeof options.query === "string") {
        url += `?${options.query}`;
      } else {
        const params = new URLSearchParams(options.query);

        url += `?${params.toString()}`;
      }
    }

    const headers = mergeHeaders(options?.headers);

    const req = new HttpRequest({
      url: new URL(url),
      method: "GET",
      headers,
      signal: options?.signal ?? null,
    });

    const config: CommonConfig = {
      timeout: options?.timeout || 0,
      validateStatus:
        options?.validateStatus || ((status) => status >= 200 && status < 300),
    };

    const { response, error } = await this.interceptorHandler.handle(
      req,
      config
    );

    if (error) {
      return buildFailResult(error);
    }

    // 有响应才算成功
    if (response) {
      // 解析数据
      // TODO: 是否需要使用response.parse替换该方法
      return await parseResponse<R>(response, this.responseParser);
    } else {
      return buildFailResult(new Error("unknown response error"));
    }
  }
}

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