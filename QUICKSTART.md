# 🚀 MySQL CRUD MCP 插件 - 快速开始指南

## 📥 下载和安装

### 步骤 1: 下载项目文件
```bash
# 克隆仓库或下载 ZIP 文件
git clone https://github.com/your-repo/mysql-crud-mcp.git
# 或者直接下载项目文件到本地目录
```

### 步骤 2: 进入项目目录
```bash
cd mysql-crud-server
```

### 步骤 3: 运行一键安装脚本
```bash
node install.cjs
```

安装脚本会自动完成：
- ✅ 安装项目依赖 (`npm install`)
- ✅ 构建项目 (`npm run build`)
- ✅ 引导配置数据库连接信息
- ✅ 自动更新 Cline MCP 配置文件

### 步骤 4: 重启 Visual Studio Code
安装完成后，重启 VS Code 以加载新的 MCP 插件。

## 🎯 验证安装

在 Cline 聊天中测试连接：

```
请帮我查询数据库中的所有表
```

如果看到类似以下输出，说明安装成功：
```
SELECT executed successfully. Rows returned: X

[表列表...]
```

## 🛠️ 手动安装（备选方案）

如果自动安装脚本有问题，可以手动安装：

```bash
# 1. 安装依赖
npm install

# 2. 构建项目
npm run build

# 3. 复制配置模板
copy cline_mcp_settings.example.json "%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json"

# 4. 编辑配置文件，填入您的数据库信息
notepad "%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json"
```

## 📋 使用示例

### 创建用户表
```
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### 插入数据
```
INSERT INTO users (name, email) VALUES (?, ?)
```
参数: `["张三", "zhangsan@example.com"]`

### 查询数据
```
SELECT * FROM users WHERE name = ?
```
参数: `["张三"]`

### 更新数据
```
UPDATE users SET email = ? WHERE id = ?
```
参数: `["newemail@example.com", 1]`

### 删除数据
```
DELETE FROM users WHERE id = ?
```
参数: `[1]`

## ❓ 常见问题

**Q: 安装时提示权限错误？**
A: 请以管理员身份运行命令提示符，或使用非系统目录。

**Q: 数据库连接失败？**
A: 检查 MySQL 服务是否启动，连接信息是否正确。

**Q: 插件没有出现在 Cline 中？**
A: 重启 VS Code，检查配置文件路径是否正确。

**Q: 如何修改数据库配置？**
A: 编辑 `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`

## 🎉 完成！

现在您可以让 Cline 帮助您进行 MySQL 数据库操作了！

需要帮助？查看 `README.md` 获取详细文档。
