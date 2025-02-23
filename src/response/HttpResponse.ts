// 基于MDN Response规范扩展的通用响应对象
export class HttpResponse extends Response {
  private _jsonBody?: any;
  private _textBody?: string;
  private _arrayBufferBody?: ArrayBuffer;
  private _blobBody?: Blob;
  private _formDataBody?: FormData;
  private _headers: Headers;
  private _status: number;

  constructor(body?: BodyInit | null, init?: ResponseInit) {
    super(body, init);
    this._headers = new Headers(init?.headers);
    this._status = init?.status || 200;
  }

  // 增强类型定义
  get headers(): Headers {
    return this._headers;
  }

  get status(): number {
    return this._status;
  }

  set status(code: number) {
    this._status = code;
  }

  // 集成数据解析功能
  async parse<T = any>(
    parser?: (response: Response) => Promise<T>
  ): Promise<T> {
    const contentType = this.headers.get("content-type") || "text/plain";
    // 如果没有设置context-type, 默认会被设置为text/plain
    const parserToUse = parser || this.getDefaultParser(contentType);
    return await parserToUse(this);
  }

  private getDefaultParser(
    contentType: string
  ): (response: Response) => Promise<any> {
    if (contentType.includes("application/json")) {
      return (r) => r.json();
    }
    if (contentType.includes("text/")) {
      return (r) => r.text();
    }
    if (contentType.includes("octet-stream")) {
      return (r) => r.arrayBuffer();
    }
    return (r) => r.blob();
  }

  // 添加便捷方法
  async json<T = any>(): Promise<T> {
    if (this._jsonBody) return this._jsonBody;
    if (this._textBody) {
      this._jsonBody = JSON.parse(this._textBody);
      return this._jsonBody;
    }
    this._textBody = await super.text();
    this._jsonBody = JSON.parse(this._textBody);
    return this._jsonBody;
  }

  async text(): Promise<string> {
    if (this._blobBody) {
      this._textBody = await this._blobBody.text();
      return this._textBody;
    }
    if (this._textBody) return this._textBody;
    this._textBody = await super.text();
    return this._textBody;
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    if (this._arrayBufferBody) return this._arrayBufferBody;
    if (this._textBody) {
      const encoder = new TextEncoder();
      this._arrayBufferBody = encoder.encode(this._textBody).buffer;
      return this._arrayBufferBody;
    }
    this._arrayBufferBody = await super.arrayBuffer();
    return this._arrayBufferBody;
  }

  async blob(): Promise<Blob> {
    if (this._blobBody) return this._blobBody;
    if (this._textBody) {
      this._blobBody = new Blob([this._textBody]);
      return this._blobBody;
    }
    if (this._arrayBufferBody) {
      this._blobBody = new Blob([this._arrayBufferBody]);
      return this._blobBody;
    }
    this._blobBody = await super.blob();
    return this._blobBody;
  }

  async formData(): Promise<FormData> {
    if (this._formDataBody) return this._formDataBody;
    if (this._textBody) {
      const formData = new FormData();
      const params = new URLSearchParams(this._textBody);
      params.forEach((value, key) => formData.append(key, value));
      this._formDataBody = formData;
      return this._formDataBody;
    }
    this._formDataBody = await super.formData();
    return this._formDataBody;
  }

  clone(): HttpResponse {
    return new HttpResponse(this.body, {
      status: this.status,
      statusText: this.statusText,
      headers: this.headers,
    });
  }

  // 创建响应对象的工厂方法
  static createFromResponse(response: Response): HttpResponse {
    return new HttpResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }
}
