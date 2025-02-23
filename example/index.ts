import { createFetchHttpClient, type HttpInterceptorFn } from "../src/main";

const handleError: HttpInterceptorFn = async (req, next) => {
  const result = await next(req);
  if (result.error) {
    console.log(req, result);
  }

  const parsedResult = await result.response.json();
  console.log("success", parsedResult);
  return result;
};

// const downloader = createDownloader();
const httpClient = createFetchHttpClient({
  interceptors: [handleError],
});

// downloader
//   .download(
//     "https://st4.depositphotos.com/1757635/22304/i/1600/depositphotos_223045340-stock-photo-woman-red-umbrella-waiting-train.jpg"
//   )
//   .then((data) => {
//     console.log(data);
//   });

// eslint-disable-next-line no-unused-vars
window.addEventListener("unhandledrejection", (event) => {
  console.error("未捕获的promise rejection -> ", event);
});

async function testAbort() {
  const controller = new AbortController();
  const result = await httpClient.get(
    "https://61e80b15e32cd90017acbfb7.mockapi.io/enterprise/news",
    {
      signal: controller.signal,
    }
  );

  // setTimeout(() => {
  //   controller.abort("123");
  //   console.log("abort");
  // }, 10);
  if (result.error) {
    console.error(result.error);
  }

  console.log("call", result.data);
}

testAbort();
