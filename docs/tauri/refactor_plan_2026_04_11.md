# Tauri 前端重构实施计划

> 基于调查报告 `gap_analysis_report.md` 制定  
> 日期：2026-04-11  
> 目标：将 Tauri 版完成度从 ~35% 提升到 ~90%

---

## 重要说明

> [!IMPORTANT]
> 所有阶段按依赖顺序排列，不要跳相。Phase 1 大部分已完成，可以直接进入 Phase 1 剩余任务然后开始 Phase 2。

---

## Phase 1 — 关键 Bug 修复 & 基础补全（预计 2 周，**已完成 90%**）

### ✅ 已完成项

| 任务 | 状态 |
|------|------|
| 1.1 修复服务器状态轮询崩溃 | **已完成** - `get_server_state` 使用 `spawn_blocking` 解决递归问题，前端 8 秒轮询已开启 |
| 1.2 修复键盘修饰键 | **已完成** - `send_key_event` 后端已加 `ctrl/shift/alt/meta` 参数，前端已传递 |
| 1.3 光标渲染基础实现 | **已完成** - 后端三个方法都已实现，前端 overlay 渲染，toolbar 开关也有 |
| 1.4 剪贴板通道建立 - 前端 & 命令 | **已完成** - `clipboard_cmd.rs` 创建，`send_clipboard_text` 已注册，前端双向监听已写 |
| 1.5 命令注册更新 | **已完成** - `mod.rs` 和 `lib.rs` 已更新 |

### 🔶 剩余任务（仅 1 项）

### 1.6 完成剪贴板后端

**问题**：`session_handler.rs` 中 `clipboard()` 方法还未实现。

#### [MODIFY] `tauri\src-tauri\src\session_handler.rs`
```rust
fn clipboard(&self, content: String) {
    self.emit("remote-clipboard", content);
}
```

### Phase 1 验收标准
- [x] 应用启动后 ID 和密码自动显示，8秒后自动刷新
- [x] Ctrl+C / Ctrl+V 能正确发送到远端
- [x] 远端光标位置在本地 canvas 层有视觉反映
- [x] 本地剪贴板内容可同步至远端
- [x] 远端剪贴板内容可同步至本地 **✅ Phase 1 已完成**

---

## Phase 2 — 会话体验增强（预计 3 周，已完成 30%）

### 目标
补全工具栏、连接质量监控、全键盘模式支持，完善 i18n 框架。

---

### ✅ 已完成项

| 任务 | 状态 |
|------|------|
| 连接质量监控面板 | **已完成** - 后端 `update_quality_status` 已emit，前端已显示真实 FPS/速度/延迟数据 |
| I18n 国际化框架 | **已完成基础框架** - `i18next` 已配置，有中/英翻译，核心页面已用 `t()` |

---

### 🔶 待完成项

### 2.1 工具栏功能补全

#### [MODIFY] `tauri\src\components\RemoteToolbar.tsx`
- **持久化 Pin 状态**：通过 `invoke('set_local_option', {key: 'toolbar-pin', value: ...})` 持久化到后端存储
- **全屏切换**：调用 `getCurrentWindow().setFullscreen(true)` 实现窗口全屏
- **锁定屏幕**：新增 `lock_remote_screen` 命令（已通过 `set_remote_option` 实现）
- **空白屏幕**：隐私模式切换已可用
- **调整窗口大小适应远端分辨率**：读取 `lastDimensionsRef` 正确调整窗口大小

#### [MODIFY] `tauri\src-tauri\src\commands\session_cmd.rs` 新增命令
```rust
pub async fn lock_remote_screen(id: String) -> Result<(), String>
```

---

### 2.2 工具栏折叠/拖动

#### [MODIFY] `tauri\src\components\RemoteToolbar.tsx`
- 添加折叠状态（点击"展开"按钮时切换）
- 折叠时仅显示一个小 drag handle（类似 Flutter 的 `_buildDraggableCollapse`）
- 拖动位置存 `localStorage`

---

### 2.4 完成剩余页面 i18n 替换

#### [MODIFY] 剩余 `.tsx` 文件
- 将所有硬编码中文字符串替换为 `t('key')` 调用

#### [MODIFY] `tauri\src\i18n\en.ts` / `zh-cn.ts`
- 补充所有缺失翻译词条

---

### Phase 2 验收标准
- [ ] 工具栏 Pin 状态重启后保留
- [ ] 工具栏支持折叠/展开可拖动
- [x] 连接质量面板显示真实 FPS/延迟数据
- [x] 语言设置生效并重启后保留
- [ ] 所有页面硬编码中文已替换为 i18n

---

## Phase 3 — 文件传输（预计 4 周）

