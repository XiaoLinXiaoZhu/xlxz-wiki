package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"
)

func TestBuildFileTree_MergesSameNameDirAndFile(t *testing.T) {
	// 创建临时目录结构模拟 wiki-docs
	tmpDir := t.TempDir()

	// 创建 "角色系统" 目录
	dirPath := filepath.Join(tmpDir, "角色系统")
	if err := os.Mkdir(dirPath, 0755); err != nil {
		t.Fatal(err)
	}

	// 在目录内创建一个子文件
	if err := os.WriteFile(filepath.Join(dirPath, "战斗公式.md"), []byte("# 战斗公式"), 0644); err != nil {
		t.Fatal(err)
	}

	// 创建同名 .md 文件
	if err := os.WriteFile(filepath.Join(tmpDir, "角色系统.md"), []byte("# 角色系统"), 0644); err != nil {
		t.Fatal(err)
	}

	// 创建一个普通 .md 文件（不应被合并）
	if err := os.WriteFile(filepath.Join(tmpDir, "README.md"), []byte("# README"), 0644); err != nil {
		t.Fatal(err)
	}

	// 调用 buildFileTree
	tree := buildFileTree(tmpDir, "")

	// 打印结果用于调试
	jsonBytes, _ := json.MarshalIndent(tree, "", "  ")
	fmt.Println("文件树结果:")
	fmt.Println(string(jsonBytes))

	// 验证：应该只有 2 个顶层节点（角色系统目录 + README.md）
	if len(tree) != 2 {
		t.Errorf("期望 2 个顶层节点，实际 %d 个", len(tree))
		for _, n := range tree {
			t.Logf("  节点: name=%s, isDir=%v, readmePath=%s", n.Name, n.IsDirectory, n.ReadmePath)
		}
	}

	// 验证：角色系统目录应该有 readmePath
	var dirNode *FileTreeNode
	for _, n := range tree {
		if n.Name == "角色系统" && n.IsDirectory {
			dirNode = n
			break
		}
	}

	if dirNode == nil {
		t.Fatal("未找到 '角色系统' 目录节点")
	}

	if dirNode.ReadmePath == "" {
		t.Error("角色系统目录的 ReadmePath 为空，应该是 '角色系统.md'")
	} else {
		t.Logf("角色系统目录的 ReadmePath = %s", dirNode.ReadmePath)
	}

	// 验证：角色系统.md 不应该单独出现
	for _, n := range tree {
		if n.Name == "角色系统.md" {
			t.Error("角色系统.md 不应该单独出现在文件树中，应该被合并到目录节点")
		}
	}
}

func TestBuildFileTree_NoMergeWhenOnlyFile(t *testing.T) {
	tmpDir := t.TempDir()

	// 只有 .md 文件，没有同名目录
	if err := os.WriteFile(filepath.Join(tmpDir, "独立文件.md"), []byte("# 独立"), 0644); err != nil {
		t.Fatal(err)
	}

	tree := buildFileTree(tmpDir, "")

	if len(tree) != 1 {
		t.Errorf("期望 1 个节点，实际 %d 个", len(tree))
	}

	if tree[0].Name != "独立文件.md" {
		t.Errorf("期望节点名为 '独立文件.md'，实际 '%s'", tree[0].Name)
	}
}

func TestBuildFileTree_NoMergeWhenOnlyDir(t *testing.T) {
	tmpDir := t.TempDir()

	// 只有目录，没有同名 .md 文件
	dirPath := filepath.Join(tmpDir, "空目录")
	if err := os.Mkdir(dirPath, 0755); err != nil {
		t.Fatal(err)
	}

	tree := buildFileTree(tmpDir, "")

	if len(tree) != 1 {
		t.Errorf("期望 1 个节点，实际 %d 个", len(tree))
	}

	if tree[0].ReadmePath != "" {
		t.Errorf("无同名文件时 ReadmePath 应为空，实际 '%s'", tree[0].ReadmePath)
	}
}

func TestBuildFileTree_NestedMerge(t *testing.T) {
	tmpDir := t.TempDir()

	// 顶层：角色系统/ + 角色系统.md
	dirPath := filepath.Join(tmpDir, "角色系统")
	if err := os.Mkdir(dirPath, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(tmpDir, "角色系统.md"), []byte("# 角色系统"), 0644); err != nil {
		t.Fatal(err)
	}

	// 子层：角色系统/战斗/ + 角色系统/战斗.md
	subDir := filepath.Join(dirPath, "战斗")
	if err := os.Mkdir(subDir, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dirPath, "战斗.md"), []byte("# 战斗"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(subDir, "公式.md"), []byte("# 公式"), 0644); err != nil {
		t.Fatal(err)
	}

	tree := buildFileTree(tmpDir, "")

	// 打印结果
	jsonBytes, _ := json.MarshalIndent(tree, "", "  ")
	fmt.Println("嵌套合并结果:")
	fmt.Println(string(jsonBytes))

	// 顶层应该只有 1 个节点
	if len(tree) != 1 {
		t.Errorf("期望 1 个顶层节点，实际 %d 个", len(tree))
	}

	// 角色系统目录应有 readmePath
	if tree[0].ReadmePath == "" {
		t.Error("角色系统目录的 ReadmePath 为空")
	}

	// 子目录 战斗 也应有 readmePath
	if tree[0].Children == nil {
		t.Fatal("角色系统目录无子节点")
	}

	var battleDir *FileTreeNode
	for _, c := range tree[0].Children {
		if c.Name == "战斗" && c.IsDirectory {
			battleDir = c
		}
		// 战斗.md 不应单独出现
		if c.Name == "战斗.md" {
			t.Error("战斗.md 不应单独出现")
		}
	}

	if battleDir == nil {
		t.Fatal("未找到 '战斗' 子目录")
	}

	if battleDir.ReadmePath == "" {
		t.Error("战斗子目录的 ReadmePath 为空")
	}
}
