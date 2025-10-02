/**
 * 抖音团购餐饮账单查询与统计脚本
 */
const { getWithHeaders } = require('../../util/httpClient');

// API配置
const API_URLS = {
  withdraw: 'https://open.douyin.com/goodlife/v1/settle/withdraw/catering_query/',
  order: 'https://open.douyin.com/goodlife/v1/settle/bill/catering_query/',
};

// 配置
const ACCESS_TOKEN = 'clt.7337a7fc6b5d5e1169a518e753e48556pYSXYF8qvk3z0h1SFyemwSR46es2_hl';
const ACCOUNT_IDS = [
  '7047437174853240835',
  '7306031614503421964',
  '7038469403746240550',
];
const QUERY_DATE = '2024-12-21';
const PAGE_SIZE = 50;

// 工具函数
const formatAmount = (amount) => (amount / 100).toFixed(2);
const isEmpty = (value) => !value || value === '' || value === null || value === undefined;

// 获取所有账户的提现记录
async function getAllWithdraws() {
  const allWithdraws = [];

  for (const accountId of ACCOUNT_IDS) {
    console.log(`查询账户 ${accountId}...`);
    const withdraws = await getWithdrawsByAccount(accountId);
    allWithdraws.push(...withdraws);
  }

  console.log(`共获取 ${allWithdraws.length} 条提现记录`);
  return allWithdraws;
}

// 获取单个账户的提现记录
async function getWithdrawsByAccount(accountId) {
  try {
    const params = {
      account_id: accountId,
      cursor: 0,
      start_date: QUERY_DATE,
      end_date: QUERY_DATE,
      size: PAGE_SIZE,
    };

    const res = await getWithHeaders(API_URLS.withdraw, params, {
      'access-token': ACCESS_TOKEN,
    });

    if (res?.data?.bill_withdraw_records) {
      return res.data.bill_withdraw_records.map(record => ({
        ...record,
        account_id: accountId
      }));
    }
    return [];
  } catch (error) {
    console.error(`账户 ${accountId} 查询失败:`, error);
    return [];
  }
}

// 获取提现对应的订单记录
async function getOrdersByWithdraw(withdrawId) {
  const records = [];
  let cursor = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      const params = {
        account_id: ACCOUNT_IDS[0], // 使用第一个账户ID查询
        cursor,
        bill_date: QUERY_DATE,
        withdraw_id: withdrawId,
        size: PAGE_SIZE,
      };

      const res = await getWithHeaders(API_URLS.order, params, {
        'access-token': ACCESS_TOKEN,
      });

      if (res?.data) {
        hasMore = res.data.has_more;
        cursor = res.data.cursor;

        if (res.data.ledger_records?.length > 0) {
          records.push(...res.data.ledger_records);
        }
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error(`查询订单失败 (withdraw_id: ${withdrawId}):`, error);
      hasMore = false;
    }
  }

  return records;
}

// 处理单个提现记录
async function processWithdraw(withdraw, stats) {
  console.log(`处理提现 ${withdraw.withdraw_id} (账户: ${withdraw.account_id})`);

  // 初始化账户统计
  if (!stats.accountStats.has(withdraw.account_id)) {
    stats.accountStats.set(withdraw.account_id, {
      totalAmount: 0,
      orderCount: 0,
      poiStats: new Map(),
      emptyPoiCount: 0,
      emptyPoiAmount: 0
    });
  }

  const orders = await getOrdersByWithdraw(withdraw.withdraw_id);
  const accountStat = stats.accountStats.get(withdraw.account_id);

  orders.forEach((order, index) => {
    const amount = processOrderAmount(order);

    // 更新总计
    stats.totalAmount += amount;
    accountStat.totalAmount += amount;
    accountStat.orderCount++;

    // 处理POI统计
    if (isEmpty(order.poi_id)) {
      processEmptyPoiOrder(withdraw, order, index, amount, stats, accountStat);
    } else {
      updatePoiStats(order.poi_id, amount, stats.poiStats);
      updatePoiStats(order.poi_id, amount, accountStat.poiStats);
    }
  });
}

// 处理订单金额（正负数转换）
function processOrderAmount(order) {
  let amount = order.fund_amount;
  if (order.fund_amount_type !== 0) {
    amount = -amount;
  }
  return amount;
}

// 处理空POI订单
function processEmptyPoiOrder(withdraw, order, index, amount, stats, accountStat) {
  const key = `${withdraw.withdraw_id}_${index}`;

  stats.emptyPoiOrders.set(key, {
    account_id: withdraw.account_id,
    withdraw_id: withdraw.withdraw_id,
    order_index: index,
    amount,
    original_amount: order.fund_amount,
    amount_type: order.fund_amount_type
  });

  // 更新空POI统计
  accountStat.emptyPoiCount++;
  accountStat.emptyPoiAmount += amount;

  // 计入全局POI统计
  updatePoiStats('EMPTY_POI', amount, stats.poiStats);
}

// 更新POI统计
function updatePoiStats(poiId, amount, poiMap) {
  poiMap.set(poiId, (poiMap.get(poiId) || 0) + amount);
}

// 打印统计结果
function printStatistics(stats) {
  // 总体统计
  console.log('\n=== 总体统计 ===');
  console.log(`总金额: ${stats.totalAmount}分 (${formatAmount(stats.totalAmount)}元)`);
  console.log('POI分组统计:', stats.poiStats);

  // 账户统计
  console.log('\n=== 账户统计 ===');
  stats.accountStats.forEach((summary, accountId) => {
    console.log(`\n账户 ${accountId}:`);
    console.log(`  订单数: ${summary.orderCount}`);
    console.log(`  总金额: ${summary.totalAmount}分 (${formatAmount(summary.totalAmount)}元)`);
    console.log(`  空POI订单: ${summary.emptyPoiCount}条, ${summary.emptyPoiAmount}分`);

    if (summary.poiStats.size > 0) {
      console.log('  POI统计:');
      summary.poiStats.forEach((amount, poiId) => {
        console.log(`    ${poiId}: ${amount}分 (${formatAmount(amount)}元)`);
      });
    }
  });

  // 空POI详情
  console.log('\n=== 空POI订单详情 ===');
  console.log(`总数: ${stats.emptyPoiOrders.size}条`);

  if (stats.emptyPoiOrders.size > 0) {
    stats.emptyPoiOrders.forEach((order, key) => {
      console.log(`${key}:`, {
        账户: order.account_id,
        提现ID: order.withdraw_id,
        金额: `${order.amount}分 (${formatAmount(order.amount)}元)`,
        类型: order.amount_type === 0 ? '正数' : '负数'
      });
    });
  }
}

// 主函数
async function main() {
  try {
    const allWithdraws = await getAllWithdraws();

    const stats = {
      totalAmount: 0,
      poiStats: new Map(),
      accountStats: new Map(),
      emptyPoiOrders: new Map()
    };

    for (const withdraw of allWithdraws) {
      await processWithdraw(withdraw, stats);
    }

    printStatistics(stats);
  } catch (error) {
    console.error('执行失败:', error);
  }
}

// 执行
main().catch(error => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});