import { createDownloader, createHttpClient } from "./main";
import { describe, expect, test } from "vitest";

describe("createHttpClient", () => {
  const httpClient = createHttpClient();
  test("createHttpClient is defined", () => {
    expect(httpClient).not.toBeUndefined();
  });

  test("createHttpClient.get is defined", async () => {
    const res = await httpClient.get(
      "https://jsonplaceholder.typicode.com/todos/1"
    );

    expect(res.data).not.toBeUndefined();
  });

  test("createHttpClient.get with query", async () => {
    let url = "";
    const cancel = httpClient.lifecycle.beforeRequest((req) => {
      url = req.url;
      return req;
    });
    const res = await httpClient.get(
      "https://jsonplaceholder.typicode.com/todos/1",
      {
        query: {
          a: 1,
        },
      }
    );
    expect(res.data).not.toBeUndefined();
    expect(url).toBe("https://jsonplaceholder.typicode.com/todos/1?a=1");

    const res2 = await httpClient.get(
      "https://jsonplaceholder.typicode.com/todos/1",
      {
        query: "a=2",
      }
    );

    expect(res2.data).not.toBeUndefined();
    expect(url).toBe("https://jsonplaceholder.typicode.com/todos/1?a=2");
    cancel();
  });

  test("createHttpClient.post is defined", async () => {
    const res = await httpClient.post(
      "https://jsonplaceholder.typicode.com/todos/1"
    );
    expect(res.data).toBeUndefined();
  });

  test("createHttpClient.lifecycle.onResponseStatusError is be called", async () => {
    httpClient.lifecycle.onResponseStatusError(() => {
      throw new Error("_afterResponseStatusError error");
    });
    const res = await httpClient.post("https://mock.httpstatus.io/400");
    expect(res.error?.message).toBe("_afterResponseStatusError error");
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
          // 测试是否包含中断错误
          expect(error instanceof DOMException).toBeTruthy();
          expect((error as DOMException).code).toBe(DOMException.ABORT_ERR);
          expect(endTime <= 4500).toBeTruthy();
          done();
        });

      controller.abort();
    }));
});

describe("createDownloader", () => {
  test("download a jpg file", async () => {
    const downloader = createDownloader();

    const { data: file } = await downloader.download(
      "https://cdn.fastcdnshop.com/assets/2021/10/4a6fa5385c439adfdd0d937066256f6d-50.jpg"
    );

    expect(file).not.toBeUndefined();
    expect(file instanceof File).toBeTruthy();
    expect(file!.name).toBe("4a6fa5385c439adfdd0d937066256f6d-50.jpg");
  });
});
