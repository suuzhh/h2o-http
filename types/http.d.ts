/**
 * 内部使用的请求配置
 * 用到哪些再实现，不要一次性扩展太多
 * */
interface INTERNAL_RequestConfig {
    url: URL;
    method: "GET" | "POST";
    headers: Headers;
    body?: Body["body"] | FormData | string;
    signal?: AbortSignal | null;
}
/**
 * @public
 */
declare class HttpRequest extends Request {
    readonly _originalConfig: INTERNAL_RequestConfig;
    constructor(config: INTERNAL_RequestConfig);
    clone(): HttpRequest;
}

declare class HttpResponse extends Response {
    private _jsonBody?;
    private _textBody?;
    private _arrayBufferBody?;
    private _blobBody?;
    private _formDataBody?;
    private _headers;
    private _status;
    constructor(body?: BodyInit | null, init?: ResponseInit);
    get headers(): Headers;
    get status(): number;
    set status(code: number);
    parse<T = any>(parser?: (response: Response) => Promise<T>): Promise<T>;
    private getDefaultParser;
    json<T = any>(): Promise<T>;
    text(): Promise<string>;
    arrayBuffer(): Promise<ArrayBuffer>;
    blob(): Promise<Blob>;
    formData(): Promise<FormData>;
    clone(): HttpResponse;
    static createFromResponse(response: Response): HttpResponse;
}

declare class ResultError extends Error {
    readonly type: Readonly<ResultErrorType>;
    /** 响应对象 */
    constructor(type: Readonly<ResultErrorType>, message?: string);
}
declare enum ResultErrorType {
    TimeoutError = "TimeoutError",
    AbortError = "AbortError",
    /** 状态码验证错误 */
    StatusValidateError = "StatusValidateError",
    /** 请求错误，包括跨域 断网 自定义abort hander返回的错误等 */
    RequestError = "RequestError",
    /** 拦截器执行错误 */
    InterceptorError = "InterceptorError"
}

interface IHttpBackend {
    doRequest: (request: HttpRequest, 
    /** 用户可配置的配置项 */
    config: Readonly<CommonConfig>) => Promise<HttpResult>;
}
/** 用户可配置的配置项 */
interface CommonConfig {
    /** 超时时间 单位：秒 */
    timeout: number;
    /** 校验响应状态 */
    validateStatus: (status: number) => boolean;
}
interface HttpResult {
    /** 响应对象 */
    response: HttpResponse | null;
    /** 错误对象 */
    error: ResultError | null;
}

type HttpHandlerFn = (
/** 请求配置， 由于配置对象可被修改， 可能存在配置被误删除的情况，需要使用对象现在配置的修改   */
req: HttpRequest) => Promise<HttpResult>;
/**
 * 请求拦截器类型
 * @public
 */
type HttpInterceptorFn = (req: HttpRequest, next: HttpHandlerFn) => Promise<HttpResult>;
declare class HttpInterceptorHandler {
    private interceptors;
    private backend;
    constructor(interceptors: HttpInterceptorFn[], backend: IHttpBackend);
    handle(initReq: HttpRequest, commonConfig: CommonConfig): Promise<HttpResult>;
}

type SuccessResult<T> = {
    /** 解析是否成功 */
    isSuccess: true;
    result: T;
    error?: never;
};
type ErrorResult = {
    isSuccess: false;
    result?: never;
    /**
     * 解析错误 需要统一为对象结构
     * 使用原生error有一定局限性， 需要更加定制化的实现错误
     */
    error: {
        /** 原始错误 */
        cause: Error;
    };
};
type ParseResult<T = string> = SuccessResult<T> | ErrorResult;
/**
 * 数据解析器的接口
 *
 * 外部可自行通过该接口自行实现需要的解析器
 */
interface IResponseParser {
    parse<T = string>(response: globalThis.Response): ParseResult<T> | Promise<ParseResult<T>>;
}

declare class JSONParser implements IResponseParser {
    /**
     * 解析 JSON 数据
     * @param data JSON 字符串
     * @returns 一个 ParseResult 对象，result 是解析后的数据，error 是解析时的错误
     */
    parse<T>(response: globalThis.Response): Promise<ParseResult<T>>;
}

/** Promise结果包装类 */
type IResult<T = object, E = Error> = {
    error: E;
    data?: undefined;
} | {
    data: T;
    error?: undefined;
};

/** 替换掉RequestConfig */
interface CompleteHttpClientConfig {
    /** 请求拦截器函数 */
    interceptors: HttpInterceptorFn[];
}
type HttpClientConfig = Partial<CompleteHttpClientConfig>;
interface CompleteRequestConfig {
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
type RequestConfig = Partial<CompleteRequestConfig>;
interface IHttpMethods {
    request<R = unknown>(config: RequestConfig): Promise<IResult<R>>;
    post<R = unknown, P = unknown>(url: string, data?: P, config?: RequestConfig): Promise<IResult<R>>;
    get<P = Record<string, string | number>, R = unknown>(url: string, options?: Omit<RequestConfig, "url" | "method" | "body"> & {
        query?: P;
    }): Promise<IResult<R>>;
}
declare abstract class HttpClient {
    protected httpBackend: IHttpBackend;
    protected interceptorHandler: HttpInterceptorHandler;
    constructor({ interceptors }: CompleteHttpClientConfig, httpBackend: IHttpBackend);
}
declare class FetchHttpClient extends HttpClient implements IHttpMethods {
    readonly responseParser: JSONParser;
    constructor({ interceptors }?: HttpClientConfig);
    request<R = unknown>(config: RequestConfig & {
        method?: string;
    }): Promise<IResult<R>>;
    post<R = unknown, P = unknown>(url: string, data?: P, config?: RequestConfig): Promise<IResult<R>>;
    get<R = unknown, P = Record<string, string | number>>(url: string, options?: Omit<RequestConfig, "url" | "body"> & {
        query?: P;
    }): Promise<IResult<R>>;
}

declare function createFetchHttpClient(config?: HttpClientConfig): FetchHttpClient;

export { type HttpInterceptorFn, HttpRequest, ResultErrorType, createFetchHttpClient };
