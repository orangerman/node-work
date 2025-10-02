const crypto = require('crypto');

/**
 * Compute the Meituan Waimai request signature.
 *
 * 根据美团签名规则：
 * 1. 聚合请求中的所有参数（含 query 和 form，排除 sig）。
 * 2. 按参数名的字母顺序排序，使用 & 拼接成 key=value 对。
 * 3. 将 请求基础 URL + '?' + 排序后的参数串 + consumerSecret 拼接并做 MD5。
 *
 * @param {string} requestUrl 完整请求 URL，可包含查询串。
 * @param {Record<string, any>} [params={}] 额外参数（通常为 POST form）。
 * @param {string} consumerSecret 接入方的 consumer_secret。
 * @returns {string} 32 位小写十六进制签名。
 */
function buildSignature(requestUrl, params = {}, consumerSecret) {
  if (typeof requestUrl !== 'string' || requestUrl.length === 0) {
    throw new TypeError('requestUrl must be a non-empty string');
  }

  if (typeof consumerSecret !== 'string' || consumerSecret.length === 0) {
    throw new TypeError('consumerSecret must be a non-empty string');
  }

  const { baseUrl, collectedParams } = collectParams(requestUrl, params);
  const sorted = collectedParams
    .filter(({ key }) => key !== 'sig')
    .sort(sortByKeyThenValue)
    .map(({ key, value }) => `${key}=${value}`)
    .join('&');

  const raw = `${baseUrl}?${sorted}${consumerSecret}`;
  return crypto.createHash('md5').update(raw, 'utf8').digest('hex');
}

/**
 * Append the generated signature back onto the request URL.
 *
 * @param {string} requestUrl 完整请求 URL，可包含查询串。
 * @param {Record<string, any>} [params={}] 额外参数（通常为 POST form）。
 * @param {string} consumerSecret 接入方的 consumer_secret。
 * @returns {{ url: string, params: Record<string, any>, sig: string }}
 */
function signRequest(requestUrl, params = {}, consumerSecret) {
  const sig = buildSignature(requestUrl, params, consumerSecret);
  const urlWithSig = appendQuery(requestUrl, { sig });
  return { url: urlWithSig, params, sig };
}

/**
 * Collect query parameters from URL and merge with provided params.
 * Arrays are expanded into repeated key/value pairs to honour Meituan rules.
 */
function collectParams(requestUrl, params) {
  const [baseUrl, query = ''] = requestUrl.split('?', 2);
  const collected = [];

  if (query) {
    for (const pair of query.split('&')) {
      if (!pair) continue;
      const [rawKey, rawValue = ''] = pair.split('=', 2);
      const key = safeDecode(rawKey);
      const value = safeDecode(rawValue);
      collected.push({ key, value });
    }
  }

  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([key, value]) => {
      if (key === 'sig' || value === undefined || value === null) return;
      if (Array.isArray(value)) {
        value.forEach((item) => pushParam(collected, key, item));
        return;
      }
      pushParam(collected, key, value);
    });
  }

  return { baseUrl, collectedParams: collected };
}

function pushParam(target, key, value) {
  if (value === undefined || value === null) return;
  target.push({ key: String(key), value: String(value) });
}

function appendQuery(requestUrl, extra) {
  const hasQuery = requestUrl.includes('?');
  const query = Object.entries(extra)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return hasQuery ? `${requestUrl}&${query}` : `${requestUrl}?${query}`;
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch (err) {
    return value;
  }
}

function sortByKeyThenValue(a, b) {
  if (a.key === b.key) {
    return a.value.localeCompare(b.value);
  }
  return a.key.localeCompare(b.key);
}

module.exports = {
  buildSignature,
  signRequest,
};
