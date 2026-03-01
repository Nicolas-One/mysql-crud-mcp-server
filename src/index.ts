#!/usr/bin/env node

/**
 * MySQL CRUD MCP 服务器
 * 提供用于 MySQL 数据库操作的工具：SELECT、INSERT、UPDATE、DELETE
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 解析 INI 格式的配置文件
 */
function parseIniConfig(filePath: string): Record<string, Record<string, string>> {
  const config: Record<string, Record<string, string>> = {};

  try {
    if (!fs.existsSync(filePath)) {
      return config;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    let currentSection = '';

    content.split('\n').forEach(line => {
      line = line.trim();

      // 跳过空行和注释
      if (!line || line.startsWith(';') || line.startsWith('#')) {
        return;
      }

      // 检查是否是 section 标题
      const sectionMatch = line.match(/^\[([^\]]+)\]$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1];
        config[currentSection] = {};
        return;
      }

      // 解析 key=value
      const keyValueMatch = line.match(/^([^=]+)=(.*)$/);
      if (keyValueMatch && currentSection) {
        const key = keyValueMatch[1].trim();
        const value = keyValueMatch[2].trim();
        config[currentSection][key] = value;
      }
    });
  } catch (error) {
    // 忽略解析错误
  }

  return config;
}

// 数据库连接配置 - 支持项目级 .env 文件和环境变量
// 支持两种格式：KEY=VALUE 格式 或 INI 格式
function getDatabaseConfig() {
  // 优先级 1: 尝试读取 .env 文件
  // 优先级顺序：当前工作目录 > ENV_PATH环境变量 > 源代码相对路径
  const envPath = process.env.ENV_PATH || path.join(process.cwd(), '.env');

  // 首先尝试解析 INI 格式
  const iniConfig = parseIniConfig(envPath);

  // 然后加载标准 .env 格式
  dotenv.config({ path: envPath });

  // 定义可能的配置名称映射（支持多种命名约定）
  const configNameMappings = {
    host: ['MYSQL_HOST', 'DB_HOST', 'DATABASE_HOST', 'HOST', 'HOSTNAME'],
    port: ['MYSQL_PORT', 'DB_PORT', 'DATABASE_PORT', 'PORT', 'HOSTPORT'],
    user: ['MYSQL_USER', 'DB_USER', 'MYSQL_USERNAME', 'DB_USERNAME', 'DATABASE_USER', 'USERNAME', 'USER'],
    password: ['MYSQL_PASSWORD', 'DB_PASSWORD', 'DATABASE_PASSWORD', 'PASSWORD'],
    database: ['MYSQL_DATABASE', 'DB_NAME', 'DATABASE_NAME', 'DATABASE', 'DB_DATABASE'],
    charset: ['CHARSET', 'CHARACTER_SET']
  };

  // 尝试从环境变量中获取配置值
  function getConfigValue(configKey: string): string | undefined {
    const possibleNames = configNameMappings[configKey as keyof typeof configNameMappings];
    if (!possibleNames) return undefined;

    for (const name of possibleNames) {
      if (process.env[name]) {
        return process.env[name];
      }
    }
    return undefined;
  }

  // 尝试从 INI 配置中获取值
  function getIniConfigValue(configKey: string): string | undefined {
    // 支持 [DATABASE] 和 [MYSQL] 两种 section
    const sections = ['DATABASE', 'MYSQL'];

    for (const section of sections) {
      if (iniConfig[section]) {
        const possibleNames = configNameMappings[configKey as keyof typeof configNameMappings];
        if (possibleNames) {
          for (const name of possibleNames) {
            if (iniConfig[section][name]) {
              return iniConfig[section][name];
            }
          }
        }
      }
    }
    return undefined;
  }

  // 获取所有配置值（优先级：环境变量 > INI 配置 > 默认值）
  const host = getConfigValue('host') || getIniConfigValue('host');
  const port = getConfigValue('port') || getIniConfigValue('port');
  const user = getConfigValue('user') || getIniConfigValue('user');
  const password = getConfigValue('password') || getIniConfigValue('password');
  const database = getConfigValue('database') || getIniConfigValue('database');
  const charset = getConfigValue('charset') || getIniConfigValue('charset') || 'utf8';

  // 检查是否有任何配置被设置
  const hasAnyConfig = host || port || user || password || database;

  if (!hasAnyConfig) {
    throw new Error(
      `MySQL CRUD MCP 服务器需要配置数据库连接信息。\n\n` +
      `配置方式（优先级顺序）：\n\n` +
      `1. 项目级 .env 文件（推荐）\n` +
      `   - 在项目根目录创建 .env 文件\n` +
      `   - 支持两种格式：\n\n` +
      `   格式一：标准 KEY=VALUE 格式\n` +
      `   DB_HOST=127.0.0.1\n` +
      `   DB_PORT=3306\n` +
      `   DB_USER=root\n` +
      `   DB_PASSWORD=your_password\n` +
      `   DB_NAME=your_database\n` +
      `   CHARSET=utf8\n\n` +
      `   格式二：INI 格式（[DATABASE] 或 [MYSQL] section）\n` +
      `   [DATABASE]\n` +
      `   TYPE=mysql\n` +
      `   HOSTNAME=127.0.0.1\n` +
      `   HOSTPORT=3306\n` +
      `   USERNAME=root\n` +
      `   PASSWORD=your_password\n` +
      `   DATABASE=your_database\n` +
      `   CHARSET=utf8\n\n` +
      `   支持的配置名称（任选其一）：\n` +
      `     • 主机: MYSQL_HOST / DB_HOST / DATABASE_HOST / HOST / HOSTNAME\n` +
      `     • 端口: MYSQL_PORT / DB_PORT / DATABASE_PORT / PORT / HOSTPORT\n` +
      `     • 用户: MYSQL_USER / DB_USER / DATABASE_USER / USER / MYSQL_USERNAME / DB_USERNAME / USERNAME\n` +
      `     • 密码: MYSQL_PASSWORD / DB_PASSWORD / DATABASE_PASSWORD / PASSWORD\n` +
      `     • 数据库: MYSQL_DATABASE / DB_NAME / DATABASE_NAME / DATABASE / DB_DATABASE\n` +
      `     • 字符集: CHARSET / CHARACTER_SET (默认: utf8)\n\n` +
      `2. 全局 MCP 配置文件\n` +
      `   - 复制项目中的 cline_mcp_settings.example.json 文件\n` +
      `   - 编辑其中的数据库配置信息\n` +
      `   - 将配置添加到您的 cline_mcp_settings.json 文件中\n` +
      `   - 配置位置: %APPDATA%\\Code\\User\\globalStorage\\saoudrizwan.claude-dev\\settings\\cline_mcp_settings.json\n\n` +
      `或者运行 install.cjs 脚本进行自动配置。`
    );
  }

  // 检查所有必需的配置值
  const requiredConfigs = {
    host: 'MYSQL_HOST / DB_HOST / DATABASE_HOST / HOST',
    port: 'MYSQL_PORT / DB_PORT / DATABASE_PORT / PORT',
    user: 'MYSQL_USER / DB_USER / DATABASE_USER / USER',
    password: 'MYSQL_PASSWORD / DB_PASSWORD / DATABASE_PASSWORD / PASSWORD',
    database: 'MYSQL_DATABASE / DB_NAME / DATABASE_NAME / DATABASE'
  };

  for (const [key, names] of Object.entries(requiredConfigs)) {
    const value = getConfigValue(key) || getIniConfigValue(key);
    if (!value) {
      throw new Error(
        `缺少必需的数据库配置: ${names}\n\n` +
        `请通过以下方式之一配置：\n\n` +
        `1. 在项目根目录的 .env 文件中配置（推荐）\n` +
        `   格式一：标准 KEY=VALUE 格式\n` +
        `   DB_HOST=127.0.0.1\n` +
        `   DB_PORT=3306\n` +
        `   DB_USER=root\n` +
        `   DB_PASSWORD=your_password\n` +
        `   DB_NAME=your_database\n\n` +
        `   格式二：INI 格式\n` +
        `   [DATABASE]\n` +
        `   HOSTNAME=127.0.0.1\n` +
        `   HOSTPORT=3306\n` +
        `   USERNAME=root\n` +
        `   PASSWORD=your_password\n` +
        `   DATABASE=your_database\n\n` +
        `2. 在 MCP 设置中配置环境变量\n\n` +
        `支持的配置名称：\n` +
        `- 主机: MYSQL_HOST / DB_HOST / DATABASE_HOST / HOST / HOSTNAME\n` +
        `- 端口: MYSQL_PORT / DB_PORT / DATABASE_PORT / PORT / HOSTPORT\n` +
        `- 用户: MYSQL_USER / DB_USER / DATABASE_USER / USER / MYSQL_USERNAME / DB_USERNAME / USERNAME\n` +
        `- 密码: MYSQL_PASSWORD / DB_PASSWORD / DATABASE_PASSWORD / PASSWORD\n` +
        `- 数据库: MYSQL_DATABASE / DB_NAME / DATABASE_NAME / DATABASE / DB_DATABASE\n` +
        `- 字符集: CHARSET / CHARACTER_SET (默认: utf8)`
      );
    }
  }

  return {
    host: host!,
    port: parseInt(port!),
    user: user!,
    password: password!,
    database: database!,
    charset: charset,
    connectTimeout: 60000,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

/**
 * 创建 MySQL 连接池
 */
let pool: mysql.Pool;

/**
 * 初始化数据库连接池
 */
async function initializeDatabase() {
  try {
    const dbConfig = getDatabaseConfig();
    pool = mysql.createPool(dbConfig);
    // 测试连接
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.error('MySQL 连接池初始化成功');
  } catch (error) {
    console.error('初始化 MySQL 连接失败:', error);
    throw error;
  }
}

/**
 * 验证 SQL 查询参数
 */
function validateQueryArgs(args: any): args is { query: string; params?: any[] } {
  return (
    typeof args === 'object' &&
    args !== null &&
    typeof args.query === 'string' &&
    (args.params === undefined || Array.isArray(args.params))
  );
}

/**
 * 执行 SELECT 查询
 */
async function executeSelect(query: string, params?: any[]): Promise<any[]> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(query, params);
    return rows as any[];
  } finally {
    connection.release();
  }
}