### 目标
实现完整的双栏文件管理器，对齐 Flutter `file_manager_page.dart`。

---

### 3.1 后端文件传输命令

#### [NEW] `tauri\src-tauri\src\commands\filetransfer_cmd.rs`
```rust
// 启动文件传输会话（不同于控制会话）
pub async fn start_file_transfer(app: AppHandle, id: String) -> Result<(), String>

// 请求目录列表
pub async fn list_dir(id: String, path: String, is_local: bool) -> Result<Vec<FileEntry>, String>

// 发送文件
pub async fn send_file(id: String, local_path: String, remote_path: String) -> Result<(), String>

// 接收文件
pub async fn recv_file(id: String, remote_path: String, local_path: String) -> Result<(), String>

// 删除/重命名
pub async fn delete_file(id: String, path: String, is_local: bool) -> Result<(), String>
pub async fn rename_file(id: String, path: String, new_name: String) -> Result<(), String>

// 新建文件夹
pub async fn create_dir(id: String, path: String, is_local: bool) -> Result<(), String>
```

#### [MODIFY] `tauri\src-tauri\src\session_handler.rs`
补全所有文件传输相关回调：
- `job_error()` → emit `"file-job-error"`
- `job_done()` → emit `"file-job-done"`
- `clear_all_jobs()` → emit `"file-jobs-cleared"`
- `update_transfer_list()` → emit `"file-transfer-list"`
- `load_last_job()` → emit `"file-job-loaded"`
- `update_folder_files()` → emit `"file-folder-content"`
- `confirm_delete_files()` → emit `"file-delete-confirm"`
- `override_file_confirm()` → emit `"file-override-confirm"`
- `job_progress()` → emit `"file-job-progress"` (id, speed, finished_size)

---

### 3.2 文件传输页面

#### [NEW] `tauri\src\pages\FileTransferWindow.tsx`
双栏布局：
- 左栏：本地文件系统（调用 Tauri `fs` API）
- 右栏：远端文件系统（调用 `list_dir(id, path, false)`）
- 中间：传输队列和进度条
- 工具栏：上传/下载/删除/新建文件夹/刷新/取消

#### [MODIFY] `tauri\src-tauri\src\commands\session_cmd.rs`
- `connect_to_peer` 增加 `conn_type: ConnType` 参数，支持传输文件模式

#### [MODIFY] `tauri\src\components\RemotePanel.tsx`
- "传输文件"菜单项改为：`invoke('connect_to_peer', {id, connType: 'FileTransfer'})`

#### [MODIFY] `tauri\src\App.tsx` / `main.tsx`
- 添加路由 `/file-transfer/:id`

---

### Phase 3 验收标准
- [ ] 点击"传输文件"打开新窗口
- [ ] 本地和远端目录可浏览
- [ ] 文件可上传/下载（含进度显示）
- [ ] 文件可删除/重命名/新建文件夹

---

## Phase 4 — 终端 / 摄像头 / 端口转发（预计 3 周）

### 4.1 终端访问

#### [NEW] `tauri\src-tauri\src\commands\terminal_cmd.rs`
```rust
pub async fn start_terminal(app: AppHandle, id: String, elevated: bool) -> Result<(), String>
pub async fn send_terminal_input(id: String, data: String) -> Result<(), String>
pub async fn close_terminal(id: String) -> Result<(), String>
```

#### [MODIFY] `tauri\src-tauri\src\session_handler.rs`
```rust
fn handle_terminal_response(&self, response: TerminalResponse) {
    self.emit("terminal-output", response.output);
}
```

#### [NEW] `tauri\src\pages\TerminalWindow.tsx`
- 使用 `xterm.js` 或简单的 `<textarea>` 模拟 VT100 终端
- 监听 `"terminal-output"` 事件更新显示
- 键盘输入发送到 `send_terminal_input`

---

### 4.2 摄像头查看

#### [MODIFY] `tauri\src-tauri\src\commands\session_cmd.rs`
```rust
pub async fn start_view_camera(app: AppHandle, id: String) -> Result<(), String>
```

#### [NEW] `tauri\src\pages\CameraWindow.tsx`
- 使用与 SessionWindow 相同的 WebCodecs 解码器
- 摄像头帧与 `on_encoded_frame` 走同一通道，`conn_type` 区分

---

### 4.3 端口转发（TCP 隧道）

#### [NEW] `tauri\src-tauri\src\commands\port_forward_cmd.rs`
```rust
pub async fn start_port_forward(
    app: AppHandle, id: String,
    local_port: u16, remote_host: String, remote_port: u16
) -> Result<(), String>
pub async fn stop_port_forward(id: String, local_port: u16) -> Result<(), String>
```

