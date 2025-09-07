const axios = require('axios');

async function postWithHeaders(url, data, headers = {}) {
  try {
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        ...headers, // 可以传额外的 header 进来
      },
    });

    // axios 默认会把 JSON 响应转成对象
    return response.data;
  } catch (error) {
    console.error('请求出错:', error.message);
    throw error;
  }
}

module.exports = { postWithHeaders };
