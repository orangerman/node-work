const dayjs = require('dayjs');
const { getWithHeaders } = require('./util/httpClient');

const trade_detail_list =
  'https://api-account.lcsw.cn/api/trade/getTradeDatalist';

function getTradeDetailList(brand_no,trade_type,create_date,cookie) {
  var create_start_time = create_date + " 00:00:00";
  var create_end_time = create_date + " 23:59:59";
  var params = {
    brand_no: brand_no,
    trade_type: trade_type,
    trade_status: 1,
    create_start_time: create_start_time,
    create_start_time: create_end_time,
    page_size: 100,
    page_number: 1,
  };
  const res = await getWithHeaders(trade_detail_list, params, {
    authorization: cookie,
  });
  console.log(JSON.stringify(res.data, null, 2));
}

module.exports = { getTradeDetailList };
