const dayjs = require('dayjs');
const { getWithHeaders } = require('../../util/httpClient');

const withdrawUrl =
  'https://open.douyin.com/goodlife/v1/settle/withdraw/catering_query/';

const queryOrderUrl =
  'https://open.douyin.com/goodlife/v1/settle/bill/catering_query/';

const queryLegerUrl =
  'https://open.douyin.com/goodlife/v1/settle/bill/query_leger_url/';

// 抖音token
const access_token = '';

// 常量配置
const ACCOUNT_ID = '7109311407841085473';

const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD'); // 今天

const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD'); // 今天

const DEFAULT_SIZE = 50; // 每页数量，最大50

// 主函数
async function main() {
  var res = await getBillFile();
  console.log(res);
}

// 执行主函数
main().catch(console.error);

async function getCateringWithdrawInfo() {
  try {
    var params = {
      account_id: ACCOUNT_ID,
      cursor: 0,
      start_date: DEFAULT_START_DATE,
      end_date: DEFAULT_END_DATE,
      size: DEFAULT_SIZE,
    };
    const res = await getWithHeaders(withdrawUrl, params, {
      'access-token': access_token,
    });
    console.log(JSON.stringify(res.data.bill_withdraw_records, null, 2));
    return res.data.bill_withdraw_records;
  } catch (error) {
    console.error('获取餐饮提现信息失败:', error);
  }
}

async function getOrderByWithdrawId(withdrawId) {
  try {
    var params = {
      account_id: ACCOUNT_ID,
      cursor: 0,
      bill_date: DEFAULT_START_DATE,
      withdraw_id: withdrawId,
      size: DEFAULT_SIZE,
    };
    const res = await getWithHeaders(queryOrderUrl, params, {
      'access-token': access_token,
    });
    console.log(JSON.stringify(res.data, null, 2));
    return res;
  } catch (error) {
    console.error('餐饮账单详情查询失败:', error);
  }
}

async function getBillFile() {
  try {
    var params = {
      account_id: ACCOUNT_ID,
      launch_date: '2025-09-12',
    };
    const res = await getWithHeaders(queryLegerUrl, params, {
      'access-token': access_token,
    });
    console.log(JSON.stringify(res.data, null, 2));
    return res;
  } catch (error) {
    console.error('离线分账单查询失败:', error);
  }
}
