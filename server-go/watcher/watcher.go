package watcher

import (
	"encoding/json"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/fsnotify/fsnotify"
	"xlxz-wiki/indexer"
	"xlxz-wiki/ws"
)

// FileChangeMessage 文件变更消息
type FileChangeMessage struct {
	Type    string `json:"type"`
	Payload struct {
		Path   string `json:"path"`
		Action string `json:"action"`
	} `json:"payload"`
}

// Watch 监听文件变更
func Watch(rootDir string, idx *indexer.WikiIndexer, hub *ws.Hub) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		log.Printf("[监听] 创建失败: %v", err)
		return
	}
	defer watcher.Close()

	// 添加目录监听
	err = filepath.Walk(rootDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if info.IsDir() {
			return watcher.Add(path)
		}
		return nil
	})
	if err != nil {
		log.Printf("[监听] 添加目录失败: %v", err)
		return
	}

	log.Printf("[监听] 开始监听 %s", rootDir)

	// 防抖：记录最后一次事件时间
	lastEvent := make(map[string]time.Time)
	debounceDelay := 100 * time.Millisecond

	for {
		select {
		case event, ok := <-watcher.Events:
			if !ok {
				return
			}

			// 只处理 .md 文件
			if !strings.HasSuffix(event.Name, ".md") {
				continue
			}

			// 防抖
			now := time.Now()
			if last, ok := lastEvent[event.Name]; ok && now.Sub(last) < debounceDelay {
				continue
			}
			lastEvent[event.Name] = now

			relPath, _ := filepath.Rel(rootDir, event.Name)
			relPath = filepath.ToSlash(relPath)

			var action string
			switch {
			case event.Op&fsnotify.Create == fsnotify.Create:
				action = "create"
				idx.UpdateFile(relPath)
			case event.Op&fsnotify.Write == fsnotify.Write:
				action = "update"
				idx.UpdateFile(relPath)
			case event.Op&fsnotify.Remove == fsnotify.Remove:
				action = "delete"
				idx.RemoveFile(relPath)
			case event.Op&fsnotify.Rename == fsnotify.Rename:
				action = "delete"
				idx.RemoveFile(relPath)
			default:
				continue
			}

			log.Printf("[监听] %s: %s", action, relPath)

			// 广播变更消息
			msg := FileChangeMessage{Type: "file-changed"}
			msg.Payload.Path = relPath
			msg.Payload.Action = action
			data, _ := json.Marshal(msg)
			hub.Broadcast(data)

		case err, ok := <-watcher.Errors:
			if !ok {
				return
			}
			log.Printf("[监听] 错误: %v", err)
		}
	}
}
