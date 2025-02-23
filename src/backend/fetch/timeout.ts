/** timeout的实现参考新版api  AbortSignal.timeout */
export function timeout(milliseconds: number, promise: Promise<Response>) {
  // 如果milliseconds小于等于0，直接返回promise
  if (milliseconds <= 0) {
    return promise;
  }

  return new Promise<Response>(function (resolve, reject) {
    const timer = setTimeout(() => {
      const timeoutError = new Error("request timeout");
      // 设置一个内部错误类型标识
      timeoutError.name = "TimeoutError";
      reject(timeoutError);
    }, milliseconds);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((reason) => {
        clearTimeout(timer);
        reject(reason);
      });
  });
}
