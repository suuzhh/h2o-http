// 实现angular的请求拦截器和响应拦截器

import type { CommonConfig, HttpResult, IHttpBackend } from "@/backend/base";
import { ResultError, ResultErrorType } from "@/backend/internal-error";
import { HttpRequest } from "@/request/HttpRequest";

export type HttpHandlerFn = (
  /** 请求配置， 由于配置对象可被修改， 可能存在配置被误删除的情况，需要使用对象现在配置的修改   */
  req: HttpRequest
) => Promise<HttpResult>;
/**
 * 请求拦截器类型
 * @public
 */
export type HttpInterceptorFn = (
  req: HttpRequest,
  next: HttpHandlerFn
) => Promise<HttpResult>;

export class HttpInterceptorHandler {
  constructor(
    private interceptors: HttpInterceptorFn[],
    private backend: IHttpBackend
  ) {}

  async handle(
    initReq: HttpRequest,
    commonConfig: CommonConfig
  ): Promise<HttpResult> {
    try {
      // 创建基础处理器
      const baseHandler: HttpHandlerFn = (req) =>
        this.backend.doRequest(req, commonConfig);

      // 构建拦截器链
      const chain = this.interceptors.reduceRight<HttpHandlerFn>(
        (next, interceptor) => {
          return async (req) => {
            try {
              return await interceptor(req, next);
            } catch (error) {
              // 拦截器错误处理
              return {
                response: null,
                error: new ResultError(
                  ResultErrorType.InterceptorError,
                  error instanceof Error ? error.message : "Interceptor error"
                ),
              };
            }
          };
        },
        baseHandler
      );

      // 执行拦截器链
      return await chain(initReq);
    } catch (error) {
      // 全局错误处理, 是否需要处理这个情况？
      return {
        response: null,
        error: new ResultError(
          ResultErrorType.InterceptorError,
          error instanceof Error ? error.message : "Request failed"
        ),
      };
    }
  }
}
