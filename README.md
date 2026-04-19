# MySQL CRUD MCP 服务器

这是一个用于 MySQL 数据库操作的 MCP (Model Context Protocol) 服务器插件，提供完整的 CRUD 操作工具。

## ✨ 特性

- 🔍 **自动检测项目配置** - 自动向上查找 `.env` 文件定位项目根目录
- 🔄 **多项目支持** - 不同项目自动使用不同的数据库连接
- ⏱️ **连接超时保护** - 默认 10 秒超时，可通过环境变量配置
- 📝 **多种配置格式** - 支持 INI section 和 KEY=VALUE 两种格式
- 🛠️ **兼容多工具** - 支持 Claude Code、Cline、Codex 等

## 🚀 快速开始

### 全局安装（推荐）

```bash
npm install -g mysql-crud-server
```

### MCP 配置

在项目根目录创建 `.mcp.json`：

```json
{
  "mcpServers": {
    "mysql-crud": {
      "command": "mysql-crud-server"
    }
  }
}
```

## ⚙️ 配置说明

### 配置格式一：INI Section 格式

```ini
[DATABASE]
TYPE = mysql
HOSTNAME = 127.0.0.1
HOSTPORT = 3306
USERNAME = root
PASSWORD = your_password
DATABASE = your_database
CHARSET = utf8mb4
```

### 配置格式二：KEY=VALUE 格式

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_database
DB_USERNAME=root
DB_PASSWORD=your_password
```

### 支持的配置名称

| 配置项 | 支持的名称 |
|--------|-----------|
| 主机 | `MYSQL_HOST` / `DB_HOST` / `DATABASE_HOST` / `HOSTNAME` |
| 端口 | `MYSQL_PORT` / `DB_PORT` / `DATABASE_PORT` / `HOSTPORT` |
| 用户 | `MYSQL_USER` / `DB_USER` / `MYSQL_USERNAME` / `DB_USERNAME` / `USERNAME` |
| 密码 | `MYSQL_PASSWORD` / `DB_PASSWORD` / `DATABASE_PASSWORD` / `PASSWORD` |
| 数据库 | `MYSQL_DATABASE` / `DB_NAME` / `DATABASE_NAME` / `DATABASE` / `DB_DATABASE` |
| 字符集 | `CHARSET` / `CHARACTER_SET` |

## 🔧 工具列表

- **mysql_select** - 执行 SELECT 查询
- **mysql_insert** - 执行 INSERT 查询
- **mysql_update** - 执行 UPDATE 查询
- **mysql_delete** - 执行 DELETE 查询
- **mysql_info** - 获取连接信息

## ⏱️ 超时配置

默认连接超时为 10 秒，可通过环境变量配置：

```json
{
  "mcpServers": {
    "mysql-crud": {
      "command": "mysql-crud-server",
      "env": {
        "MYSQL_TIMEOUT": "30000"
      }
    }
  }
}
```

## 📝 使用示例

### SELECT 查询

```
mysql_select: SELECT * FROM users WHERE id = ?
params: [1]
```

### INSERT 查询

```
mysql_insert: INSERT INTO users (name, email) VALUES (?, ?)
params: ["张三", "zhangsan@example.com"]
```

## 🐛 故障排除

### 连接超时

- 检查网络连接和防火墙设置
- 确认数据库服务器可访问
- 调整 `MYSQL_TIMEOUT` 环境变量

### 配置文件找不到

- 确保 `.env` 文件在项目根目录
- MCP 会自动向上查找 `.env` 文件

### INI 格式解析失败

- 确保使用正确的 section 名称 `[DATABASE]`
- 支持 Windows (`\r\n`)、Unix (`\n`) 和旧 Mac (`\r`) 换行符

## 📄 许可证

MIT
