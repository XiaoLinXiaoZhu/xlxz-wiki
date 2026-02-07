/**
 * term-resolver.ts 单元测试
 * 测试 scope 优先级、过滤、近似匹配
 */
import { describe, test, expect } from 'bun:test'
import { resolveTerm, filterByScope, levenshteinDistance } from '../src/utils/term-resolver'
import type { WikiIndex, WikiTerm } from '../shared/types'

// ─── 测试数据 ─────────────────────────────────────────────

function makeTerm(overrides: Partial<WikiTerm>): WikiTerm {
  return {
    term: 'NPC',
    aliases: ['NPC'],
    definition: '默认定义',
    scope: '',
    filePath: 'test.md',
    definitionType: 'file',
    ...overrides,
  }
}

const testIndex: WikiIndex = {
  terms: {
    'NPC': [
      makeTerm({ definition: 'game1 的 NPC', scope: 'game1', filePath: 'game1/npc.md' }),
      makeTerm({ definition: '全局 NPC', scope: '', filePath: 'npc.md' }),
      makeTerm({ definition: 'game2 的 NPC', scope: 'game2', filePath: 'game2/npc.md' }),
    ],
    '滑移': [
      makeTerm({ term: '滑移', aliases: ['滑移'], definition: '滑移定义', scope: '', filePath: '滑移.md' }),
    ],
    '伤害': [
      makeTerm({ term: '伤害', aliases: ['伤害'], definition: '文件内伤害定义', scope: 'game1', filePath: 'game1/战斗.md', definitionType: 'inline' }),
      makeTerm({ term: '伤害', aliases: ['伤害'], definition: '全局伤害定义', scope: '', filePath: '伤害.md' }),
    ],
  },
  formulas: {},
  scopes: ['game1', 'game2'],
  buildTime: 0,
}

// ─── resolveTerm 测试 ─────────────────────────────────────

describe('resolveTerm — 基本查找', () => {
  test('精确匹配返回 exact=true', () => {
    const result = resolveTerm('NPC', testIndex, '', 'test.md')
    expect(result.exact).toBe(true)
    expect(result.definitions.length).toBe(3)
  })

  test('未找到返回 exact=false', () => {
    const result = resolveTerm('不存在的词条', testIndex, '', 'test.md')
    expect(result.exact).toBe(false)
    expect(result.definitions).toHaveLength(0)
  })
})

describe('resolveTerm — scope 优先级排序', () => {
  test('当前 scope 的定义排在全局之前', () => {
    const result = resolveTerm('NPC', testIndex, 'game1', 'game1/test.md')
    expect(result.definitions[0].scope).toBe('game1')
    expect(result.definitions[1].scope).toBe('')
  })

  test('文件内定义排在最前', () => {
    const result = resolveTerm('伤害', testIndex, 'game1', 'game1/战斗.md')
    expect(result.definitions[0].definitionType).toBe('inline')
    expect(result.definitions[0].filePath).toBe('game1/战斗.md')
  })

  test('显式 scope 引用 game2/NPC', () => {
    const result = resolveTerm('game2/NPC', testIndex, 'game1', 'game1/test.md')
    expect(result.exact).toBe(true)
    expect(result.definitions[0].scope).toBe('game2')
  })
})

// ─── filterByScope 测试 ──────────────────────────────────

describe('filterByScope', () => {
  const allNPC = testIndex.terms['NPC']

  test('普通引用：只显示当前 scope + 全局', () => {
    const filtered = filterByScope(allNPC, null, 'game1', 'test.md')
    expect(filtered.length).toBe(2)
    expect(filtered.some(d => d.scope === 'game1')).toBe(true)
    expect(filtered.some(d => d.scope === '')).toBe(true)
    expect(filtered.some(d => d.scope === 'game2')).toBe(false)
  })

  test('显式引用 game2：显示 game2 + 全局', () => {
    const filtered = filterByScope(allNPC, 'game2', 'game1', 'test.md')
    expect(filtered.length).toBe(2)
    expect(filtered.some(d => d.scope === 'game2')).toBe(true)
    expect(filtered.some(d => d.scope === '')).toBe(true)
    expect(filtered.some(d => d.scope === 'game1')).toBe(false)
  })

  test('无 scope 时只显示全局', () => {
    const filtered = filterByScope(allNPC, null, '', 'test.md')
    expect(filtered.length).toBe(1)
    expect(filtered[0].scope).toBe('')
  })
})

// ─── 近似匹配测试 ─────────────────────────────────────────

describe('resolveTerm — 近似匹配', () => {
  test('拼写错误时返回建议', () => {
    const result = resolveTerm('滑动', testIndex, '', 'test.md')
    expect(result.exact).toBe(false)
    expect(result.suggestions.length).toBeGreaterThan(0)
    expect(result.suggestions.some(s => s.term === '滑移')).toBe(true)
  })

  test('完全不相关的词不返回建议', () => {
    const result = resolveTerm('完全不相关的超长词条名称', testIndex, '', 'test.md')
    expect(result.exact).toBe(false)
    expect(result.suggestions).toHaveLength(0)
  })
})

// ─── levenshteinDistance 测试 ─────────────────────────────

describe('levenshteinDistance', () => {
  test('相同字符串距离为 0', () => {
    expect(levenshteinDistance('滑移', '滑移')).toBe(0)
  })

  test('空字符串', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3)
    expect(levenshteinDistance('abc', '')).toBe(3)
  })

  test('单字符替换', () => {
    expect(levenshteinDistance('滑移', '滑动')).toBe(1)
  })

  test('单字符插入', () => {
    expect(levenshteinDistance('冲击', '冲击力')).toBe(1)
  })

  test('多字符差异', () => {
    expect(levenshteinDistance('攻击', '攻击力')).toBe(1)
    expect(levenshteinDistance('abc', 'xyz')).toBe(3)
  })
})
