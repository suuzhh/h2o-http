export class ResultError extends Error {
  /** 响应对象 */
  constructor(
    public readonly type: Readonly<ResultErrorType>,
    message?: string
  ) {
    super(message);
  }
}

export enum ResultErrorType {
  TimeoutError = "TimeoutError",
  AbortError = "AbortError",
  /** 状态码验证错误 */
  StatusValidateError = "StatusValidateError",
  /** 请求错误，包括跨域 断网 自定义abort hander返回的错误等 */
  RequestError = "RequestError",
  /** 拦截器执行错误 */
  InterceptorError = "InterceptorError",
}
