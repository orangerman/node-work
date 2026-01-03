const dayjs = require('dayjs');
const { getWithHeaders } = require('../util/httpClient');

// 快手团购获取订单接口
const queryOrderUrl =
  'https://lbs-open.kwailocallife.com/goodlife/lbs/bill/query/v2';

// 快手团购token
const access_token = '12';

// 结算日期
const DEFAULT_SETTLE_DATE = dayjs().format('YYYY-MM-DD');

async function main() {
  var res = await queryOrder();
}

main()
  .catch(console.error);

async function queryOrder() {
  try {
    var params = {
      cursor: 0,
      size: 200,
      bill_date: DEFAULT_SETTLE_DATE,
    };

    const res = await getWithHeaders(queryOrderUrl, params, {
      'access-token': access_token,
    });
    // console.log(res);
    console.log(JSON.stringify(res.data, null, 2));
    return res.data.records;
  } catch (error) {
    console.error(error);
  }
}
