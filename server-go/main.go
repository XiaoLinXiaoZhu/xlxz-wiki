package main

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"xlxz-wiki/indexer"
	"xlxz-wiki/watcher"
	"xlxz-wiki/ws"
)

//go:embed dist/*
var distFS embed.FS

var (
	wikiDocsDir string
	idx         *indexer.WikiIndexer
	hub         *ws.Hub
)

func main() {
	// 解析路径
	rootDir, _ := os.Getwd()
	wikiDocsDir = filepath.Join(rootDir, "wiki-docs")
	distDir := filepath.Join(rootDir, "dist")

	// 初始化 WebSocket Hub
	hub = ws.NewHub()
	go hub.Run()

	// 初始化索引器
	idx = indexer.New(wikiDocsDir)
	if err := idx.BuildIndex(); err != nil {
		log.Printf("[索引] 构建失败: %v", err)
	}

	// 启动文件监听
	go watcher.Watch(wikiDocsDir, idx, hub)

	// 路由
	http.HandleFunc("/api/index", handleIndex)
	http.HandleFunc("/api/file", handleFile)
	http.HandleFunc("/api/files", handleFiles)
	http.HandleFunc("/api/search", handleSearch)
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		ws.ServeWs(hub, w, r)
	})

	// 静态文件服务
	if hasEmbeddedDist() {
		// 编译模式：从内嵌资源读取
		distSub, _ := fs.Sub(distFS, "dist")
		fileServer := http.FileServer(http.FS(distSub))
		http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			// SPA 回退
			path := r.URL.Path
			if path != "/" && !strings.Contains(path, ".") {
				r.URL.Path = "/"
			}
			fileServer.ServeHTTP(w, r)
		})
	} else if dirExists(distDir) {
		// 开发模式：从文件系统读取
		fileServer := http.FileServer(http.Dir(distDir))
		http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			path := r.URL.Path
			if path != "/" && !strings.Contains(path, ".") {
				http.ServeFile(w, r, filepath.Join(distDir, "index.html"))
				return
			}
			fileServer.ServeHTTP(w, r)
		})
	} else {
		http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(404)
			w.Write([]byte("XLXZ Wiki — 前端资源未构建，请先运行 pnpm build"))
		})
	}

	// 查找可用端口
	port := findAvailablePort(3055, 10)

	// 打印启动信息
	fmt.Printf(`
╔══════════════════════════════════════════╗
║         XLXZ Wiki v4 服务器已启动         ║
║              (Go Edition)                ║
╠══════════════════════════════════════════╣
║  地址: http://127.0.0.1:%d
║  文档: %s
╚══════════════════════════════════════════╝
`, port, wikiDocsDir)

	// Windows 下自动打开浏览器
	if runtime.GOOS == "windows" {
		exec.Command("cmd", "/c", "start", fmt.Sprintf("http://127.0.0.1:%d/", port)).Start()
	}

	// 启动服务器
	addr := fmt.Sprintf(":%d", port)
	log.Fatal(http.ListenAndServe(addr, nil))
}

// API 处理函数
func handleIndex(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(idx.GetIndex())
}

func handleFile(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	if path == "" {
		http.Error(w, "缺少 path 参数", 400)
		return
	}

	fullPath := filepath.Join(wikiDocsDir, path)
	
	// 安全检查：防止路径遍历
	if !strings.HasPrefix(fullPath, wikiDocsDir) {
		http.Error(w, "非法路径", 403)
		return
	}

	if r.Method == "POST" {
		// 写入文件
		var body struct {
			Content string `json:"content"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "无效的请求体", 400)
			return
		}
		if err := os.WriteFile(fullPath, []byte(body.Content), 0644); err != nil {
			http.Error(w, "写入失败: "+err.Error(), 500)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"success": true})
	} else {
		// 读取文件
		content, err := os.ReadFile(fullPath)
		if err != nil {
			http.Error(w, "文件不存在", 404)
			return
		}
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.Write(content)
	}
}

func handleFiles(w http.ResponseWriter, r *http.Request) {
	tree := buildFileTree(wikiDocsDir, "")
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tree)
}

func handleSearch(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	results := idx.Search(q)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

// 辅助函数
func hasEmbeddedDist() bool {
	_, err := distFS.ReadFile("dist/index.html")
	return err == nil
}

func dirExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

func findAvailablePort(start, maxAttempts int) int {
	for i := 0; i < maxAttempts; i++ {
		port := start + i
		addr := fmt.Sprintf(":%d", port)
		listener, err := (&net.ListenConfig{}).Listen(context.Background(), "tcp", addr)
		if err == nil {
			listener.Close()
			if port != start {
				log.Printf("[端口] %d 已被占用，使用 %d", start, port)
			}
			return port
		}
	}
	log.Fatalf("无法找到可用端口 (尝试了 %d-%d)", start, start+maxAttempts-1)
	return start
}

// FileTreeNode 文件树节点
type FileTreeNode struct {
	Name        string          `json:"name"`
	Path        string          `json:"path"`
	IsDirectory bool            `json:"isDirectory"`
	Children    []*FileTreeNode `json:"children,omitempty"`
}

func buildFileTree(rootDir, relativePath string) []*FileTreeNode {
	fullPath := filepath.Join(rootDir, relativePath)
	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return nil
	}

	var nodes []*FileTreeNode
	for _, entry := range entries {
		name := entry.Name()
		if strings.HasPrefix(name, ".") {
			continue
		}

		nodePath := filepath.Join(relativePath, name)
		node := &FileTreeNode{
			Name:        name,
			Path:        filepath.ToSlash(nodePath),
			IsDirectory: entry.IsDir(),
		}

		if entry.IsDir() {
			node.Children = buildFileTree(rootDir, nodePath)
		} else if !strings.HasSuffix(name, ".md") {
			continue // 只显示 .md 文件
		}

		nodes = append(nodes, node)
	}
	return nodes
}
