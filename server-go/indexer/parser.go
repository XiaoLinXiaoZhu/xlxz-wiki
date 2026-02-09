package indexer

import (
	"os"
	"regexp"
	"strings"
)

var (
	// frontmatter 正则
	frontmatterRe = regexp.MustCompile(`(?s)^---\n(.+?)\n---`)
	
	// 文件内定义：【词条】：定义内容
	inlineDefRe = regexp.MustCompile(`【([^】]+)】[：:]\s*(.+?)(?:\n|$)`)
	
	// 策划公式：%% 表达式 %%
	formulaRe = regexp.MustCompile(`%%\s*(.+?)\s*%%`)
	
	// 计算值：[xxx]
	calcValueRe = regexp.MustCompile(`\[([^\]]+)\]`)
	
	// 设计值：<xxx>
	designValueRe = regexp.MustCompile(`<([^>]+)>`)
)

// ParseFile 解析 Markdown 文件
func ParseFile(fullPath, relPath string) ([]*WikiTerm, []*WikiFormula, string) {
	content, err := os.ReadFile(fullPath)
	if err != nil {
		return nil, nil, ""
	}

	text := string(content)
	var terms []*WikiTerm
	var formulas []*WikiFormula
	var scope string

	// 解析 frontmatter
	fm := parseFrontmatter(text)
	if fm != nil {
		scope = fm["scope"]
		
		// 从 frontmatter 创建词条
		term := strings.TrimSuffix(relPath, ".md")
		if idx := strings.LastIndex(term, "/"); idx != -1 {
			term = term[idx+1:]
		}
		
		aliases := []string{term}
		if aliasStr, ok := fm["alias"]; ok {
			for _, a := range strings.Split(aliasStr, ",") {
				a = strings.TrimSpace(a)
				if a != "" && a != term {
					aliases = append(aliases, a)
				}
			}
		}

		// 提取定义（支持 <!-- more --> 截断）
		definition, hasMore := extractDefinition(text)

		if definition != "" {
			terms = append(terms, &WikiTerm{
				Term:           term,
				Aliases:        aliases,
				Definition:     definition,
				Scope:          scope,
				FilePath:       relPath,
				DefinitionType: "file",
				HasMore:        hasMore,
			})
		}
	}

	// 解析文件内定义
	matches := inlineDefRe.FindAllStringSubmatch(text, -1)
	for _, m := range matches {
		termName := m[1]
		def := strings.TrimSpace(m[2])
		terms = append(terms, &WikiTerm{
			Term:           termName,
			Aliases:        []string{termName},
			Definition:     def,
			Scope:          scope,
			FilePath:       relPath,
			DefinitionType: "inline",
		})
	}

	// 解析策划公式
	formulaMatches := formulaRe.FindAllStringSubmatch(text, -1)
	for _, m := range formulaMatches {
		expr := m[1]
		
		var calcValues []string
		for _, cv := range calcValueRe.FindAllStringSubmatch(expr, -1) {
			calcValues = append(calcValues, cv[1])
		}
		
		var designValues []string
		for _, dv := range designValueRe.FindAllStringSubmatch(expr, -1) {
			designValues = append(designValues, dv[1])
		}

		if len(calcValues) > 0 || len(designValues) > 0 {
			formulas = append(formulas, &WikiFormula{
				Expression:       expr,
				CalculatedValues: calcValues,
				DesignValues:     designValues,
				Scope:            scope,
				FilePath:         relPath,
			})
		}
	}

	return terms, formulas, scope
}

func parseFrontmatter(text string) map[string]string {
	match := frontmatterRe.FindStringSubmatch(text)
	if match == nil {
		return nil
	}

	fm := make(map[string]string)
	lines := strings.Split(match[1], "\n")
	for _, line := range lines {
		parts := strings.SplitN(line, ":", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])
			fm[key] = value
		}
	}
	return fm
}

// moreTagRe 匹配 <!-- more --> 标记
var moreTagRe = regexp.MustCompile(`(?i)^\s*<!--\s*more\s*-->\s*$`)

// extractDefinition 提取定义内容，支持 <!-- more --> 截断
// 返回定义内容和是否有更多内容
func extractDefinition(text string) (string, bool) {
	// 移除 frontmatter
	text = frontmatterRe.ReplaceAllString(text, "")
	
	lines := strings.Split(text, "\n")
	var contentLines []string
	hasMore := false
	
	for _, line := range lines {
		// 检查 <!-- more --> 标记
		if moreTagRe.MatchString(line) {
			hasMore = true
			break
		}
		
		trimmed := strings.TrimSpace(line)
		// 跳过标题、分隔线、空行和内联定义
		if trimmed == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(trimmed, "---") {
			continue
		}
		if inlineDefRe.MatchString(line) {
			continue
		}
		
		contentLines = append(contentLines, line)
	}
	
	return strings.TrimSpace(strings.Join(contentLines, "\n")), hasMore
}