/**
 * 执行 INSERT 查询
 */
async function executeInsert(query: string, params?: any[]): Promise<any> {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(query, params);
    return result;
  } finally {
    connection.release();
  }
}

/**
 * 执行 UPDATE 查询
 */
async function executeUpdate(query: string, params?: any[]): Promise<any> {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(query, params);
    return result;
  } finally {
    connection.release();
  }
}

/**
 * 执行 DELETE 查询
 */
async function executeDelete(query: string, params?: any[]): Promise<any> {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(query, params);
    return result;
  } finally {
    connection.release();
  }
}

/**
 * 创建带有 MySQL CRUD 操作工具的 MCP 服务器
 */
const server = new Server(
  {
    name: "mysql-crud-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * 列出可用 MySQL CRUD 工具的处理器
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "mysql_select",
        description: "在 MySQL 数据库上执行 SELECT 查询",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "要执行的 SELECT SQL 查询"
            },
            params: {
              type: "array",
              items: { type: ["string", "number", "boolean"] },
              description: "查询的可选参数（用于预处理语句）"
            }
          },
          required: ["query"]
        }
      },
      {
        name: "mysql_insert",
        description: "在 MySQL 数据库上执行 INSERT 查询",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "要执行的 INSERT SQL 查询"
            },
            params: {
              type: "array",
              items: { type: ["string", "number", "boolean"] },
              description: "查询的可选参数（用于预处理语句）"
            }
          },
          required: ["query"]
        }
      },
      {
        name: "mysql_update",
        description: "在 MySQL 数据库上执行 UPDATE 查询",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "要执行的 UPDATE SQL 查询"
            },
            params: {
              type: "array",
              items: { type: ["string", "number", "boolean"] },
              description: "查询的可选参数（用于预处理语句）"
            }
          },
          required: ["query"]
        }
      },
      {
        name: "mysql_delete",
        description: "在 MySQL 数据库上执行 DELETE 查询",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "要执行的 DELETE SQL 查询"
            },
            params: {
              type: "array",
              items: { type: ["string", "number", "boolean"] },
              description: "查询的可选参数（用于预处理语句）"
            }
          },
          required: ["query"]
        }
      }
    ]
  };
});

