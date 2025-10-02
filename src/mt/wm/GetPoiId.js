const { getWithHeaders } = require('../../util/httpClient');
const { buildSignature } = require('./SignUtil');

const GET_POI_IDS_URL = 'https://waimaiopen.meituan.com/api/v1/poi/getids';

/**
 * 调用美团外卖获取门店 ID 列表接口。
 *
 * @param {Object} options
 * @param {string} options.appId 美团分配的 APP ID。
 * @param {string} options.consumerSecret 接入方的 consumer_secret。
 * @param {number|string|Date} [options.timestamp] Unix 秒级时间戳，不传则使用当前时间。
 * @param {Object} [options.headers] 额外请求头。
 * @param {Object} [options.extraParams] 额外的可选参数，避免字段写死。
 * @returns {Promise<any>} axios 响应体 data 字段。
 */
async function getPoiIds({ appId, consumerSecret, timestamp, headers, extraParams = {} } = {}) {
  if (!appId) {
    throw new Error('appId is required to request Meituan POI IDs');
  }
  if (!consumerSecret) {
    throw new Error('consumerSecret is required to sign Meituan requests');
  }

  const params = {
    app_id: String(appId),
    timestamp: normalizeTimestamp(timestamp),
    ...normalizeExtra(extraParams),
  };

  const sig = buildSignature(GET_POI_IDS_URL, params, consumerSecret);
  const requestParams = { ...params, sig };

  const data = await getWithHeaders(GET_POI_IDS_URL, requestParams, {
    'Content-Type': 'application/x-www-form-urlencoded',
    ...headers,
  });

  return data;
}

function normalizeTimestamp(value) {
  if (value === undefined || value === null) {
    return String(Math.floor(Date.now() / 1000));
  }

  if (value instanceof Date) {
    return String(Math.floor(value.getTime() / 1000));
  }

  const str = String(value).trim();
  if (str.length === 0) {
    throw new Error('timestamp cannot be empty');
  }

  if (/^-?\d+(?:\.\d+)?$/.test(str)) {
    const num = Number(str);
    if (Number.isNaN(num)) {
      throw new Error('timestamp is not a valid number');
    }
    return String(Math.floor(num));
  }

  throw new Error('timestamp must be a number or Date');
}

function normalizeExtra(extraParams) {
  if (!extraParams || typeof extraParams !== 'object') {
    return {};
  }

  const normalized = {};
  for (const [key, value] of Object.entries(extraParams)) {
    if (value === undefined || value === null) continue;
    normalized[key] = String(value);
  }
  return normalized;
}

/**
 * 示例方法：填入自己参数后直接调用以便本地测试。
 */
async function runGetPoiIdsDemo() {
  const appId = '';
  const consumerSecret = '';

  try {
    const result = await getPoiIds({ appId, consumerSecret });
    console.log('获取成功:', result);
  } catch (err) {
    console.error('调用失败:', err.message);
  }
}

module.exports = {
  getPoiIds,
  runGetPoiIdsDemo,
  GET_POI_IDS_URL,
};

if (require.main === module) {
  runGetPoiIdsDemo();
}
