import { HttpInterceptorHandler } from "./index";
import { HttpRequest } from "@/request/HttpRequest";
import { ResultError, ResultErrorType } from "@/backend/internal-error";
import { describe, it, expect, vi } from "vitest";

describe("HttpInterceptorHandler", () => {
  const mockReq = new HttpRequest({
    method: "GET",
    url: new URL("https://example.com"),
    headers: new Headers(),
  });
  const mockBackend = {
    doRequest: vi.fn().mockResolvedValue({ response: "ok", error: null }),
  };
  const commonConfig = {
    timeout: 0,
    validateStatus: () => true,
  };

  it("should handle request without interceptors", async () => {
    const handler = new HttpInterceptorHandler([], mockBackend);

    const result = await handler.handle(mockReq, commonConfig);

    expect(result).toEqual({ response: "ok", error: null });
    expect(mockBackend.doRequest).toBeCalledWith(mockReq, commonConfig);
  });

  it("should handle request with interceptors", async () => {
    const interceptor1 = vi.fn().mockImplementation((req, next) => next(req));
    const interceptor2 = vi.fn().mockImplementation((req, next) => next(req));

    const handler = new HttpInterceptorHandler(
      [interceptor1, interceptor2],
      mockBackend
    );

    const result = await handler.handle(mockReq, commonConfig);

    expect(interceptor1).toBeCalled();
    expect(interceptor2).toBeCalled();
    expect(result).toEqual({ response: "ok", error: null });
  });

  it("should handle interceptor error", async () => {
    const error = new Error("interceptor error");
    const interceptor = vi.fn().mockRejectedValue(error);

    const handler = new HttpInterceptorHandler([interceptor], mockBackend);

    const result = await handler.handle(mockReq, commonConfig);

    expect(result).toEqual({
      response: null,
      error: new ResultError(
        ResultErrorType.InterceptorError,
        "interceptor error"
      ),
    });
  });

  it("should handle global error", async () => {
    const error = new Error("global error");
    mockBackend.doRequest.mockRejectedValueOnce(error);

    const handler = new HttpInterceptorHandler([], mockBackend);

    const result = await handler.handle(mockReq, commonConfig);

    expect(result).toEqual({
      response: null,
      error: new ResultError(ResultErrorType.InterceptorError, "global error"),
    });
  });

  it("should execute interceptors in correct order", async () => {
    const calls: string[] = [];
    const interceptor1 = vi.fn().mockImplementation((req, next) => {
      calls.push("interceptor1");
      return next(req);
    });
    const interceptor2 = vi.fn().mockImplementation((req, next) => {
      calls.push("interceptor2");
      return next(req);
    });

    const handler = new HttpInterceptorHandler(
      [interceptor1, interceptor2],
      mockBackend
    );

    await handler.handle(mockReq, commonConfig);

    expect(calls).toEqual(["interceptor1", "interceptor2"]);
  });
});
