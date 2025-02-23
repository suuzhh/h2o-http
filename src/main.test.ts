import { ResultError } from "./backend/internal-error";
import { createFetchHttpClient } from "./main";
import { describe, expect, test } from "vitest";

describe("createHttpClient", () => {
  const httpClient = createFetchHttpClient();
  test("createHttpClient is defined", () => {
    expect(httpClient).not.toBeUndefined();
  });

  test("createHttpClient.get is defined", async () => {
    const res = await httpClient.get(
      "https://jsonplaceholder.typicode.com/todos/1"
    );

    expect(res.data).not.toBeUndefined();
  });

  test("createHttpClient.post is defined", async () => {
    const res = await httpClient.post(
      "https://jsonplaceholder.typicode.com/todos/1"
    );
    expect(res.data).toBeUndefined();
  });

  test("timeout options set 4s", async () => {
    const startTime = performance.now();
    const res = await httpClient.get("http://www.google.com:81/", {
      timeout: 4,
    });
    const endTime = performance.now() - startTime;
    expect(res.error).not.toBeUndefined();
    expect(endTime <= 4500).toBeTruthy();
  });

  test("can be aborted", () =>
    new Promise<void>((done) => {
      const controller = new AbortController();
      const startTime = performance.now();
      httpClient
        .get("http://www.google.com:81/", {
          signal: controller.signal,
        })
        .then((res) => {
          const endTime = performance.now() - startTime;

          const error = res.error;
          console.log(error);
          // 测试是否包含中断错误
          expect((error as ResultError).type).toBe("AbortError");
          expect(endTime <= 4500).toBeTruthy();
          done();
        });

      controller.abort();
    }));
});
