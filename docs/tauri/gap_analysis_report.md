# Tauri vs Flutter 功能差距调查报告

> 调查时间：2026-04-11  
> 更新时间：2026-04-11  
> 调查范围：`e:\projects\rustdesk\tauri\` (Tauri 版) vs `e:\projects\rustdesk\flutter\` (Flutter 原版)

---

## 一、总体架构对比

| 维度 | Flutter 原版 | Tauri 版 (当前) |
|------|------------|----------------|
| 前端技术 | Dart + Flutter Widgets | React (TSX) + Vite |
| 后端协议桥接 | Dart FFI → librustdesk | Rust Tauri commands |
| 视频渲染 | Flutter Texture / Canvas | Browser WebCodecs API (Canvas) |
| 状态管理 | GetX + Provider | Zustand (store/) |
| 路由 | flutter_hbb 多窗口 | React Router |
| 国际化 | i18n 翻译系统 | ✅ i18next 框架已建立，支持中/英文，正在逐步替换硬编码 |
| 系统托盘 | 支持 | 禁用 (no-tray=Y) ❌ |

---

## 二、功能模块差距清单

### 🔴 完全缺失（高优先级）

#### F1 — 文件传输（File Manager）
- **Flutter**：`file_manager_page.dart`（68 KB）+ `file_manager_tab_page.dart` 完整双栏文件管理器
  - 本地/远程目录浏览
  - 文件上传/下载/删除/重命名/新建文件夹
  - 传输进度条 + 队列管理
  - 空目录冲突处理
- **Tauri**：RemotePanel 中有"传输文件"菜单项但点击 `onConnect(null)` 无效，**完全未实现**

#### F2 — 终端访问（Terminal）
- **Flutter**：`terminal_page.dart` + `terminal_tab_page.dart` + `terminal_connection_manager.dart`
  - 远程 Shell/PowerShell 终端
  - 管理员权限启动
  - 专用 WebSocket/IPC 通道
- **Tauri**：`session_handler.rs` 的 `handle_terminal_response()` 为空实现，前端仅有占位菜单项

#### F3 — 摄像头查看（View Camera）
- **Flutter**：`view_camera_page.dart`（24 KB）+ `view_camera_tab_page.dart` 完整实现
- **Tauri**：RemotePanel 菜单中仅有占位，点击无效

#### F4 — 端口转发（Port Forward / TCP Tunnel）
- **Flutter**：`port_forward_page.dart`（12 KB）+ `port_forward_tab_page.dart`
- **Tauri**：peer 菜单中有"TCP 隧道"菜单项但无实现

#### F5 — 远程光标同步
- **Flutter**：`CursorPaint` widget + `cursorModel` 完整自定义光标渲染，支持光标形状/位置同步
- **Tauri**：✅ **完整实现** - 后端 `set_cursor_data()` / `set_cursor_id()` / `set_cursor_position()` 都已实现并emit事件，前端canvas overlay渲染自定义光标，RemoteToolbar有显示开关

#### F6 — 会话录制（Recording）
- **Flutter**：`_RecordMenu` 工具栏按钮 + `recordingModel` 完整实现
- **Tauri**：`update_record_status()` 为空，工具栏无录制按钮

#### F7 — 语音通话（Voice Call）
- **Flutter**：`_VoiceCallMenu` 工具栏按钮 + 完整 VoIP 通道
- **Tauri**：`on_voice_call_started/closed/waiting/incoming()` 全为空实现

#### F8 — 隐私模式（Privacy Mode）
- **Flutter**：`update_privacy_mode()` 有实现，工具栏有快捷按钮
- **Tauri**：`update_privacy_mode()` 为空

#### F9 — 多 Windows 会话（Windows Session Switcher）
- **Flutter**：完整的 Windows Session 切换（service 运行时多用户/RDP 场景）
- **Tauri**：`set_multiple_windows_session()` 为空

---

### 🟡 部分实现（中优先级）

#### P1 — 会话工具栏（Remote Toolbar）
| 功能点 | Flutter | Tauri |
|--------|---------|-------|
| Pin/Unpin 持久化 | ✅ 存储到本地选项 | ✅ 内存状态，重启丢失 |
| 可折叠 + 拖动位置 | ✅ `_buildDraggableCollapse` | ❌ 不支持 |
| 控制菜单 | ✅ 完整（电源/锁屏/空白屏…） | 🔶 基本（Ctrl+Alt+Del, Lock） |
| 显示菜单 | ✅ 缩放/比例/全屏/多显示器 | 🔶 缩放/切换显示器（无全屏） |
| 键盘菜单 | ✅ 多种键盘模式/布局选择器 | 🔶 仅两个 radio（未实际切换） |
| 聊天菜单 | ✅ 文本聊天 | ❌ 图标占位，无实现 |
| 录制按钮 | ✅ | ❌ |
| 语音通话按钮 | ✅ | ❌ |

#### P2 — 主页 / 连接面板
| 功能点 | Flutter | Tauri |
|--------|---------|-------|
| 最近连接显示 | ✅ 含在线状态/别名 | 🔶 有列表但硬编码"Windows Desktop" |
| 收藏列表 | ✅ | 🔶 Tab 存在但数据为空 |
| 发现/LAN | ✅ | ❌ Tab 存在但无实现 |
| 地址簿 | ✅ 完整企业版功能 | 🔶 独立页面但无真实数据 |
| 强制中继 | ✅ | 🔶 UI 有 checkbox 但未调用后端 |
| 创建桌面快捷方式 | ✅ | ❌ 菜单项但无实现 |
| RDP 连接 | ✅ | ❌ 菜单项但无实现 |

#### P3 — 设置页面
| 设置分类 | Flutter | Tauri |
|---------|---------|-------|
| General / 常规 | ✅ 完整 | 🔶 大部分有 UI，`stop-service` 按钮用 `alert()` |
| Security / 安全 | ✅ 完整 | 🔶 UI 存在但验证逻辑欠缺 |
| Network / 网络 | ✅ 完整 | 🔶 基本 Server 配置，缺代理/DNS |
| Display / 显示 | ✅ 完整 | 🔶 基本选项 |
| Account / 账户 | ✅ 登录/OAuth | ❌ 仅"功能待开发"占位 |
| Plugin / 插件 | ✅ | ❌ 仅占位 |
| Printer / 打印机 | ✅ | ❌ 仅占位（`printer_request()` 为空） |
| About / 关于 | ✅ | 🔶 静态内容，无更新检查 |

#### P4 — 输入处理
| 功能点 | Flutter | Tauri |
|--------|---------|-------|
| 鼠标移动/点击 | ✅ | ✅ |
| 滚轮 | ✅ | ✅ |
| 键盘 (基础) | ✅ | 🔶 发送 `key.code` 字符串，未做全键盘映射 |
| 修饰键组合 (Shift/Ctrl/Alt) | ✅ `InputModel` 精确处理 | ❌ 未包含修饰键状态 |
| 相对鼠标模式 | ✅ `relativeMouseMode` | ❌ |
| 边缘滚动 | ✅ | ❌ |
| 触摸板手势 | ✅ | ❌ |
| 拖拽上传文件 | ✅ | ❌ |
| 剪贴板同步 | ✅ | 🔶 前端双向同步已完成，`send_clipboard_text`命令已注册，仅差后端`clipboard()`方法emit事件

#### P5 — 本地面板（LocalPanel）
| 功能点 | Flutter | Tauri |
|--------|---------|-------|
| ID 显示 | ✅ | ✅ |
| 临时密码 | ✅ | ✅ |
| 固定密码设置 | ✅ 对话框 | ❌ 仅菜单项，无实现 |
| 二步验证 | ✅ | ❌ 链接占位 |
| 账户登录状态 | ✅ | ❌ 硬编码"未登录" |
| 被控端设置 快速入口 | ✅ | ❌ |
| 服务器状态轮询 | ✅ | ❌ `fetchServerState` 被注释（防止堆栈溢出） |

---

### 🟢 已实现（基本对齐）

#### I1 — 视频流接收与解码
- **Tauri**：实现了 WebCodecs H.264/VP9/VP8/AV1 硬件/软件解码 (SessionWindow.tsx)
- **Flutter**：使用 TextureRender / ImagePaint
- **状态**：✅ 核心功能可用，但 Tauri 版 VP9 VP8 被强制关闭

#### I2 — 多显示器切换
- **Tauri**：`switch_display` 命令 + `displays-updated` / `current-display-changed` 事件链 ✅

#### I3 — 密码认证流
- **Tauri**：`AuthorizeWindow.tsx` + `submit_password` 命令 ✅

#### I4 — 来电授权窗口
- **Tauri**：`AuthorizeWindow.tsx`，含权限复选框 ✅

#### I5 — 设置读写框架
- **Tauri**：`get_option` / `set_option` / `get_settings_batch` 命令 ✅

---

## 三、后端命令实现差距

### 已注册命令清单（`lib.rs`）及状态

| 命令 | 状态 | 备注 |
|------|------|------|
| `get_id` | ✅ | |
| `get_server_state` | ✅ | |
| `get/refresh_temporary_password` | ✅ | |
| `is_permanent_password_set` | ✅ | |
| `set_permanent_password` | ✅ | |
| `get/add/remove_favorite_peer` | ✅ | |
| `remove_peer` | ✅ | |
| `get/set_option` | ✅ | |
| `get/set_local_option` | ✅ | |
| `get_settings_batch` | ✅ | |
| `is_installed` | ✅ | |
| `connect_to_peer` | ✅ | |
| `submit_password` | ✅ | |
| `listen/unlisten_video_stream` | ✅ | |
| `send_mouse_event` | ✅ | |
| `send_mouse_move` | ✅ | |
| `send_wheel` | ✅ | |
| `send_key_event` | ✅ | 支持修饰键（ctrl/shift/alt/meta）已实现，仅 seq 模式 |
| `switch_display` | ✅ | |
| `authorize_connection` | ✅ | |
| `reject_connection` | ✅ | |
| `send_ctrl_alt_del` | ✅ | |
| `set_remote_option` | ✅ | |
| **`send_clipboard_text`** | ✅ 已注册 | 已实现 |
| **`start_file_transfer`** | ❌ 未注册 | |
| **`start_terminal`** | ❌ 未注册 | |
| **`start_port_forward`** | ❌ 未注册 | |
| **`start_voice_call`** | ❌ 未注册 | |
| **`start_recording`** | ❌ 未注册 | |
| **`set_privacy_mode`** | ✅ 框架已有，set_remote_option可复用 | |

---

## 四、关键技术差距

### T1 — 键盘映射不完整
Tauri 当前实现（`send_key_event`）仅使用 `key_event.set_seq(key)` 将 JS `KeyboardEvent.code`（如 `"KeyA"`, `"ShiftLeft"`）直接发送，缺少：
- Scancode 模式（Linux/Windows 精确键位映射）
- 输入法支持
- ✅ **已完成**: 修饰键组合状态（Ctrl+C 等）已实现

### T2 — 剪贴板通道未建立
`session_handler.rs` 的 `clipboard()` 方法为空，缺少 `emit("remote-clipboard", content)`。**前端双向同步已完成，仅差这一行代码**。

### T3 — 服务器状态轮询被禁用
✅ **已修复**: `get_server_state` 使用 `spawn_blocking` 解决了堆栈溢出问题，`App.tsx` 已启用 8 秒轮询，ID/密码/状态自动刷新。

### T4 — 文件传输基础架构缺失
`session_handler.rs` 中 `job_error/job_done/clear_all_jobs/new_message/update_transfer_list/load_last_job/update_folder_files/confirm_delete_files/override_file_confirm/job_progress` 全部为空实现。

### T5 — 国际化（i18n）框架已建立
✅ **已完成基础框架**: `i18next` 已配置，支持中/英文双语，核心页面已使用 `t()` 翻译。剩余页面还在逐步替换硬编码中。

---

## 五、总体完成度评估

| 模块 | 完成度 |
|------|--------|
| 主页 / 连接界面 | 70% |
| 视频接收解码 | 90% (VP8/VP9/H264/AV1 WebCodecs 支持) |
| 鼠标输入 | 90% |
| 键盘输入 | 70% (+修饰键已完成) |
| 远程工具栏 | 55% |
| 设置页面 | 55% |
| 国际化(i18n) | 60% (框架完成，核心页面已翻译) |
| 文件传输 | 2% (UI 占位) |
| 终端访问 | 2% (UI 占位) |
| 光标同步 | 100% (完整实现) |
| 剪贴板同步 | 95% (只差后端 emit) |
| 语音通话 | 0% |
| 录制功能 | 0% |
| 摄像头查看 | 0% |
| 端口转发 | 0% |
| 隐私模式 | 80% (框架已通) |
| 质量监控 | 100% (已实现) |
| **整体** | **~50%** |

---

> 报告结束 — 详细重构实施计划见 `refactor_plan_2026_04_11.md`
