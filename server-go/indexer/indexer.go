package indexer

import (
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// WikiTerm 词条定义
type WikiTerm struct {
	Term           string   `json:"term"`
	Aliases        []string `json:"aliases"`
	Definition     string   `json:"definition"`
	Scope          string   `json:"scope"`
	FilePath       string   `json:"filePath"`
	DefinitionType string   `json:"definitionType"`
	HasMore        bool     `json:"hasMore,omitempty"`
}

// WikiFormula 策划公式
type WikiFormula struct {
	Expression       string   `json:"expression"`
	CalculatedValues []string `json:"calculatedValues"`
	DesignValues     []string `json:"designValues"`
	Scope            string   `json:"scope"`
	FilePath         string   `json:"filePath"`
}

// WikiIndex 全局索引
type WikiIndex struct {
	Terms     map[string][]*WikiTerm    `json:"terms"`
	Formulas  map[string][]*WikiFormula `json:"formulas"`
	Scopes    []string                  `json:"scopes"`
	BuildTime int64                     `json:"buildTime"`
}

// WikiIndexer 索引器
type WikiIndexer struct {
	rootDir string
	index   *WikiIndex
	mu      sync.RWMutex
}

// New 创建索引器
func New(rootDir string) *WikiIndexer {
	return &WikiIndexer{
		rootDir: rootDir,
		index: &WikiIndex{
			Terms:    make(map[string][]*WikiTerm),
			Formulas: make(map[string][]*WikiFormula),
			Scopes:   []string{},
		},
	}
}

// BuildIndex 构建索引
func (w *WikiIndexer) BuildIndex() error {
	w.mu.Lock()
	defer w.mu.Unlock()

	w.index = &WikiIndex{
		Terms:    make(map[string][]*WikiTerm),
		Formulas: make(map[string][]*WikiFormula),
		Scopes:   []string{},
	}

	scopeSet := make(map[string]bool)

	err := filepath.Walk(w.rootDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if info.IsDir() || !strings.HasSuffix(path, ".md") {
			return nil
		}

		relPath, _ := filepath.Rel(w.rootDir, path)
		relPath = filepath.ToSlash(relPath)

		terms, formulas, scope := ParseFile(path, relPath)

		if scope != "" {
			scopeSet[scope] = true
		}

		for _, term := range terms {
			for _, alias := range term.Aliases {
				w.index.Terms[alias] = append(w.index.Terms[alias], term)
			}
		}

		for _, formula := range formulas {
			for _, cv := range formula.CalculatedValues {
				w.index.Formulas[cv] = append(w.index.Formulas[cv], formula)
			}
		}

		return nil
	})

	for scope := range scopeSet {
		w.index.Scopes = append(w.index.Scopes, scope)
	}
	w.index.BuildTime = time.Now().UnixMilli()

	return err
}

// UpdateFile 更新单个文件的索引
func (w *WikiIndexer) UpdateFile(relPath string) {
	w.mu.Lock()
	defer w.mu.Unlock()

	// 移除该文件的旧条目
	w.removeFileEntries(relPath)

	// 重新解析
	fullPath := filepath.Join(w.rootDir, relPath)
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		return // 文件已删除
	}

	terms, formulas, _ := ParseFile(fullPath, relPath)

	for _, term := range terms {
		for _, alias := range term.Aliases {
			w.index.Terms[alias] = append(w.index.Terms[alias], term)
		}
	}

	for _, formula := range formulas {
		for _, cv := range formula.CalculatedValues {
			w.index.Formulas[cv] = append(w.index.Formulas[cv], formula)
		}
	}

	w.index.BuildTime = time.Now().UnixMilli()
}

// RemoveFile 移除文件的索引
func (w *WikiIndexer) RemoveFile(relPath string) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.removeFileEntries(relPath)
	w.index.BuildTime = time.Now().UnixMilli()
}

func (w *WikiIndexer) removeFileEntries(relPath string) {
	// 移除词条
	for alias, terms := range w.index.Terms {
		var filtered []*WikiTerm
		for _, t := range terms {
			if t.FilePath != relPath {
				filtered = append(filtered, t)
			}
		}
		if len(filtered) == 0 {
			delete(w.index.Terms, alias)
		} else {
			w.index.Terms[alias] = filtered
		}
	}

	// 移除公式
	for name, formulas := range w.index.Formulas {
		var filtered []*WikiFormula
		for _, f := range formulas {
			if f.FilePath != relPath {
				filtered = append(filtered, f)
			}
		}
		if len(filtered) == 0 {
			delete(w.index.Formulas, name)
		} else {
			w.index.Formulas[name] = filtered
		}
	}
}

// GetIndex 获取索引
func (w *WikiIndexer) GetIndex() *WikiIndex {
	w.mu.RLock()
	defer w.mu.RUnlock()
	return w.index
}

// Search 搜索词条
func (w *WikiIndexer) Search(query string) []*WikiTerm {
	w.mu.RLock()
	defer w.mu.RUnlock()

	if query == "" {
		return nil
	}

	query = strings.ToLower(query)
	var results []*WikiTerm
	seen := make(map[string]bool)

	for alias, terms := range w.index.Terms {
		if strings.Contains(strings.ToLower(alias), query) {
			for _, t := range terms {
				key := t.FilePath + ":" + t.Term
				if !seen[key] {
					seen[key] = true
					results = append(results, t)
				}
			}
		}
	}

	return results
}
