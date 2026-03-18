package indexer

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"
)

func TestParseFile_YAMLArrayAlias(t *testing.T) {
	tmpDir := t.TempDir()

	// 有 YAML 数组 alias + scope
	os.WriteFile(filepath.Join(tmpDir, "a.md"), []byte("---\nalias:\n  - AA\n  - BB\nscope: test\n---\n\n内容A\n"), 0644)

	// 有 YAML 数组 alias，无 scope
	os.WriteFile(filepath.Join(tmpDir, "b.md"), []byte("---\nalias:\n  - CC\n  - DD\n---\n\n内容B\n"), 0644)

	// 无 frontmatter
	os.WriteFile(filepath.Join(tmpDir, "c.md"), []byte("# 标题\n\n内容C\n"), 0644)

	tests := []struct {
		file        string
		relPath     string
		wantFile    bool
		wantAliases []string
	}{
		{"a.md", "a.md", true, []string{"a", "AA", "BB"}},
		{"b.md", "b.md", true, []string{"b", "CC", "DD"}},
		{"c.md", "c.md", false, nil},
	}

	for _, tt := range tests {
		terms, _, _ := ParseFile(filepath.Join(tmpDir, tt.file), tt.relPath)
		var fileTerm *WikiTerm
		for _, term := range terms {
			if term.DefinitionType == "file" {
				fileTerm = term
				break
			}
		}

		if tt.wantFile && fileTerm == nil {
			t.Errorf("%s: expected file-type term, got none", tt.file)
			continue
		}
		if !tt.wantFile {
			continue
		}

		got := fmt.Sprintf("%v", fileTerm.Aliases)
		want := fmt.Sprintf("%v", tt.wantAliases)
		if got != want {
			t.Errorf("%s: aliases = %s, want %s", tt.file, got, want)
		}
	}
}
