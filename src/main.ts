import { HttpClient } from "./Http";
import { FetchHttpClient, type HttpClientConfig } from "./Http2";
import { BlobParser } from "./parser";
import { buildFailResult, buildSuccessResult } from "./utils";

// export custom parsers
export { BlobParser };

/**
 * 即将重构，欢迎使用createFetchHttpClient体验新版客户端
 * @returns
 */
export function createHttpClient() {
  return new HttpClient();
}

export function createDownloader() {
  const httpClient = new HttpClient(new BlobParser());
  return {
    /**
     * 下载文件
     * @param url 文件url
     * @param filename 指定文件名
     * @returns {{data: File, error?: Error}} 下载的文件对象, 或者出错信息
     */
    async download(
      url: string,
      {
        filename,
        query,
      }: {
        query?: Record<string, string | number> | string;
        filename?: string;
      } = {}
    ) {
      const { data, error } = await httpClient.get<Blob>(url, { query });

      if (error) {
        return buildFailResult(error);
      }

      // 默认取文件路径最后一段做为文件名
      filename ??= url.split("/").pop() ?? "unknown";
      const file = new File([data], filename);
      return buildSuccessResult(file);
    },
  };
}

// 0.2.0重构
export function createFetchHttpClient(config: HttpClientConfig = {}) {
  return new FetchHttpClient(config);
}
