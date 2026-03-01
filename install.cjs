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

async function selectConfigMethod() {
  console.log('\n请选择配置方式：');
  console.log('1. 项目级 .env 文件配置（推荐）');
  console.log('2. 全局 MCP 配置文件');

  const choice = await askQuestion('\n请输入选择 (1-2): ');

  if (!['1', '2'].includes(choice)) {
    console.log('❌ 无效的选择，请重新选择');
    return await selectConfigMethod();
  }

  return choice;
}

async function selectTool() {
  console.log('\n请选择要配置的工具：');
  console.log('1. Cline');
  console.log('2. Claude Code');
  console.log('3. 两者都配置');

  const choice = await askQuestion('\n请输入选择 (1-3): ');

  if (!['1', '2', '3'].includes(choice)) {
    console.log('❌ 无效的选择，请重新选择');
    return await selectTool();
  }

  return choice;
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

  // 生成 Cline 配置
  const clineConfig = {
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
  };

  // 生成 Claude Code 配置（不包含 disabled 和 autoApprove）
  const claudeCodeConfig = {
    command: "node",
    args: [buildPath],
    env: {
      MYSQL_HOST: host,
      MYSQL_PORT: port,
      MYSQL_USER: user,
      MYSQL_PASSWORD: password,
      MYSQL_DATABASE: database
    }
  };

  return { clineConfig, claudeCodeConfig };
}

// 主安装流程
async function main() {
  const configMethod = await selectConfigMethod();
  const { clineConfig, claudeCodeConfig } = await configureDatabase();

  if (configMethod === '1') {
    // 使用 .env 文件配置
    console.log('\n💾 生成 .env 文件...');

    const envContent = `# MySQL 数据库配置
# 此文件由 install.cjs 脚本自动生成

MYSQL_HOST=${clineConfig.env.MYSQL_HOST}
MYSQL_PORT=${clineConfig.env.MYSQL_PORT}
MYSQL_USER=${clineConfig.env.MYSQL_USER}
MYSQL_PASSWORD=${clineConfig.env.MYSQL_PASSWORD}
MYSQL_DATABASE=${clineConfig.env.MYSQL_DATABASE}
`;

    try {
      const envPath = path.join(currentDir, '.env');
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log(`✅ .env 文件已生成: ${envPath}`);
      console.log('\n🎉 安装完成！');
      console.log('\n📋 下一步：');
      console.log('1. 重启应用程序（Cline 或 Claude Code）');
      console.log('2. 在聊天中测试 MySQL 连接：');
      console.log('   - 使用 mysql_select 执行查询');
      console.log('   - 使用 mysql_insert 执行插入');
      console.log('   - 使用 mysql_update 执行更新');
      console.log('   - 使用 mysql_delete 执行删除');
      console.log('\n📝 注意：.env 文件已添加到 .gitignore，不会被提交到版本控制');
      console.log('📖 更多信息请查看 README.md 文件');
    } catch (error) {
      console.error(`❌ 生成 .env 文件失败: ${error.message}`);
      process.exit(1);
    }
  } else {
    // 使用全局 MCP 配置
    const toolChoice = await selectTool();
    rl.close();

    const os = require('os');
    const homeDir = os.homedir();

    // Cline 配置路径
    const clinePath = path.join(homeDir, 'AppData', 'Roaming', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json');

    // Claude Code 配置路径
    const claudeCodePath = path.join(homeDir, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');

    console.log('\n💾 保存配置...');

    // 配置 Cline
    if (toolChoice === '1' || toolChoice === '3') {
      try {
        let existingConfig = {};
        if (fs.existsSync(clinePath)) {
          try {
            existingConfig = JSON.parse(fs.readFileSync(clinePath, 'utf8'));
          } catch (error) {
            console.warn('⚠️  无法读取现有 Cline 配置，将创建新配置');
          }
        }

        existingConfig.mcpServers = existingConfig.mcpServers || {};
        existingConfig.mcpServers['mysql-crud'] = clineConfig;

        // 确保目录存在
        const clineDir = path.dirname(clinePath);
        if (!fs.existsSync(clineDir)) {
          fs.mkdirSync(clineDir, { recursive: true });
        }

        fs.writeFileSync(clinePath, JSON.stringify(existingConfig, null, 2), 'utf8');
        console.log(`✅ Cline 配置已保存到: ${clinePath}`);
      } catch (error) {
        console.error(`❌ 保存 Cline 配置失败: ${error.message}`);
      }
    }

    // 配置 Claude Code
    if (toolChoice === '2' || toolChoice === '3') {
      try {
        let existingConfig = {};
        if (fs.existsSync(claudeCodePath)) {
          try {
            existingConfig = JSON.parse(fs.readFileSync(claudeCodePath, 'utf8'));
          } catch (error) {
            console.warn('⚠️  无法读取现有 Claude Code 配置，将创建新配置');
          }
        }

        existingConfig.mcpServers = existingConfig.mcpServers || {};
        existingConfig.mcpServers['mysql-crud'] = claudeCodeConfig;

        // 确保目录存在
        const claudeDir = path.dirname(claudeCodePath);
        if (!fs.existsSync(claudeDir)) {
          fs.mkdirSync(claudeDir, { recursive: true });
        }

        fs.writeFileSync(claudeCodePath, JSON.stringify(existingConfig, null, 2), 'utf8');
        console.log(`✅ Claude Code 配置已保存到: ${claudeCodePath}`);
      } catch (error) {
        console.error(`❌ 保存 Claude Code 配置失败: ${error.message}`);
      }
    }

    console.log('\n🎉 安装完成！');
    console.log('\n📋 下一步：');
    console.log('1. 重启应用程序（Cline 或 Claude Code）');
    console.log('2. 在聊天中测试 MySQL 连接：');
    console.log('   - 使用 mysql_select 执行查询');
    console.log('   - 使用 mysql_insert 执行插入');
    console.log('   - 使用 mysql_update 执行更新');
    console.log('   - 使用 mysql_delete 执行删除');

    console.log('\n🔧 如需修改配置，请编辑对应的配置文件');

    console.log('\n📖 更多信息请查看 README.md 文件');
  }
}

// 运行主流程
main().catch((error) => {
  console.error('❌ 安装过程中出现错误:', error.message);
  process.exit(1);
});
