/**
 * 深拷贝纯数据（问卷配置都是可 JSON 化的普通对象）。
 * 优先使用 structuredClone；在不支持它的旧 Android WebView 上
 * 回退到 JSON 序列化拷贝，保证移动端兼容性。
 */
export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (typeof structuredClone === "function") {
    try { return structuredClone(value); } catch { /* 数据含不可克隆类型时回退 */ }
  }
  return JSON.parse(JSON.stringify(value)) as T;
}
