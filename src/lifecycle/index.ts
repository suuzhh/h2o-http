import { safeAssignment } from "@/utils";
import type { IHTTPRequestConfig } from "@/client-adaptor/request";

export interface Lifecycle {
  beforeRequest: (
    req: IHTTPRequestConfig
  ) => Promise<IHTTPRequestConfig> | IHTTPRequestConfig | undefined;

  /**
   *
   * @deprecated - use `onResponseError` callback instead
   * 在响应状态未通过校验时触发
   *
   * 可通过 validateStatus 来自定义校验规则
   */
  onResponseStatusError: (
    req: IHTTPRequestConfig,
    res: globalThis.Response
  ) => Promise<Error> | Error | undefined | void;

  /**
   * 请求未响应（非abort和timeout）和 response状态码未通过 `validateStatus` 校验时触发
   * @param req
   * @param {Response | undefined} res - 响应对象，在cors和断网情况下可能为空
   * @returns
   */
  onResponseError: (
    req: IHTTPRequestConfig,
    res?: globalThis.Response
  ) => Promise<void> | void;
}

interface LifecycleResult<T> {
  result?: T;
  error?: Error;
}

export type LifecycleConfig = Partial<Lifecycle>;

/**
 * implements all Http Lifecycle
 *
 * 声明周期应该只做事件回调的分发，不修改配置
 * 如果需要在请求中修改配置，请使用 `pipeline`(规划中)
 */
export class LifecycleCaller {
  /**
   * lifecycle method only defined singlely
   */
  private __lifecycle__: Partial<Lifecycle> = {};

  private __eventTarget__: EventTarget = new EventTarget();

  async call<T extends keyof Lifecycle>(
    name: T,
    ...args: Parameters<Lifecycle[T]>
  ): Promise<LifecycleResult<Awaited<ReturnType<Lifecycle[T]>>>> {
    const method = this.__lifecycle__[name];

    if (!method) {
      return { result: undefined };
    }

    // Must define specific lifecycle method function type,
    // otherwise type checking will fail
    type LifecycleFn = (
      ..._args: Parameters<Lifecycle[T]>
    ) => Awaited<ReturnType<Lifecycle[T]>>;

    const fn = method as unknown as LifecycleFn;

    if (name === "onResponseStatusError") {
      console.warn(
        "onResponseStatusError is deprecated, use onResponseError instead, If you want change responseStatusError, please use pipeline"
      );
    }

    const [error, result] = await safeAssignment<
      Awaited<ReturnType<Lifecycle[T]>>
    >(() => fn(...args));

    if (result) {
      return {
        result,
      };
    }

    return {
      error: error ?? new Error("lifecycle error"),
    };
  }

  beforeRequest = (fn: Lifecycle["beforeRequest"]) => {
    this.__lifecycle__.beforeRequest = fn;
    return () => {
      this.__lifecycle__.beforeRequest = undefined;
    };
  };

  onResponseStatusError = (fn: Lifecycle["onResponseStatusError"]) => {
    this.__lifecycle__.onResponseStatusError = fn;

    return () => {
      this.__lifecycle__.onResponseStatusError = undefined;
    };
  };

  emit<NAME extends keyof Lifecycle>(
    name: NAME,
    ...args: Parameters<Lifecycle[NAME]>
  ) {
    this.__eventTarget__.dispatchEvent(new CustomEvent(name, { detail: args }));
  }

  onResponseError = (fn: Lifecycle["onResponseError"]) => {
    this.__lifecycle__.onResponseError = fn;
    return () => {
      this.__lifecycle__.onResponseError = undefined;
    };
  };

  addEventListener = <NAME extends keyof Lifecycle>(
    name: NAME,
    fn: Lifecycle[NAME]
  ) => {
    const handler = {
      handleEvent(e: CustomEvent) {
        type LifecycleFn = (..._args: Parameters<Lifecycle[NAME]>) => void;
        const args: Parameters<Lifecycle[NAME]> = e.detail ?? [];

        (fn as LifecycleFn)(...args);
      },
    };

    this.__eventTarget__.addEventListener(name, handler);
    return () => {
      this.__eventTarget__.removeEventListener(name, handler);
    };
  };
}
