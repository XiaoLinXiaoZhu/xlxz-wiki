const fs = require('fs');
const path = require('path');

// 模拟测试环境
console.log('=== 功能测试开始 ===\n');

// 1. 测试词条解析功能
console.log('1. 测试词条解析功能...');
const testContent1 = `
# 测试文档

这是一个测试文档。

【测试词条】：这是一个测试词条的定义内容。

【另一个词条】：这是另一个词条的定义。
`;

// 模拟processor.ts的功能
function extractTermDefinitions(content) {
  const terms = [];
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/【([^】]+)】：(.+)/);
    
    if (match) {
      terms.push({
        term: match[1],
        definition: match[2],
        lineNumber: i + 1
      });
    }
  }
  
  return terms;
}

const terms = extractTermDefinitions(testContent1);
console.log('   找到词条数量:', terms.length);
console.log('   词条详情:', terms.map(t => `${t.term}: ${t.definition}`).join(', '));

// 2. 测试公式处理功能
console.log('\n2. 测试公式处理功能...');
const testContent2 = `
这是一个包含公式的文档。

%% 基础伤害 = [攻击力] * <技能系数> + [额外伤害] %%
%% 最终伤害 = [基础伤害] * (1 + <暴击倍率>) %%
`;

// 模拟formulaUtils.ts的功能
function extractCalculatedValues(formula) {
  const matches = formula.match(/\[([^\]]+)\]/g) || [];
  return matches.map(m => m.slice(1, -1));
}

function extractDesignValues(formula) {
  const matches = formula.match(/<([^>]+)>/g) || [];
  return matches.map(m => m.slice(1, -1));
}

function extractFormulas(content) {
  const formulas = [];
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const matches = line.matchAll(/%%\s*([^%]+)\s*%%/g);
    
    for (const match of matches) {
      const formula = match[1];
      formulas.push({
        expression: formula,
        calculatedValues: extractCalculatedValues(formula),
        designValues: extractDesignValues(formula),
        lineNumber: i + 1
      });
    }
  }
  
  return formulas;
}

const formulas = extractFormulas(testContent2);
console.log('   找到公式数量:', formulas.length);
formulas.forEach((f, i) => {
  console.log(`   公式${i+1}: ${f.expression}`);
  console.log(`     计算值: ${f.calculatedValues.join(', ')}`);
  console.log(`     设计值: ${f.designValues.join(', ')}`);
});

// 3. 测试模板匹配功能
console.log('\n3. 测试模板匹配功能...');
const testTemplate = '使用{A}替换{B}的定义';
const testTerm = '使用攻击力替换基础伤害的定义';

function extractPlaceholders(template) {
  const placeholders = [];
  const regex = /\{([^}]+)\}/g;
  let match;
  while ((match = regex.exec(template)) !== null) {
    const name = match[1].trim();
    if (name && !placeholders.includes(name)) placeholders.push(name);
  }
  return placeholders;
}

function createPattern(template) {
  return template.replace(/([.*+?^${}()|[\]\\])/g, '\\$1')
    .replace(/\\\{([^}]+)\\\}/g, '\\{(.+?)\\}');
}

function matchTemplate(template, term) {
  const pattern = createPattern(template);
  const regex = new RegExp('^' + pattern + '

const templateMatch = matchTemplate(testTemplate, testTerm);
if (templateMatch) {
  console.log('   模板匹配成功!');
  console.log('   占位符:', templateMatch.placeholders);
  console.log('   参数值:', templateMatch.params);
} else {
  console.log('   模板匹配失败');
}

// 4. 测试导入路径验证
console.log('\n4. 测试导入路径验证...');
try {
  // 检查utils/index.ts的导出
  const utilsIndex = fs.readFileSync('docs/.vuepress/utils/index.ts', 'utf8');
  console.log('   ✓ utils/index.ts 存在且可读取');
  
  // 检查各个工具模块
  const requiredModules = ['formulaUtils.ts', 'markdownUtils.ts', 'debug.ts', 'definitionParsing.ts', 'zIndex.ts'];
  requiredModules.forEach(module => {
    const modulePath = path.join('docs/.vuepress/utils', module);
    if (fs.existsSync(modulePath)) {
      console.log(`   ✓ ${module} 存在`);
    } else {
      console.log(`   ✗ ${module} 不存在`);
    }
  });
} catch (error) {
  console.log('   ✗ 导入路径验证失败:', error.message);
}

console.log('\n=== 功能测试完成 ==='););
  const match = term.match(regex);
  if (match) {
    const params = match.slice(1);
    const placeholders = extractPlaceholders(template);
    return { template, placeholders, params };
  }
  return null;
}

const templateMatch = matchTemplate(testTemplate, testTerm);
if (templateMatch) {
  console.log('   模板匹配成功!');
  console.log('   占位符:', templateMatch.placeholders);
  console.log('   参数值:', templateMatch.params);
} else {
  console.log('   模板匹配失败');
}

// 4. 测试导入路径验证
console.log('\n4. 测试导入路径验证...');
try {
  // 检查utils/index.ts的导出
  const utilsIndex = fs.readFileSync('docs/.vuepress/utils/index.ts', 'utf8');
  console.log('   ✓ utils/index.ts 存在且可读取');
  
  // 检查各个工具模块
  const requiredModules = ['formulaUtils.ts', 'markdownUtils.ts', 'debug.ts', 'definitionParsing.ts', 'zIndex.ts'];
  requiredModules.forEach(module => {
    const modulePath = path.join('docs/.vuepress/utils', module);
    if (fs.existsSync(modulePath)) {
      console.log(`   ✓ ${module} 存在`);
    } else {
      console.log(`   ✗ ${module} 不存在`);
    }
  });
} catch (error) {
  console.log('   ✗ 导入路径验证失败:', error.message);
}

console.log('\n=== 功能测试完成 ===');