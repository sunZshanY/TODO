/** 生成唯一 ID，优先使用 crypto.randomUUID，非安全上下文下降级 */
export function uid(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
