export function mergeHeaders(
  actionHeaders?: Record<string, string> | Headers,
  instanceHeaders?: Record<string, string> | Headers
): Headers {
  // 创建一个新的 Headers 对象
  const mergedHeaders = new Headers();

  // 如果存在 instanceHeaders，将其添加到 mergedHeaders
  if (instanceHeaders) {
    if (instanceHeaders instanceof Headers) {
      instanceHeaders.forEach((value, key) => {
        mergedHeaders.append(key, value);
      });
    } else {
      Object.entries(instanceHeaders).forEach(([key, value]) => {
        mergedHeaders.append(key, value);
      });
    }
  }

  // 如果存在 actionHeaders，将其添加到 mergedHeaders（会覆盖 instanceHeaders 中的相同键）
  if (actionHeaders) {
    if (actionHeaders instanceof Headers) {
      actionHeaders.forEach((value, key) => {
        mergedHeaders.set(key, value);
      });
    } else {
      Object.entries(actionHeaders).forEach(([key, value]) => {
        mergedHeaders.set(key, value);
      });
    }
  }

  return mergedHeaders;
}
