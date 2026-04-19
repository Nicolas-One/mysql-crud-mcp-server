#!/usr/bin/env node

/**
 * MySQL CRUD MCP 服务器 - 自动检测项目目录版
 *
 * 特性：
 * 1. 自动向上查找 .env 文件定位项目根目录
 * 2. 支持环境变量 PROJECT_DIR 手动指定
 * 3. 兼容 Claude Code、Codex 等多种工具
 * 4. 多项目连接池隔离
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

// ==================== 项目目录检测 ====================

/**
 * 向上查找 .env 文件所在目录
 */
function findProjectRoot(startDir: string): string {
  let dir = startDir;

  // 最多向上查找 10 层
  for (let i = 0; i < 10; i++) {
    const envPath = path.join(dir, '.env');
    if (fs.existsSync(envPath)) {
      return dir;
    }

    const parentDir = path.dirname(dir);
    if (parentDir === dir) {
      // 已到达根目录
      break;
    }
    dir = parentDir;
  }

  // 未找到 .env，返回起始目录
  return startDir;
}

/**
 * 获取项目目录
 */
function getProjectDir(): string {
  // 优先级 1: 环境变量指定
  if (process.env.PROJECT_DIR) {
    return process.env.PROJECT_DIR;
  }
  if (process.env.MCP_PROJECT_DIR) {
    return process.env.MCP_PROJECT_DIR;
  }

  // 优先级 2: 从当前工作目录向上查找 .env
  const cwd = process.cwd();
  const projectRoot = findProjectRoot(cwd);

  return projectRoot;
}

// ==================== 连接池管理 ====================

const poolCache: Map<string, mysql.Pool> = new Map();

function parseIniConfig(filePath: string): Record<string, Record<string, string>> {
  const config: Record<string, Record<string, string>> = {};

  try {
    if (!fs.existsSync(filePath)) return config;

    // 统一换行符，支持 Windows (\r\n)、Unix (\n) 和旧 Mac (\r)
    const content = fs.readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    let currentSection = '';

    content.split('\n').forEach(line => {
      line = line.trim();
      if (!line || line.startsWith(';') || line.startsWith('#')) return;

      const sectionMatch = line.match(/^\[([^\]]+)\]$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1];
        config[currentSection] = {};
        return;
      }

      const keyValueMatch = line.match(/^([^=]+)=(.*)$/);
      if (keyValueMatch && currentSection) {
        config[currentSection][keyValueMatch[1].trim()] = keyValueMatch[2].trim();
      }
    });
  } catch (error) {}

  return config;
}

function getDatabaseConfig(projectDir: string) {
  const envPath = path.join(projectDir, '.env');
  const iniConfig = parseIniConfig(envPath);

  // 临时加载 .env
  const dbEnvKeys = ['MYSQL_HOST', 'DB_HOST', 'DATABASE_HOST', 'HOST', 'HOSTNAME',
    'MYSQL_PORT', 'DB_PORT', 'DATABASE_PORT', 'PORT', 'HOSTPORT',
    'MYSQL_USER', 'DB_USER', 'MYSQL_USERNAME', 'DB_USERNAME', 'DATABASE_USER', 'USERNAME', 'USER',
    'MYSQL_PASSWORD', 'DB_PASSWORD', 'DATABASE_PASSWORD', 'PASSWORD',
    'MYSQL_DATABASE', 'DB_NAME', 'DATABASE_NAME', 'DATABASE', 'DB_DATABASE',
    'CHARSET', 'CHARACTER_SET'];

  const originalEnv: Record<string, string | undefined> = {};
  dbEnvKeys.forEach(k => originalEnv[k] = process.env[k]);

  if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

  const mappings: Record<string, string[]> = {
    host: ['MYSQL_HOST', 'DB_HOST', 'DATABASE_HOST', 'HOSTNAME'],
    port: ['MYSQL_PORT', 'DB_PORT', 'DATABASE_PORT', 'HOSTPORT'],
    user: ['MYSQL_USER', 'DB_USER', 'MYSQL_USERNAME', 'DB_USERNAME', 'DATABASE_USER', 'USERNAME', 'USER'],
    password: ['MYSQL_PASSWORD', 'DB_PASSWORD', 'DATABASE_PASSWORD', 'PASSWORD'],
    database: ['MYSQL_DATABASE', 'DB_NAME', 'DATABASE_NAME', 'DATABASE', 'DB_DATABASE'],
    charset: ['CHARSET', 'CHARACTER_SET']
  };

  const getEnvValue = (key: string): string | undefined => {
    const names = mappings[key];
    if (!names) return undefined;
    for (const name of names) {
      if (process.env[name]) return process.env[name];
    }
    return undefined;
  };

  // INI 配置只从 DATABASE section 读取，避免与其他 section 混淆
  const getIniValue = (key: string): string | undefined => {
    const names = mappings[key];
    if (!names || !iniConfig.DATABASE) return undefined;
    for (const name of names) {
      if (iniConfig.DATABASE[name]) return iniConfig.DATABASE[name];
    }
    return undefined;
  };

  const host = getEnvValue('host') || getIniValue('host');
  const port = getEnvValue('port') || getIniValue('port');
  const user = getEnvValue('user') || getIniValue('user');
  const password = getEnvValue('password') || getIniValue('password');
  const database = getEnvValue('database') || getIniValue('database');
  const charset = getEnvValue('charset') || getIniValue('charset') || 'utf8';

  // 恢复环境变量
  dbEnvKeys.forEach(k => originalEnv[k] === undefined ? delete process.env[k] : process.env[k] = originalEnv[k]);

  if (!host || !port || !user || !password || !database) {
    throw new Error(`MySQL 配置不完整。项目目录: ${projectDir}\n请检查 .env 文件中的数据库配置。`);
  }

  const OPERATION_TIMEOUT = parseInt(process.env.MYSQL_TIMEOUT || '10000'); // 默认 10 秒

  return { host, port: parseInt(port), user, password, database, charset, connectTimeout: OPERATION_TIMEOUT, acquireTimeout: OPERATION_TIMEOUT, waitForConnections: true, connectionLimit: 10, queueLimit: 0 };
}

