import { HttpRequest } from "@/request/HttpRequest";
import { HttpResponse } from "@/response/HttpResponse";
import { ResultError } from "./internal-error";

export interface IHttpBackend {
  doRequest: (
    request: HttpRequest,
    /** 用户可配置的配置项 */
    config: Readonly<CommonConfig>
  ) => Promise<HttpResult>;
}

/** 用户可配置的配置项 */
export interface CommonConfig {
  /** 超时时间 单位：秒 */
  timeout: number;
  /** 校验响应状态 */
  validateStatus: (status: number) => boolean;
}

export interface HttpResult {
  /** 响应对象 */
  response: HttpResponse | null;
  /** 错误对象 */
  error: ResultError | null;
}
