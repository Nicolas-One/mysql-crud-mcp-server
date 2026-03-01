# MySQL CRUD MCP 服务器

这是一个用于 MySQL 数据库操作的 MCP (Model Context Protocol) 服务器插件，提供完整的 CRUD 操作工具。

## 🚀 快速开始

### 使用 npm 安装（推荐）

```bash
npm install mysql-crud-server
```

### 本地开发安装

```bash
# 1. 克隆或下载项目文件到本地
# 2. 进入项目目录
cd mysql-crud-server

# 3. 安装依赖
npm install

# 4. 构建项目
npm run build

# 5. 复制配置文件模板
cp .env.example .env

# 6. 编辑 .env 文件，填入您的数据库信息
```

## ⚙️ 配置说明

### 配置方式（优先级顺序）

#### 方式一：项目级 .env 文件（推荐）

最简单的配置方式，无需修改全局设置。MCP 会自动在项目根目录查找 `.env` 文件。支持两种格式：

**步骤：**

1. 在项目根目录创建 `.env` 文件（或复制 `.env.example`）
2. 填入您的 MySQL 数据库信息
3. 在 MCP 配置中指定 `ENV_PATH` 环境变量

**格式一：标准 KEY=VALUE 格式**

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=your_database
CHARSET=utf8
```

**格式二：INI 格式（[DATABASE] section）**

```ini
[DATABASE]
TYPE=mysql
HOSTNAME=127.0.0.1
HOSTPORT=3306
USERNAME=root
PASSWORD=your_password
DATABASE=your_database
CHARSET=utf8
DEBUG=true
```

**支持的配置名称（任选其一）：**
- 主机: `MYSQL_HOST` / `DB_HOST` / `DATABASE_HOST` / `HOST` / `HOSTNAME`
- 端口: `MYSQL_PORT` / `DB_PORT` / `DATABASE_PORT` / `PORT` / `HOSTPORT`
- 用户: `MYSQL_USER` / `DB_USER` / `DATABASE_USER` / `USER` / `MYSQL_USERNAME` / `DB_USERNAME` / `USERNAME`
- 密码: `MYSQL_PASSWORD` / `DB_PASSWORD` / `DATABASE_PASSWORD` / `PASSWORD`
- 数据库: `MYSQL_DATABASE` / `DB_NAME` / `DATABASE_NAME` / `DATABASE` / `DB_DATABASE`
- 字符集: `CHARSET` / `CHARACTER_SET`（默认: utf8）

**MCP 配置示例（Claude Code）：**

```json
{
  "mcpServers": {
    "mysql-crud": {
      "command": "node",
      "args": ["./mysql-crud-server/build/index.js"]
    }
  }
}
```

**MCP 配置示例（Cline）：**

```json
{
  "mcpServers": {
    "mysql-crud": {
      "command": "node",
      "args": ["/path/to/mysql-crud-server/build/index.js"],
      "disabled": false,
      "autoApprove": [
        "mysql_select",
        "mysql_insert",
        "mysql_update",
        "mysql_delete"
      ]
    }
  }
}
```

MCP 支持多种配置名称，您可以使用任何一种：

| 配置项 | 支持的名称 |
|--------|-----------|
| 主机地址 | `MYSQL_HOST` / `DB_HOST` / `DATABASE_HOST` / `HOST` |
| 端口号 | `MYSQL_PORT` / `DB_PORT` / `DATABASE_PORT` / `PORT` |
| 用户名 | `MYSQL_USER` / `DB_USER` / `DATABASE_USER` / `USER` / `MYSQL_USERNAME` / `DB_USERNAME` |
| 密码 | `MYSQL_PASSWORD` / `DB_PASSWORD` / `DATABASE_PASSWORD` / PASSWORD` |
| 数据库名 | `MYSQL_DATABASE` / `DB_NAME` / `DATABASE_NAME` / `DATABASE` / `DB_DATABASE` |

**示例配置（多种方式）：**

方式 1（推荐）：
```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=your_database
```

方式 2：
```
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=your_database
```

方式 3：
```
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=your_password
DATABASE_NAME=your_database
```

**优势：**
- ✅ 项目级配置，无需修改全局设置
- ✅ 支持多项目切换，每个项目独立配置
- ✅ 灵活识别各种命名约定
- ✅ 符合现代开发实践
- ✅ 一键安装即可使用

