#!/usr/bin/env node

/**
 * MySQL CRUD MCP 服务器
 * 提供用于 MySQL 数据库操作的工具：SELECT、INSERT、UPDATE、DELETE
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import mysql from 'mysql2/promise';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

// 数据库连接配置 - 需要通过环境变量配置
function getDatabaseConfig() {
  const requiredEnvVars = ['MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'];

  // 检查是否有任何环境变量被配置
  const hasAnyConfig = requiredEnvVars.some(envVar => process.env[envVar]);

  if (!hasAnyConfig) {
    throw new Error(
      `MySQL CRUD MCP 服务器需要配置数据库连接信息。\n\n` +
      `请按照以下步骤配置：\n\n` +
      `1. 复制项目中的 cline_mcp_settings.example.json 文件\n` +
      `2. 编辑其中的数据库配置信息\n` +
      `3. 将配置添加到您的 cline_mcp_settings.json 文件中\n\n` +
      `配置位置: %APPDATA%\\Code\\User\\globalStorage\\saoudrizwan.claude-dev\\settings\\cline_mcp_settings.json\n\n` +
      `必需的环境变量:\n` +
      `- MYSQL_HOST: MySQL 服务器主机地址 (例如: 127.0.0.1)\n` +
      `- MYSQL_PORT: MySQL 服务器端口 (例如: 3306)\n` +
      `- MYSQL_USER: MySQL 用户名\n` +
      `- MYSQL_PASSWORD: MySQL 密码\n` +
      `- MYSQL_DATABASE: MySQL 数据库名\n\n` +
      `或者运行 install.js 脚本进行自动配置。`
    );
  }

  // 检查所有必需的环境变量
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(
        `缺少必需的环境变量: ${envVar}\n\n` +
        `请在 MCP 设置中配置以下环境变量:\n` +
        `- MYSQL_HOST: MySQL 服务器主机地址\n` +
        `- MYSQL_PORT: MySQL 服务器端口\n` +
        `- MYSQL_USER: MySQL 用户名\n` +
        `- MYSQL_PASSWORD: MySQL 密码\n` +
        `- MYSQL_DATABASE: MySQL 数据库名\n\n` +
        `配置示例:\n` +
        `"env": {\n` +
        `  "MYSQL_HOST": "127.0.0.1",\n` +
        `  "MYSQL_PORT": "3306",\n` +
        `  "MYSQL_USER": "your_username",\n` +
        `  "MYSQL_PASSWORD": "your_password",\n` +
        `  "MYSQL_DATABASE": "your_database"\n` +
        `}`
      );
    }
  }

  return {
    host: process.env.MYSQL_HOST!,
    port: parseInt(process.env.MYSQL_PORT!),
    user: process.env.MYSQL_USER!,
    password: process.env.MYSQL_PASSWORD!,
    database: process.env.MYSQL_DATABASE!,
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
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
