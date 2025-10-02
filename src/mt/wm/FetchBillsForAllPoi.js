const { getPoiIds } = require('./GetPoiId');
const { getBillList } = require('./GetBillList');

/**
 * 先获取所有门店，再按门店逐个查询账单。
 *
 * @param {Object} options
 * @param {string|number} options.appId 美团 APP ID。
 * @param {string} options.consumerSecret 接入方 consumer_secret。
 * @param {string|number|Date} options.startDate 账单起始日期（支持时间戳或 YYYY-MM-DD）。
 * @param {string|number|Date} options.endDate 账单结束日期（支持时间戳或 YYYY-MM-DD）。
 * @param {string|number} [options.offset=0] 分页偏移量。
 * @param {string|number} [options.limit=200] 每页条数，<=200。
 * @param {Object} [options.poiOptions] 对门店接口的附加参数（如 headers、timestamp、extraParams、extractPoiIds）。
 * @param {Object} [options.billOptions] 对账单接口的附加参数（如 headers、extraParams、timestamp）。
 * @param {(info: { appPoiCode: string, index: number, total: number }) => void} [options.onProgress] 进度回调。
 * @returns {Promise<{ poiIds: string[], results: Array<{ appPoiCode: string, data?: any, error?: any }>, rawPoiResponse: any }>}
 */
async function fetchBillsForAllPoi({
  appId,
  consumerSecret,
  startDate,
  endDate,
  offset = 0,
  limit = 200,
  poiOptions = {},
  billOptions = {},
  onProgress,
} = {}) {
  if (!appId) {
    throw new Error('appId 不能为空');
  }
  if (!consumerSecret) {
    throw new Error('consumerSecret 不能为空');
  }
  if (startDate === undefined || endDate === undefined) {
    throw new Error('startDate 和 endDate 不能为空');
  }

  const {
    headers: poiHeaders,
    timestamp: poiTimestamp,
    extractPoiIds = defaultExtractPoiIds,
    extraParams: poiExtraParams,
  } = poiOptions;

  const poiResponse = await getPoiIds({
    appId,
    consumerSecret,
    timestamp: poiTimestamp,
    headers: poiHeaders,
    extraParams: poiExtraParams,
  });

  const poiIds = normalizePoiIds(extractPoiIds(poiResponse));
  const results = [];

  for (let index = 0; index < poiIds.length; index += 1) {
    const appPoiCode = poiIds[index];

    if (typeof onProgress === 'function') {
      onProgress({ appPoiCode, index, total: poiIds.length });
    }

    try {
      const data = await getBillList({
        appId,
        consumerSecret,
        appPoiCode,
        startDate,
        endDate,
        offset,
        limit,
        headers: billOptions.headers,
        extraParams: billOptions.extraParams,
        timestamp: billOptions.timestamp,
      });

      results.push({ appPoiCode, data });
    } catch (error) {
      results.push({ appPoiCode, error: serializeError(error) });
    }
  }

  return {
    poiIds,
    results,
    rawPoiResponse: poiResponse,
  };
}

function normalizePoiIds(list) {
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .map((item) => (item == null ? '' : String(item).trim()))
    .filter((item) => item.length > 0);
}

function defaultExtractPoiIds(response) {
  if (!response) return [];
  if (Array.isArray(response)) return response;

  const candidates = [];
  if (Array.isArray(response.data)) candidates.push(response.data);
  if (response.data && typeof response.data === 'object') {
    const data = response.data;
    if (Array.isArray(data.poi_ids)) candidates.push(data.poi_ids);
    if (Array.isArray(data.app_poi_codes)) candidates.push(data.app_poi_codes);
    if (Array.isArray(data.list)) candidates.push(data.list);
    if (Array.isArray(data.pois)) candidates.push(data.pois);
  }
  if (Array.isArray(response.poi_ids)) candidates.push(response.poi_ids);
  if (Array.isArray(response.app_poi_codes)) candidates.push(response.app_poi_codes);
  if (Array.isArray(response.list)) candidates.push(response.list);

  const found = candidates.find((arr) => Array.isArray(arr) && arr.length > 0);
  return found || [];
}

function serializeError(error) {
  if (!error) {
    return { message: '未知错误' };
  }

  const basic = {
    message: error.message || String(error),
  };

  if (error.code) {
    basic.code = error.code;
  }

  if (error.response) {
    basic.status = error.response.status;
    basic.statusText = error.response.statusText;
    basic.responseData = error.response.data;
  }

  return basic;
}

/**
 * 示例：依次拉取所有门店账单。
 */
async function runFetchBillsDemo() {
  const appId = '';
  const consumerSecret = '';
  const startDate = '2024-01-01';
  const endDate = '2024-01-31';

  try {
    const result = await fetchBillsForAllPoi({
      appId,
      consumerSecret,
      startDate,
      endDate,
      poiOptions: {
        headers: {
          // 如需自定义 header，这里填写
        },
      },
      billOptions: {
        headers: {
          // 如需自定义 header，这里填写
        },
      },
      onProgress(info) {
        console.log(`正在查询门店 ${info.index + 1}/${info.total}: ${info.appPoiCode}`);
      },
    });

    console.log('门店数量:', result.poiIds.length);
    console.log('账单结果:', JSON.stringify(result.results, null, 2));
  } catch (error) {
    console.error('批量获取账单失败:', error.message);
  }
}

module.exports = {
  fetchBillsForAllPoi,
  runFetchBillsDemo,
};

if (require.main === module) {
  runFetchBillsDemo();
}
