# GEMINI.md

该文件为 Gemini 在处理该代码库中的代码时提供指导。

## 项目概述

这是一个 Node.js 项目，用于处理来自不同平台（快手团购、抖音团购）的订单账单获取和数据分析。项目主要用于资金分账和账单获取的业务系统。

## 项目结构

```
src/
├── index.js              # 项目入口文件 (Hello World示例)
├── util/                 # 工具类目录
│   └── httpClient.js    # HTTP客户端封装 (支持GET/POST请求，带header处理)
├── ks/                  # 快手相关功能
│   └── ks.js           # 快手团购订单查询API集成
└── douyin/             # 抖音相关功能
    └── tg/
        ├── dytg.js     # 抖音团购账单查询API集成
        └── tg.json     # 团购订单数据样例
```

## 常用命令

### 运行项目
```bash
# 运行主入口文件
node src/index.js

# 运行快手团购订单查询
node src/ks/ks.js

# 运行抖音团购账单查询
node src/douyin/tg/dytg.js
```

### 开发环境
```bash
# 安装依赖
npm install

# 测试 (目前未配置具体测试)
npm test
```

## 技术栈

- **Node.js运行环境**
- **axios**: HTTP请求库，用于调用第三方API
- **dayjs**: 轻量级日期处理库，用于处理时间格式化
- **lodash**: JavaScript工具库，用于数据处理
- **moment**: 备用日期库

## 核心功能模块

### 1. HTTP客户端工具 (src/util/httpClient.js)
- `getWithHeaders(url, params, headers)`: 带请求头的GET请求
- `postWithHeaders(url, data, headers)`: 带请求头的POST请求
- 统一错误处理和响应格式化

### 2. 快手团购集成 (src/ks/ks.js)
- 快手团购订单查询API调用
- 支持按结算日期查询订单
- 使用access-token进行API认证

### 3. 抖音团购集成 (src/douyin/tg/dytg.js)
- 抖音餐饮提现信息查询
- 账单详情批量获取（支持分页）
- 离线分账单查询（已注释）

## API配置说明

所有API调用都需要配置access_token：
- 快手团购API: `src/ks/ks.js` 第9行
- 抖音团购API: `src/douyin/tg/dytg.js` 第15-16行

## 数据处理特点

- 日期格式统一使用 `YYYY-MM-DD`
- 默认查询前一天到今天的数据范围
- 支持分页查询，单页最大50条记录
- 金额字段以分为单位处理
- 使用console.log输出JSON格式数据便于调试

## 开发注意事项

- 所有异步操作使用async/await模式
- API请求失败会记录错误日志并继续执行
- access_token需要根据实际环境配置
- 分页查询通过cursor和has_more字段控制循环
