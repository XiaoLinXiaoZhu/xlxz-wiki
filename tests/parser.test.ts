/**
 * parser.ts 单元测试
 * 测试 frontmatter 解析、文件内定义解析、策划公式解析
 */
import { describe, test, expect } from 'bun:test'
import { parseFile, extractCalculatedValues, extractDesignValues } from '../server/indexer/parser'

describe('parseFile — frontmatter alias', () => {
  test('解析 alias 列表', () => {
    const content = `---
alias:
  - 滑移
  - 基础移动方式
---

滑移是游戏中玩家的主要移动方式。`

    const result = parseFile(content, '角色系统/基础移动方式.md')
    expect(result.terms).toHaveLength(1)
    expect(result.terms[0].term).toBe('滑移')
    expect(result.terms[0].aliases).toEqual(['滑移', '基础移动方式'])
    expect(result.terms[0].definition).toContain('滑移是游戏中玩家的主要移动方式')
    expect(result.terms[0].filePath).toBe('角色系统/基础移动方式.md')
    expect(result.terms[0].definitionType).toBe('file')
  })

  test('解析 scope', () => {
    const content = `---
alias:
  - NPC
scope: game1
---

NPC 是非玩家控制的角色。`

    const result = parseFile(content, 'game1/npc.md')
    expect(result.scope).toBe('game1')
    expect(result.terms[0].scope).toBe('game1')
  })

  test('无 alias 时不生成词条', () => {
    const content = `---
scope: test
---

这是一段没有 alias 的内容。`

    const result = parseFile(content, 'test.md')
    expect(result.terms).toHaveLength(0)
  })

  test('无 frontmatter 时正常处理', () => {
    const content = `# 标题

这是一段普通内容。`

    const result = parseFile(content, 'readme.md')
    expect(result.terms).toHaveLength(0)
    expect(result.scope).toBe('')
  })
})

describe('parseFile — 文件内定义', () => {
  test('解析 【词条】：定义', () => {
    const content = `---
alias:
  - 冲击
---

【施法者】：发起滑移的玩家
【目标】：被冲击的对象`

    const result = parseFile(content, '冲击.md')
    expect(result.inlineTerms).toHaveLength(2)
    expect(result.inlineTerms[0].term).toBe('施法者')
    expect(result.inlineTerms[0].definition).toBe('发起滑移的玩家')
    expect(result.inlineTerms[0].definitionType).toBe('inline')
    expect(result.inlineTerms[1].term).toBe('目标')
    expect(result.inlineTerms[1].definition).toBe('被冲击的对象')
  })

  test('跳过代码块内的定义', () => {
    const content = `正文内容

\`\`\`
【这不是定义】：这在代码块内
\`\`\`

【真正的定义】：这在代码块外`

    const result = parseFile(content, 'test.md')
    expect(result.inlineTerms).toHaveLength(1)
    expect(result.inlineTerms[0].term).toBe('真正的定义')
  })

  test('跳过行内代码中的定义', () => {
    const content = `使用 \`【词条】：定义\` 语法来创建定义

【实际定义】：这是真正的定义`

    const result = parseFile(content, 'test.md')
    expect(result.inlineTerms).toHaveLength(1)
    expect(result.inlineTerms[0].term).toBe('实际定义')
  })
})

describe('parseFile — 策划公式', () => {
  test('解析 %% 公式 %%', () => {
    const content = `%% [伤害] = <攻击力> * <冲击系数> %%`

    const result = parseFile(content, 'test.md')
    expect(result.formulas).toHaveLength(1)
    expect(result.formulas[0].expression).toBe('[伤害] = <攻击力> * <冲击系数>')
    expect(result.formulas[0].calculatedValues).toEqual(['伤害'])
    expect(result.formulas[0].designValues).toEqual(['攻击力', '冲击系数'])
  })

  test('解析多个公式', () => {
    const content = `%% [伤害] = <暴击率> * (<暴击伤害> + 1) * <攻击力> %%
%% [实际伤害] = [伤害] * (1 - <减伤比例>) %%`

    const result = parseFile(content, 'test.md')
    expect(result.formulas).toHaveLength(2)
    expect(result.formulas[0].calculatedValues).toEqual(['伤害'])
    expect(result.formulas[1].calculatedValues).toEqual(['实际伤害', '伤害'])
  })

  test('跳过代码块内的公式', () => {
    const content = `\`\`\`
%% [不是公式] = <不是值> %%
\`\`\`

%% [真正的公式] = <真正的值> %%`

    const result = parseFile(content, 'test.md')
    expect(result.formulas).toHaveLength(1)
    expect(result.formulas[0].calculatedValues).toEqual(['真正的公式'])
  })
})

describe('extractCalculatedValues', () => {
  test('提取计算值', () => {
    expect(extractCalculatedValues('[伤害] = [防御] * 2')).toEqual(['伤害', '防御'])
  })

  test('无计算值时返回空数组', () => {
    expect(extractCalculatedValues('<攻击力> + 1')).toEqual([])
  })
})

describe('extractDesignValues', () => {
  test('提取设计值', () => {
    expect(extractDesignValues('<攻击力> * <防御力>')).toEqual(['攻击力', '防御力'])
  })

  test('无设计值时返回空数组', () => {
    expect(extractDesignValues('[伤害] + 1')).toEqual([])
  })
})