#### 方式二：全局 MCP 配置文件

如果您需要使用全局配置，可以按照以下步骤：

**Cline 配置**

配置文件位置：
`%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`

**Claude Code 配置**

配置文件位置：
`%APPDATA%\Claude\claude_desktop_config.json`

### 必需的环境变量

- `MYSQL_HOST`: MySQL 服务器主机地址 (默认: 127.0.0.1)
- `MYSQL_PORT`: MySQL 服务器端口 (默认: 3306)
- `MYSQL_USER`: MySQL 用户名
- `MYSQL_PASSWORD`: MySQL 密码
- `MYSQL_DATABASE`: MySQL 数据库名

### 全局配置示例

#### Cline 配置示例
```json
{
  "mcpServers": {
    "mysql-crud": {
      "command": "node",
      "args": ["完整路径/mysql-crud-server/build/index.js"],
      "env": {
        "MYSQL_HOST": "127.0.0.1",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "root",
        "MYSQL_PASSWORD": "your_password",
        "MYSQL_DATABASE": "your_database"
      },
      "disabled": false,
      "autoApprove": [
        "mysql_select",
        "mysql_insert",
        "mysql_update",
        "mysql_delete"
      ]
    }
  }
}
```

#### Claude Code 配置示例
```json
{
  "mcpServers": {
    "mysql-crud": {
      "command": "node",
      "args": ["完整路径/mysql-crud-server/build/index.js"],
      "env": {
        "MYSQL_HOST": "127.0.0.1",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "root",
        "MYSQL_PASSWORD": "your_password",
        "MYSQL_DATABASE": "your_database"
      }
    }
  }
}
```

> 注：Claude Code 配置中无需 `disabled` 和 `autoApprove` 字段

### 支持的工具

本 MCP 同时兼容 **Cline** 和 **Claude Code** 两种工具。

## 📋 使用方法

配置完成后，重启 Visual Studio Code，然后您就可以在聊天中使用 MySQL 工具了：

### SELECT 查询
```sql
SELECT * FROM users WHERE id = ?
```
参数: `[1]`

### INSERT 查询
```sql
INSERT INTO users (name, email) VALUES (?, ?)
```
参数: `["张三", "zhangsan@example.com"]`

### UPDATE 查询
```sql
UPDATE users SET name = ? WHERE id = ?
```
参数: `["李四", 1]`

### DELETE 查询
```sql
DELETE FROM users WHERE id = ?
```
参数: `[1]`

## 🔧 功能特性

- **mysql_select**: 执行 SELECT 查询
- **mysql_insert**: 执行 INSERT 查询（支持建表操作）
- **mysql_update**: 执行 UPDATE 查询
- **mysql_delete**: 执行 DELETE 查询

## 📝 注意事项

1. 所有 SQL 查询都支持参数化查询以防止 SQL 注入
2. 服务器会在启动时验证数据库连接
3. 如果缺少必需的环境变量，服务器将无法启动并显示详细的配置说明
4. `.env` 文件不应提交到版本控制系统（已在 .gitignore 中配置）

## 🐛 故障排除

### 服务器无法启动
- 检查数据库连接信息是否正确
- 确认 MySQL 服务正在运行
- 查看错误日志中的具体错误信息

### 连接超时
- 检查网络连接
- 确认防火墙设置
- 调整连接超时设置

### 配置文件找不到
- 确保 `.env` 文件在项目根目录
- 检查 `ENV_PATH` 环境变量是否正确设置
- 查看错误消息中的配置路径提示

### 权限错误
- 确认 MySQL 用户有足够的权限
- 检查用户名和密码是否正确
- 验证数据库是否存在

## 📖 更多信息

- 查看 [CHANGELOG.md](./CHANGELOG.md) 了解版本历史
- 查看源码中的注释了解技术细节
- 访问 [npm 包页面](https://www.npmjs.com/package/mysql-crud-server)

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发设置

```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 监视文件变化
npm run watch

# 启动服务器
npm start
```

### 提交更改

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- 使用 TypeScript 编写代码
- 遵循现有的代码风格
- 添加适当的注释和文档
- 确保代码能够成功构建

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](./LICENSE) 文件