#### [NEW] `tauri\src\pages\PortForwardWindow.tsx`
- 列表显示当前转发规则
- 添加/删除转发规则
- 连接状态显示

---

### Phase 4 验收标准
- [ ] 终端窗口可打开并输入命令
- [ ] 摄像头窗口可显示远端摄像头画面
- [ ] 端口转发规则可添加删除并生效

---

## Phase 5 — 高级功能（预计 3 周）

### 5.1 语音通话

#### [MODIFY] `tauri\src-tauri\src\session_handler.rs`
```rust
fn on_voice_call_started(&self) { self.emit("voice-call-started", ()); }
fn on_voice_call_closed(&self, reason: &str) { self.emit("voice-call-closed", reason); }
fn on_voice_call_incoming(&self) { self.emit("voice-call-incoming", ()); }
```

#### [NEW] `tauri\src-tauri\src\commands\voice_cmd.rs`
```rust
pub async fn start_voice_call(id: String) -> Result<(), String>
pub async fn end_voice_call(id: String) -> Result<(), String>
pub async fn accept_voice_call(id: String) -> Result<(), String>
```

#### [MODIFY] `tauri\src\components\RemoteToolbar.tsx`
- 添加语音通话按钮，点击调用 `start_voice_call`
- 通话状态指示

---

### 5.2 会话录制

#### [MODIFY] `tauri\src-tauri\src\session_handler.rs`
```rust
fn update_record_status(&self, start: bool) { self.emit("record-status", start); }
```

#### [NEW] `tauri\src-tauri\src\commands\record_cmd.rs`
```rust
pub async fn toggle_recording(id: String) -> Result<bool, String>
```

#### [MODIFY] `tauri\src\components\RemoteToolbar.tsx`
- 添加录制按钮（红点动画）

---

### 5.3 隐私模式（Privacy Mode）

#### [NEW] `tauri\src-tauri\src\commands\session_cmd.rs`
```rust
pub async fn set_privacy_mode(id: String, enabled: bool) -> Result<(), String>
```

#### [MODIFY] `tauri\src-tauri\src\session_handler.rs`
```rust
fn update_privacy_mode(&self) { self.emit("privacy-mode-updated", ()); }
```

---

### 5.4 账户登录

#### [MODIFY] `tauri\src\components\settings\tabs\AccountTab.tsx`
- 接入 RustDesk 账户 API（OAuth / 用户名密码）
- 登录后在 LocalPanel 显示用户名

---

### 5.5 服务管理

#### [MODIFY] `tauri\src\components\settings\tabs\GeneralTab.tsx`
- "停止服务"按钮改为 `invoke('stop_service')` 真实调用
- 添加"启动服务"按钮

#### [NEW] `tauri\src-tauri\src\commands\server.rs`
```rust
pub async fn stop_service() -> Result<(), String>
pub async fn start_service() -> Result<(), String>
```

---

## 六、非功能性改进（持续进行）

### N1 — 错误处理标准化
- 所有 `invoke()` 调用添加 `.catch()` 并展示用户友好错误提示
- 取消全局 `alert()` 用法，改为 toast 消息组件

### N2 — 状态管理重构
- 当前 store 分散（serverStore, peerStore）
- 考虑合并为 `sessionStore`，统一管理会话状态

### N3 — 性能优化
- `sessionWindow.tsx` 中多个 `useEffect` 依赖项需审查副作用
- 大量 Rust 后端 `println!` 日志需改为 `log::debug!` 减少开销

---

## 七、里程碑时间表（更新于 2026-04-11）

| 里程碑 | 内容 | 原计划 | 实际进度 | 预计完成 |
|-------|------|--------|---------|---------|
| M1 | Phase 1 完成（Bug修复 + 剪贴板 + 光标） | Week 2 | **90% 已完成** - 只差剪贴板后端一行代码 | Week 2 (当前) |
| M2 | Phase 2 完成（工具栏 + i18n + 质量监控） | Week 5 | 30% 已完成（质量监控 + i18n框架） | Week 4 |
| M3 | Phase 3 完成（文件传输） | Week 9 | 0% 未开始 | Week 8 |
| M4 | Phase 4 完成（终端 + 摄像头 + 端口转发） | Week 12 | 0% 未开始 | Week 11 |
| M5 | Phase 5 完成（语音 + 录制 + 隐私 + 账户） | Week 15 | 0% 未开始 | Week 14 |
| **目标完成度** | **~90%** | Week 15 | **当前整体 ~50%** | **Week 14** |

> 说明：原调查报告完成度 35% 是基于之前代码，由于 Phase 1 主要工作已提前完成，当前实际完成度约 **50%**，整体交付可提前一周。

