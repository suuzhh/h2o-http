import { describe, expect, test } from "vitest";
import type { INTERNAL_RequestConfig } from "./HttpRequest";
import { HttpRequest } from "./HttpRequest";

const TEST_URL = new URL("http://test.api/h2o");
const TEST_HEADERS = new Headers({
  "Content-Type": "application/json",
  "X-Test-Header": "true",
});

function createTestConfig(
  method: INTERNAL_RequestConfig["method"] = "GET",
  body?: string | INTERNAL_RequestConfig["body"]
): INTERNAL_RequestConfig {
  if (typeof body === "string") {
    body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(body as string));
        controller.close();
      },
    });
  }
  return {
    url: TEST_URL,
    method: method,
    headers: TEST_HEADERS,
    body,
  };
}

describe("HttpRequest 构造函数", () => {
  test("正确初始化URL", () => {
    const config = createTestConfig();
    const request = new HttpRequest(config);
    expect(request.url).toBe(TEST_URL.toString());
  });

  test("正确设置HTTP方法", () => {
    const methods = ["GET", "POST"] as const;
    methods.forEach((method) => {
      const config = createTestConfig(method);
      console.log(config, method);
      const request = new HttpRequest(config);
      expect(request.method).toBe(method);
    });
  });

  test("正确处理headers", () => {
    const config = createTestConfig();
    const request = new HttpRequest(config);
    expect(request.headers.get("Content-Type")).toBe("application/json");
    expect(request.headers.get("X-Test-Header")).toBe("true");
  });

  test("正确处理body", () => {
    const encoder = new TextEncoder();
    const withBody = createTestConfig(
      "POST",
      new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode("test-body"));
          controller.close();
        },
      })
    );
    const withoutBody = createTestConfig();

    expect(new HttpRequest(withBody).body).toBeInstanceOf(ReadableStream);
    expect(new HttpRequest(withoutBody).body).toBeNull();
  });

  test("_originalConfig 正确读取构造函数配置", () => {
    const cfg = createTestConfig();
    const original = new HttpRequest(cfg);
    expect(original._originalConfig).toEqual(cfg);
  });
});

describe("clone 方法", () => {
  test("克隆对象与原对象独立", () => {
    const original = new HttpRequest(createTestConfig());
    const cloned = original.clone();

    expect(cloned).not.toBe(original);
    expect(cloned).toBeInstanceOf(HttpRequest);
  });

  test("克隆后属性值一致", () => {
    const original = new HttpRequest(createTestConfig("POST", "test"));
    const cloned = original.clone();

    expect(cloned.url).toBe(original.url);
    expect(cloned.method).toBe(original.method);
    expect(cloned.headers.get("Content-Type")).toBe(
      original.headers.get("Content-Type")
    );
    expect(cloned.body).toEqual(original.body);
  });

  test("修改克隆对象不影响原对象", () => {
    const original = new HttpRequest(createTestConfig());
    const cloned = original.clone();

    cloned.headers.set("X-New-Header", "cloned");
    original.headers.set("X-Original-Update", "modified");

    expect(cloned.headers.get("X-New-Header")).toBe("cloned");
    expect(original.headers.get("X-New-Header")).toBeNull();
    expect(original.headers.get("X-Original-Update")).toBe("modified");
    expect(cloned.headers.get("X-Original-Update")).toBeNull();
  });
});
