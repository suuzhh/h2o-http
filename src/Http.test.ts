import { FetchHttpClient } from "./Http";
import { FetchBackend } from "./backend/fetch";
import { ResultError, ResultErrorType } from "./backend/internal-error";
import { HttpRequest } from "./request/HttpRequest";
import { HttpResponse } from "./response/HttpResponse";
import { vi, describe, test, expect, beforeEach } from "vitest";

// Mock dependencies
vi.mock("./backend/fetch");

const mockResponse = (
  status: number,
  data: any,
  headers?: Record<string, string>
) =>
  new HttpResponse(JSON.stringify(data), {
    status,
    headers: headers || {},
  });

describe("FetchHttpClient", () => {
  // const mockBackend = new FetchBackend();
  const client = new FetchHttpClient();

  beforeEach(() => {
    vi.resetAllMocks();
  });
  test("should handle successful POST request with JSON data", async () => {
    const spy = vi
      .spyOn(FetchBackend.prototype, "doRequest")
      .mockResolvedValue({
        response: mockResponse(200, { success: true }),
        error: null,
      });

    // Test execution
    const result = await client.post<{ success: boolean }>(
      "https://api.example.com/data",
      {
        key: "value",
      }
    );

    // Assertions
    expect(result.data).not.toBeUndefined();
    expect(result.data?.success).toBe(true);
    expect(spy).toBeCalledTimes(1);
  });

  test("should handle FormData POST request", async () => {
    const formData = new FormData();
    formData.append("file", "123");

    const spy = vi
      .spyOn(FetchBackend.prototype, "doRequest")
      .mockImplementation(async (request: HttpRequest) => {
        expect(request._originalConfig.body).toBeInstanceOf(FormData);
        expect((request._originalConfig.body as FormData).get("file")).toBe(
          "123"
        );
        return {
          response: mockResponse(201, { id: 123 }),
          error: null,
        };
      });

    const result = await client.post(
      "https://api.example.com/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    expect(result.data).toEqual({ id: 123 });
    expect(spy).toBeCalledTimes(1);
  });

  test("should handle network errors", async () => {
    const spy = vi
      .spyOn(FetchBackend.prototype, "doRequest")
      .mockResolvedValue({
        response: null,
        error: new ResultError(ResultErrorType.RequestError, "Network error"),
      });

    const result = await client.post("https://api.example.com/error");
    expect(result.data).toBeUndefined();
    expect(result.error?.message).toBe("Network error");
    expect(spy).toBeCalledTimes(1);
  });

  describe("get method", () => {
    test("should handle successful GET request with query params", async () => {
      const spy = vi
        .spyOn(FetchBackend.prototype, "doRequest")
        .mockResolvedValue({
          response: mockResponse(200, { data: "test" }),
          error: null,
        });

      await client.get("https://api.example.com/data", {
        query: { page: 1, limit: 10 },
      });

      const urlConfig = spy.mock.calls[0][0]._originalConfig.url;

      expect(urlConfig).toBeInstanceOf(URL);
      expect(urlConfig.searchParams.get("page")).toBe("1");
      expect(urlConfig.searchParams.get("limit")).toBe("10");
    });

    test("should handle status code validation", async () => {
      vi.spyOn(FetchBackend.prototype, "doRequest").mockResolvedValue({
        response: mockResponse(404, { error: "Not found" }),
        error: new ResultError(
          ResultErrorType.StatusValidateError,
          "not found 404"
        ),
      });

      const result = await client.get("https://api.example.com/missing");
      expect(result.data).toBeUndefined();
      expect(result.error).instanceOf(ResultError);
      expect((result.error as ResultError).type).toBe(
        ResultErrorType.StatusValidateError
      );
      expect(result.error?.message).toContain("not found 404");
    });

    test("should handle timeout errors", async () => {
      vi.spyOn(FetchBackend.prototype, "doRequest").mockResolvedValue({
        response: null,
        error: new ResultError(ResultErrorType.TimeoutError, "Request Timeout"),
      });

      const result = await client.get("https://api.example.com/slow", {
        timeout: 5000,
      });

      expect(result.error?.message).toBe("Request Timeout");
    });
  });
});
