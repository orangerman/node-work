const dayjs = require('dayjs');
const { getWithHeaders } = require('../util/httpClient');

const trade_detail_list =
  'https://api-account.lcsw.cn/api/trade/getTradeDatalist';

const cookie =
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3NTk4ODYwMTQsImlhdCI6MTc1OTg4NDIxNCwidXNlcklkIjoxMDM1Nzc1MiwidXNlcm5hbWUiOiJmYW56cXl1bnlpbmciLCJuaWNrbmFtZSI6IuiMg-W_l-W8uiIsIm5hbWUiOiLov5DokKXkurrlkZgiLCJ0eXBlIjoxLCJzdGF0dXMiOjAsInJvbGVzSWQiOjIsInJvbGUiOiJST0xFX09QUyIsImZpZCI6NzY1LCJsYXN0aXAiOiI1OS4xNzQuMTgyLjExNyIsImlzcyI6Imxjc3ciLCJqdGkiOiJhZWYxODBmMDllOTZiOTQ2OGQ5YmI2NDlmYjUwNjc1MiJ9.4pUXJvXLpyo0esuRZNa7SWaCPGJwtSI5JK3qB9A3Cvs';

async function getTradeDetailList() {
  var params = {
    brand_no: '60678987',
    trade_type: 9,
    trade_status: 1,
    create_start_time: '2025-10-08 00:00:00',
    create_start_time: '2025-10-08 23:59:59',
    page_size: 10,
    page_number: 1,
  };
  const res = await getWithHeaders(trade_detail_list, params, {
    authorization: cookie,
  });
  console.log(JSON.stringify(res.data, null, 2));
}
// 执行
getTradeDetailList().catch((error) => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});
