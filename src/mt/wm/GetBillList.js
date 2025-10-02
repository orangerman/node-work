const dayjs = require('dayjs');
const { getWithHeaders } = require('../../util/httpClient');
const { buildSignature } = require('./SignUtil');

const GET_BILL_LIST_URL = 'https://waimaiopen.meituan.com/api/v1/wm/bill/list';

/**
 * 调用美团外卖账单列表接口。
 *
 * @param {Object} options
 * @param {string|number} options.appId 美团分配的 APP ID。
 * @param {string} options.consumerSecret 接入方的 consumer_secret。
 * @param {string|number} options.appPoiCode APP 方门店 ID。
 * @param {string|number|Date} options.startDate 账单开始日期，可传时间戳或日期字符串。
 * @param {string|number|Date} options.endDate 账单结束日期，可传时间戳或日期字符串。
 * @param {string|number} [options.offset=0] 分页偏移量。
 * @param {string|number} [options.limit=200] 每页数量 (<=200)。
 * @param {number|string|Date} [options.timestamp] 请求时间戳，不传则取当前秒级时间戳。
 * @param {Object} [options.headers] 自定义请求头。
 * @param {Object} [options.extraParams] 额外的可选参数，避免字段写死。
 * @returns {Promise<any>} axios 响应体 data 字段。
 */
async function getBillList({
  appId,
  consumerSecret,
  appPoiCode,
  startDate,
  endDate,
  offset = 0,
  limit = 200,
  timestamp,
  headers,
  extraParams = {},
} = {}) {
  if (!appId) {
    throw new Error('appId 不能为空');
  }
  if (!consumerSecret) {
    throw new Error('consumerSecret 不能为空');
  }
  if (!appPoiCode) {
    throw new Error('appPoiCode 不能为空');
  }
  if (startDate === undefined) {
    throw new Error('startDate 不能为空');
  }
  if (endDate === undefined) {
    throw new Error('endDate 不能为空');
  }

  const ts = toUnixSeconds(timestamp ?? Date.now() / 1000, 'timestamp');

  const params = {
    app_id: String(appId),
    app_poi_code: String(appPoiCode),
    start_date: toUnixSeconds(startDate, 'startDate'),
    end_date: toUnixSeconds(endDate, 'endDate'),
    offset: String(offset),
    limit: String(limit),
    timestamp: ts,
    ...normalizeExtra(extraParams),
  };

  const sig = buildSignature(GET_BILL_LIST_URL, params, consumerSecret);
  const requestParams = { ...params, sig };

  const data = await getWithHeaders(GET_BILL_LIST_URL, requestParams, {
    'Content-Type': 'application/x-www-form-urlencoded',
    ...headers,
  });

  return data;
}

/**
 * 将输入转成秒级时间戳的字符串，支持数字/字符串/Date。
 */
function toUnixSeconds(value, fieldName) {
  if (value === undefined || value === null) {
    throw new Error(`${fieldName} 不能为空`);
  }

  if (value instanceof Date) {
    return String(Math.floor(value.getTime() / 1000));
  }

  const str = String(value).trim();
  if (str.length === 0) {
    throw new Error(`${fieldName} 不能为空字符串`);
  }

  if (/^-?\d+(?:\.\d+)?$/.test(str)) {
    const num = Number(str);
    if (Number.isNaN(num)) {
      throw new Error(`${fieldName} 不是有效数字`);
    }
    return String(Math.floor(num));
  }

  const parsed = dayjs(str);
  if (!parsed.isValid()) {
    throw new Error(`${fieldName} 无法解析为有效日期`);
  }

  return String(parsed.startOf('day').unix());
}

/**
 * 将 extraParams 中非空值转成字符串，避免签名字段写死。
 */
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
 * 示例方法：填写自己的参数后可直接本地调用。
 */
async function runGetBillListDemo() {
  const appId = '9423';
  const consumerSecret = '';
  const appPoiCode = 't_JYpLtdQTsC';
  const startDate = '2025-09-01';
  const endDate = '2025-09-01';

  try {
    const result = await getBillList({
      appId,
      consumerSecret,
      appPoiCode,
      startDate,
      endDate,
      offset: 0,
      limit: 200,
    });
    console.log('获取账单成功:', result);
  } catch (err) {
    console.error('获取账单失败:', err.message);
  }
}

module.exports = {
  getBillList,
  runGetBillListDemo,
  GET_BILL_LIST_URL,
};

if (require.main === module) {
  runGetBillListDemo();
}