/**
 * MySQL CRUD 工具调用的处理器
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (!validateQueryArgs(request.params.arguments)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      '无效的查询参数。必需参数：query (字符串)，可选参数：params (数组)'
    );
  }

  const { query, params } = request.params.arguments;

  try {
    let result: any;

    switch (request.params.name) {
      case "mysql_select":
        result = await executeSelect(query, params);
        return {
          content: [
            {
              type: "text",
              text: `SELECT 执行成功。返回行数: ${result.length}\n\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };

      case "mysql_insert":
        result = await executeInsert(query, params);
        return {
          content: [
            {
              type: "text",
              text: `INSERT 执行成功。影响行数: ${result.affectedRows}, 插入ID: ${result.insertId}`
            }
          ]
        };

      case "mysql_update":
        result = await executeUpdate(query, params);
        return {
          content: [
            {
              type: "text",
              text: `UPDATE 执行成功。影响行数: ${result.affectedRows}, 更改行数: ${result.changedRows}`
            }
          ]
        };

      case "mysql_delete":
        result = await executeDelete(query, params);
        return {
          content: [
            {
              type: "text",
              text: `DELETE 执行成功。影响行数: ${result.affectedRows}`
            }
          ]
        };

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `未知工具: ${request.params.name}`
        );
    }
  } catch (error) {
    console.error(`MySQL 操作失败:`, error);
    return {
      content: [
        {
          type: "text",
          text: `MySQL 操作失败: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
});

/**
 * 使用 stdio 传输启动服务器
 */
async function main() {
  try {
    await initializeDatabase();

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('MySQL CRUD MCP 服务器正在 stdio 上运行');
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("服务器错误:", error);
  process.exit(1);
});
