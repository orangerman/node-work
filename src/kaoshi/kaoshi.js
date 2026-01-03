const axios = require('axios');
const https = require('https');

// 创建自定义的axios实例，跳过SSL验证
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const apiClient = axios.create({
  httpsAgent: httpsAgent,
  timeout: 30000, // 30秒超时
});

/**
 * 批量更新课程学习时间
 * @param {Array} courseList - 课程列表
 * @param {number} userStudyTime - 用户学习时间，默认4000秒
 */
async function batchUpdateStudyRecords(courseList, userStudyTime = 4000) {
  console.log(`开始批量更新课程学习时间，共${courseList.length}门课程`);

  const results = {
    success: [],
    failed: [],
  };

  for (let i = 0; i < courseList.length; i++) {
    const course = courseList[i];
    try {
      console.log(
        `正在更新课程 ${i + 1}/${courseList.length}: ${course.courseName}`
      );
      const result = await updateStudyRecord(course.courseId, userStudyTime);
      results.success.push({
        courseId: course.courseId,
        courseName: course.courseName,
        result,
      });
      console.log(`✓ 课程 ${course.courseName} 更新成功`);
    } catch (error) {
      results.failed.push({
        courseId: course.courseId,
        courseName: course.courseName,
        error: error.message,
      });
      console.error(`✗ 课程 ${course.courseName} 更新失败:`, error.message);
    }

    // 添加延迟避免请求过于频繁
    if (i < courseList.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log('\n=== 批量更新完成 ===');
  console.log(`成功: ${results.success.length}门课程`);
  console.log(`失败: ${results.failed.length}门课程`);

  if (results.failed.length > 0) {
    console.log('\n失败的课程:');
    results.failed.forEach((item) => {
      console.log(`- ${item.courseName} (ID: ${item.courseId}): ${item.error}`);
    });
  }

  return results;
}

/**
 * 更新单个课程学习记录（带重试机制）
 * @param {number} courseId - 课程ID
 * @param {number} userStudyTime - 用户学习时间
 * @param {number} retryCount - 重试次数
 */
async function updateStudyRecord(courseId, userStudyTime, retryCount = 3) {
  const url = `https://szrs.rsj.wuhan.gov.cn/jxjy-ui/jxjy/declare/jxusercoursemanage/updateStudyRecord?courseId=${courseId}&userStudyTime=${userStudyTime}`;

  const headers = {
    accept: 'application/json, text/plain, */*',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
    authorization:
      'BearereyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJsb2dpbl90aW1lIjoxNzY3MTg0NzMyLCJtZW1iZXJEb2N1bWVudHMiOiI0MjEwMjIxOTk0MTEwNDQ1MjUiLCJleHBpcmVfdGltZSI6IjQzMjAwIiwidXVpZCI6IjU4MDgyMCJ9.JjobNhrC1YlgnXRvkCINIEusGUd55bZjnzi0_9n1m80',
    'sec-ch-ua':
      '"Not(A:Brand";v="8", "Chromium";v="144", "Microsoft Edge";v="144"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    cookie:
      'mozi-assist={%22show%22:false%2C%22audio%22:false%2C%22speed%22:%22middle%22%2C%22zomm%22:1%2C%22cursor%22:false%2C%22pointer%22:false%2C%22bigtext%22:false%2C%22overead%22:false}',
    Referer: `https://szrs.rsj.wuhan.gov.cn/jxjy-ui/exam/videoDetail?courseId=${courseId}`,
  };

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      console.log(`    尝试第 ${attempt} 次请求...`);
      const response = await apiClient.put(url, null, { headers });
      console.log(`    ✓ API响应状态: ${response.status}`);
      return response.data;
    } catch (error) {
      console.log(`    ✗ 第 ${attempt} 次请求失败: ${error.message}`);

      if (attempt === retryCount) {
        // 最后一次重试失败，抛出错误
        if (error.response) {
          throw new Error(
            `HTTP ${error.response.status}: ${
              error.response.data?.message || error.response.statusText
            }`
          );
        } else if (
          error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
          error.code === 'CERT_HAS_EXPIRED' ||
          error.message.includes('certificate')
        ) {
          throw new Error(`SSL证书验证失败: ${error.message}`);
        } else if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
          throw new Error(`网络连接失败: ${error.message}`);
        } else {
          throw new Error(`网络错误: ${error.message}`);
        }
      }

      // 等待后重试
      const waitTime = attempt * 2000; // 2秒、4秒、6秒
      console.log(`    等待 ${waitTime}ms 后重试...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
}

// 主执行函数
async function main() {
  try {
    // 从注释的JSON中提取课程列表数据
    const courseListData = getCourseListFromComments();

    if (!courseListData || courseListData.length === 0) {
      console.log('课程列表为空，无需更新');
      return;
    }

    // 批量更新课程学习时间
    await batchUpdateStudyRecords(courseListData, 4000);
  } catch (error) {
    console.error('执行过程中发生错误:', error.message);
  }
}

/**
 * 从注释中的JSON数据提取课程列表
 * 包含所有44门课程的数据
 */
function getCourseListFromComments() {
  const courseListResponse = {
    code: 200,
    data: {
      total: 44,
      list: [
        {
          courseId: 1842,
          courseName: '数字经济发展、数字化转型及其创新创业实践（上）',
          studyTime: 2160,
        },
        {
          courseId: 1834,
          courseName: 'DeepSeek的创新与生成式人工智能的应用',
          studyTime: 2580,
        },
        {
          courseId: 1832,
          courseName: '人工智能革命与Deepseek引发中国智能化加速（上）',
          studyTime: 1860,
        },
        {
          courseId: 1843,
          courseName: '数字经济发展、数字化转型及其创新创业实践（下）',
          studyTime: 1860,
        },
        { courseId: 1844, courseName: '数字经济的定义和范畴', studyTime: 3300 },
        {
          courseId: 1833,
          courseName: '人工智能革命与Deepseek引发中国智能化加速（下）',
          studyTime: 1740,
        },
        {
          courseId: 1808,
          courseName: '涉密计算机和涉密移动存储介质管理',
          studyTime: 1320,
        },
        {
          courseId: 1828,
          courseName: '情绪管理和压力疏导的基本功',
          studyTime: 2580,
        },
        {
          courseId: 1802,
          courseName: '发展新质生产力，推动区域经济高质量发展（上）',
          studyTime: 1740,
        },
        {
          courseId: 1800,
          courseName: '新质生产力推动高质量发展的作用和机制',
          studyTime: 1620,
        },
        { courseId: 1810, courseName: '解读《著作权法》', studyTime: 2100 },
        {
          courseId: 1821,
          courseName: '经济结构调整与低空经济的产业前景（中）',
          studyTime: 2220,
        },
        { courseId: 1809, courseName: '知识产权法', studyTime: 1260 },
        {
          courseId: 1820,
          courseName: '经济结构调整与低空经济的产业前景（上）',
          studyTime: 2760,
        },
        { courseId: 1815, courseName: '解析智慧园区国内案例', studyTime: 1500 },
        {
          courseId: 1819,
          courseName: '加快推动低空经济发展，塑造经济发展新动能',
          studyTime: 3180,
        },
        {
          courseId: 1823,
          courseName: '时代浪潮下的健康新宠——森林康养',
          studyTime: 1620,
        },
        {
          courseId: 1826,
          courseName: '做好情绪管理，保持心态稳定',
          studyTime: 2220,
        },
        { courseId: 1814, courseName: '智慧园区行业前沿', studyTime: 2760 },
        { courseId: 1811, courseName: '解读《专利法》', studyTime: 1620 },
        { courseId: 1824, courseName: '全球森林康养发展概况', studyTime: 2460 },
        { courseId: 1818, courseName: '抢抓大数据时代机遇', studyTime: 1680 },
        {
          courseId: 1827,
          courseName: '积极应对压力，做好压力疏导',
          studyTime: 2280,
        },
        { courseId: 1812, courseName: '解读《商标法》', studyTime: 1320 },
        {
          courseId: 1837,
          courseName: '着力营造科技园区创新生态，加快培育科技创新人才',
          studyTime: 2520,
        },
        {
          courseId: 1801,
          courseName: '新质生产力推动高质量发展的理论与实践',
          studyTime: 2100,
        },
        {
          courseId: 1806,
          courseName: '保密范围与保密法科技含量',
          studyTime: 2280,
        },
        { courseId: 1817, courseName: '大数据的应用', studyTime: 3120 },
        { courseId: 1816, courseName: '大数据时代新思维', studyTime: 1860 },
        {
          courseId: 1840,
          courseName: '数字经济：数字产业化和产业数字化',
          studyTime: 3180,
        },
        {
          courseId: 1813,
          courseName: '工业互联网赋能产业数字化转型',
          studyTime: 2340,
        },
        {
          courseId: 1805,
          courseName: '强化保密意识，遵循保密工作原则',
          studyTime: 2760,
        },
        {
          courseId: 1822,
          courseName: '经济结构调整与低空经济的产业前景（下）',
          studyTime: 2280,
        },
        {
          courseId: 1825,
          courseName: '情绪、压力的概念和分类',
          studyTime: 2400,
        },
        {
          courseId: 1841,
          courseName: '数字经济发展趋势与产业机遇',
          studyTime: 2880,
        },
        {
          courseId: 1839,
          courseName: '构建智慧城市建设的体制机制',
          studyTime: 1740,
        },
        {
          courseId: 1804,
          courseName: '发展新质生产力，推动区域经济高质量发展（下）',
          studyTime: 2100,
        },
        {
          courseId: 1803,
          courseName: '发展新质生产力，推动区域经济高质量发展（中）',
          studyTime: 2700,
        },
        {
          courseId: 1838,
          courseName: '智慧城市建设的模式和路径',
          studyTime: 2040,
        },
        { courseId: 1807, courseName: '涉密文件管理', studyTime: 2040 },
        {
          courseId: 1829,
          courseName: '5G+人工智能赋能智慧文旅',
          studyTime: 2100,
        },
        {
          courseId: 1831,
          courseName: '人工智能在智慧教育中的应用策略分析',
          studyTime: 2700,
        },
        { courseId: 1836, courseName: '新时代人才强国战略', studyTime: 1500 },
        {
          courseId: 1830,
          courseName: '人工智能重塑教育领域新生态',
          studyTime: 2640,
        },
      ],
    },
  };

  return courseListResponse.data?.list || [];
}

// 如果直接运行此文件，则执行主函数
if (require.main === module) {
  main();
}

// 导出函数供其他模块使用
module.exports = {
  batchUpdateStudyRecords,
  updateStudyRecord,
};
