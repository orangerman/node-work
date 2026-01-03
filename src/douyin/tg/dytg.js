/**
 * 抖音团购餐饮账单查询脚本
 * 功能：查询提现记录，根据提现记录查询订单，并导出为CSV文件
 */
const { getWithHeaders } = require('../../util/httpClient');
const fs = require('fs').promises;
const path = require('path');

// API配置
const API_URLS = {
  withdraw: 'https://open.douyin.com/goodlife/v1/settle/withdraw/catering_query/',
  order: 'https://open.douyin.com/goodlife/v1/settle/bill/catering_query/',
};

// 配置
const ACCESS_TOKEN = 'clt.7337a7fc6b5d5e1169a518e753e48556pYSXYF8qvk3z0h1SFyemwSR46es2_hl';
const PAGE_SIZE = 50;

// 获取所有账户的提现记录
async function getAllWithdraws(accountIdList, startDate, endDate) {
  const allWithdraws = [];

  for (const accountId of accountIdList) {
    console.log(`查询账户 ${accountId}...`);
    const withdraws = await getWithdrawsByAccount(accountId, startDate, endDate);
    allWithdraws.push(...withdraws);
  }

  console.log(`共获取 ${allWithdraws.length} 条提现记录`);
  return allWithdraws;
}

// 获取单个账户的提现记录
async function getWithdrawsByAccount(accountId, startDate, endDate) {
  try {
    const params = {
      account_id: accountId,
      cursor: 0,
      start_date: startDate,
      end_date: endDate,
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
async function getOrdersByWithdraw(accountId, withdrawId, billDate) {
  const records = [];
  let cursor = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      const params = {
        account_id: accountId,
        cursor,
        bill_date: billDate,
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

// 将订单数据转换为CSV格式
function convertToCSV(orders) {
  if (orders.length === 0) {
    return '';
  }

  // 获取所有字段名（使用第一条记录的键）
  const headers = Object.keys(orders[0]);

  // 生成CSV头部
  const csvHeaders = headers.join(',');

  // 生成CSV数据行
  const csvRows = orders.map(order => {
    return headers.map(header => {
      const value = order[header];
      // 处理包含逗号、引号或换行符的值
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
}

// 导出订单到CSV文件
async function exportOrdersToCSV(withdrawId, orders) {
  if (orders.length === 0) {
    console.log(`提现 ${withdrawId} 没有订单记录，跳过导出`);
    return;
  }

  const csvContent = convertToCSV(orders);
  const fileName = `withdraw_${withdrawId}.csv`;
  const filePath = path.join(__dirname, fileName);

  try {
    await fs.writeFile(filePath, csvContent, 'utf8');
    console.log(`✓ 已导出 ${orders.length} 条订单到文件: ${fileName}`);
  } catch (error) {
    console.error(`导出文件失败 (${fileName}):`, error);
  }
}

// 处理单个提现记录
async function processWithdraw(withdraw, billDate) {
  console.log(`\n处理提现 ${withdraw.withdraw_id} (账户: ${withdraw.account_id})`);

  const orders = await getOrdersByWithdraw(
    withdraw.account_id,
    withdraw.withdraw_id,
    billDate
  );

  console.log(`获取到 ${orders.length} 条订单记录`);

  await exportOrdersToCSV(withdraw.withdraw_id, orders);
}

// 主函数
async function main() {
  try {
    // 配置参数（可根据需要修改）
    const accountIdList = ['7418855095859077419']; // 账户ID列表
    const startDate = '2024-12-01'; // 开始日期
    const endDate = '2024-12-31'; // 结束日期
    const billDate = '2024-12-01'; // 账单日期

    console.log('开始查询提现记录...');
    console.log(`账户列表: ${accountIdList.join(', ')}`);
    console.log(`日期范围: ${startDate} ~ ${endDate}`);
    console.log(`账单日期: ${billDate}\n`);

    const allWithdraws = await getAllWithdraws(accountIdList, startDate, endDate);

    if (allWithdraws.length === 0) {
      console.log('未找到提现记录');
      return;
    }

    console.log(`\n开始处理 ${allWithdraws.length} 条提现记录...\n`);

    for (const withdraw of allWithdraws) {
      await processWithdraw(withdraw, billDate);
    }

    console.log('\n所有提现记录处理完成！');
  } catch (error) {
    console.error('执行失败:', error);
  }
}

// 执行
main().catch(error => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});
