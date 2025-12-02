#!/usr/bin/env node

/**
 * MySQL CRUD MCP 服务器一键安装脚本
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 MySQL CRUD MCP 服务器安装脚本');
console.log('================================\n');

// 检查是否在正确的目录
const currentDir = process.cwd();
const expectedFiles = ['package.json', 'src/index.ts'];

for (const file of expectedFiles) {
  if (!fs.existsSync(path.join(currentDir, file))) {
    console.error(`❌ 错误：找不到文件 ${file}，请确保在 mysql-crud-server 目录下运行此脚本`);
    process.exit(1);
  }
}

console.log('✅ 项目文件检查通过');

// 安装依赖
console.log('\n📦 安装依赖...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ 依赖安装完成');
} catch (error) {
  console.error('❌ 依赖安装失败:', error.message);
  process.exit(1);
}

// 构建项目
console.log('\n🔨 构建项目...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ 项目构建完成');
} catch (error) {
  console.error('❌ 项目构建失败:', error.message);
  process.exit(1);
}

// 获取构建后的文件路径
const buildPath = path.join(currentDir, 'build', 'index.js');
if (!fs.existsSync(buildPath)) {
  console.error('❌ 构建失败：找不到构建文件');
  process.exit(1);
}

console.log('✅ 构建文件检查通过');

// 获取用户配置
console.log('\n⚙️  配置数据库连接信息');
console.log('如果您还没有配置 MySQL 数据库，请先准备好以下信息：');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function configureDatabase() {
  console.log('\n请输入您的 MySQL 数据库配置：');

  const host = await askQuestion('MySQL 主机地址 (默认: 127.0.0.1): ') || '127.0.0.1';
  const port = await askQuestion('MySQL 端口 (默认: 3306): ') || '3306';
  const user = await askQuestion('MySQL 用户名 (默认: root): ') || 'root';
  const password = await askQuestion('MySQL 密码: ') || '';
  const database = await askQuestion('MySQL 数据库名: ') || '';

  if (!password || !database) {
    console.log('\n❌ 密码和数据库名不能为空，请重新配置');
    return await configureDatabase();
  }

  rl.close();

  // 生成配置
  const config = {
    mcpServers: {
      "mysql-crud": {
        command: "node",
        args: [buildPath],
        env: {
          MYSQL_HOST: host,
          MYSQL_PORT: port,
          MYSQL_USER: user,
          MYSQL_PASSWORD: password,
          MYSQL_DATABASE: database
        },
        disabled: false,
        autoApprove: [
          "mysql_select",
          "mysql_insert",
          "mysql_update",
          "mysql_delete"
        ]
      }
    }
  };

  return config;
}

// 主安装流程
async function main() {
  const config = await configureDatabase();

  // 保存配置到用户指定位置
  const configPath = path.join(require('os').homedir(), 'AppData', 'Roaming', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json');

  console.log('\n💾 保存配置...');

  // 读取现有配置（如果存在）
  let existingConfig = {};
  if (fs.existsSync(configPath)) {
    try {
      existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.warn('⚠️  无法读取现有配置，将创建新配置');
    }
  }

  // 合并配置
  existingConfig.mcpServers = existingConfig.mcpServers || {};
  existingConfig.mcpServers['mysql-crud'] = config.mcpServers['mysql-crud'];

  // 保存配置
  fs.writeFileSync(configPath, JSON.stringify(existingConfig, null, 2), 'utf8');

  console.log(`✅ 配置已保存到: ${configPath}`);

  console.log('\n🎉 安装完成！');
  console.log('\n📋 下一步：');
  console.log('1. 重启 Visual Studio Code');
  console.log('2. 在聊天中测试 MySQL 连接：');
  console.log('   - 使用 mysql_select 执行查询');
  console.log('   - 使用 mysql_insert 执行插入');
  console.log('   - 使用 mysql_update 执行更新');
  console.log('   - 使用 mysql_delete 执行删除');

  console.log('\n🔧 如需修改配置，请编辑上述配置文件');

  console.log('\n📖 更多信息请查看 README.md 文件');
}

// 运行主流程
main().catch((error) => {
  console.error('❌ 安装过程中出现错误:', error.message);
  process.exit(1);
});
