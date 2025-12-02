# MySQL CRUD MCP 服务器

这是一个用于 MySQL 数据库操作的 MCP (Model Context Protocol) 服务器插件，提供完整的 CRUD 操作工具。

## 🚀 一键安装（推荐）

### 方式一：自动安装脚本

```bash
# 1. 克隆或下载项目文件到本地
# 2. 进入项目目录
cd mysql-crud-server

# 3. 运行安装脚本
node install.cjs
```

安装脚本会自动：
- 安装项目依赖
- 构建项目
- 引导您配置数据库连接信息
- 自动更新 MCP 配置文件

### 方式二：手动安装

```bash
# 1. 安装依赖
npm install

# 2. 构建项目
npm run build

# 3. 复制配置文件模板
cp cline_mcp_settings.example.json /path/to/your/cline_mcp_settings.json

# 4. 编辑配置文件，填入您的数据库信息
# 配置文件位置: %APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json
```

## ⚙️ 配置说明

### 配置文件位置
`%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`

### 必需的环境变量
- `MYSQL_HOST`: MySQL 服务器主机地址 (默认: 127.0.0.1)
- `MYSQL_PORT`: MySQL 服务器端口 (默认: 3306)
- `MYSQL_USER`: MySQL 用户名
- `MYSQL_PASSWORD`: MySQL 密码
- `MYSQL_DATABASE`: MySQL 数据库名

### 配置示例
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

## 🐛 故障排除

### 服务器无法启动
- 检查数据库连接信息是否正确
- 确认 MySQL 服务正在运行
- 查看错误日志中的具体错误信息

### 连接超时
- 检查网络连接
- 确认防火墙设置
- 调整连接超时设置

## 📖 更多信息

如需修改代码或了解更多技术细节，请查看源码中的注释。
