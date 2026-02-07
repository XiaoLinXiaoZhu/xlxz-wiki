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

		// 提取定义（第一段非空内容）
		definition := extractDefinition(text)

		if definition != "" {
			terms = append(terms, &WikiTerm{
				Term:           term,
				Aliases:        aliases,
				Definition:     definition,
				Scope:          scope,
				FilePath:       relPath,
				DefinitionType: "file",
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

func extractDefinition(text string) string {
	// 移除 frontmatter
	text = frontmatterRe.ReplaceAllString(text, "")
	
	// 按段落分割
	paragraphs := strings.Split(text, "\n\n")
	for _, p := range paragraphs {
		p = strings.TrimSpace(p)
		// 跳过标题和空行
		if p == "" || strings.HasPrefix(p, "#") {
			continue
		}
		// 返回第一个有效段落
		return p
	}
	return ""
}
