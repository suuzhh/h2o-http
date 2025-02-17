import { createDownloader, createHttpClient } from "../src/main";

// const downloader = createDownloader();
const httpClient = createHttpClient();

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
  httpClient.lifecycle.addEventListener("onResponseError", (req, res) => {
    console.log(req, res);
  });

  const controller = new AbortController();
  const startTime = performance.now();
  httpClient.get(
    "https://61e80b15e32cd90017acbfb7.mockapi.io/enterprise/news",
    {
      signal: controller.signal,
    }
  );

  setTimeout(() => {
    const endTime = performance.now() - startTime;
    // controller.abort();
    console.log(endTime);
  }, 50);
}

testAbort();
