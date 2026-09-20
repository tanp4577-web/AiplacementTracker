let counter = 0;

/** Unique IPv4 per call so rate-limit counters never collide between tests. */
export function freshIp() {
  counter += 1;
  return `10.${Math.floor(counter / 65025) % 256}.${Math.floor(counter / 255) % 255}.${(counter % 255) + 1}`;
}

export function makeReq(overrides = {}) {
  const { headers, ...rest } = overrides;
  return {
    method: 'POST',
    body: {},
    query: {},
    ...rest,
    headers: {
      host: 'app.vercel.app',
      origin: 'https://app.vercel.app',
      'content-length': '100',
      'x-forwarded-for': freshIp(),
      ...(headers || {})
    }
  };
}

export function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) {
      this.headers[k] = v;
    },
    end(b) {
      this.body = b;
    },
    json() {
      return JSON.parse(this.body);
    }
  };
}

/** Replace global fetch for one test; returns { calls, restore }. */
export function mockFetch(handler) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return handler(String(url), init);
  };
  return { calls, restore: () => (globalThis.fetch = original) };
}

export const jsonResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
  text: async () => JSON.stringify(data)
});

export const geminiReply = (text) => jsonResponse({ candidates: [{ content: { parts: [{ text }] } }] });