async function getPool(projectDir: string): Promise<mysql.Pool> {
  if (poolCache.has(projectDir)) return poolCache.get(projectDir)!;

  const config = getDatabaseConfig(projectDir);
  const pool = mysql.createPool(config);

  // 懒加载：不在此处测试连接，让首次查询时自动建立连接
  console.error(`MySQL 连接池已创建 [${projectDir}] -> ${config.host}:${config.port}/${config.database}`);
  poolCache.set(projectDir, pool);
  return pool;
}

// ==================== MCP 服务器 ====================

const server = new Server(
  { name: "mysql-crud-server", version: "1.3.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "mysql_select", description: "执行 SELECT 查询。自动读取项目 .env 配置连接数据库。", inputSchema: { type: "object", properties: { query: { type: "string", description: "SQL 查询" }, params: { type: "array", items: { type: ["string", "number", "boolean"] } } }, required: ["query"] } },
    { name: "mysql_insert", description: "执行 INSERT 查询。", inputSchema: { type: "object", properties: { query: { type: "string" }, params: { type: "array", items: { type: ["string", "number", "boolean"] } } }, required: ["query"] } },
    { name: "mysql_update", description: "执行 UPDATE 查询。", inputSchema: { type: "object", properties: { query: { type: "string" }, params: { type: "array", items: { type: ["string", "number", "boolean"] } } }, required: ["query"] } },
    { name: "mysql_delete", description: "执行 DELETE 查询。", inputSchema: { type: "object", properties: { query: { type: "string" }, params: { type: "array", items: { type: ["string", "number", "boolean"] } } }, required: ["query"] } },
    { name: "mysql_info", description: "获取连接信息。", inputSchema: { type: "object", properties: {} } }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const projectDir = getProjectDir();
    const pool = await getPool(projectDir);

    if (request.params.name === "mysql_info") {
      return { content: [{ type: "text", text: `MySQL MCP 信息\n项目目录: ${projectDir}\n连接池数量: ${poolCache.size}` }] };
    }

    const args = request.params.arguments as any;
    if (!args?.query) throw new McpError(ErrorCode.InvalidParams, '缺少 query 参数');

    const conn = await pool.getConnection();
    try {
      const [result] = await conn.execute(args.query, args.params);

      const messages: Record<string, string> = {
        mysql_select: `SELECT 成功。返回 ${Array.isArray(result) ? result.length : 0} 行\n\n${JSON.stringify(result, null, 2)}`,
        mysql_insert: `INSERT 成功。影响 ${(result as any).affectedRows} 行，ID: ${(result as any).insertId}`,
        mysql_update: `UPDATE 成功。影响 ${(result as any).affectedRows} 行`,
        mysql_delete: `DELETE 成功。影响 ${(result as any).affectedRows} 行`
      };

      return { content: [{ type: "text", text: messages[request.params.name] || '执行成功' }] };
    } finally {
      conn.release();
    }
  } catch (error) {
    // 连接错误时清除缓存，下次请求重新创建连接池
    const projectDir = getProjectDir();
    if (poolCache.has(projectDir)) {
      const pool = poolCache.get(projectDir)!;
      poolCache.delete(projectDir);
      pool.end().catch(() => {});
    }
    return { content: [{ type: "text", text: `操作失败: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
});

async function main() {
  const projectDir = getProjectDir();
  console.error(`MySQL CRUD MCP 启动`);
  console.error(`项目目录: ${projectDir}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
