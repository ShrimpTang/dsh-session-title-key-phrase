# dsh-session-title-key-phrase

把每个 DSH 会话默认命名为：该会话**第一条真人提问**提炼出的关键句。

## 行为

- 监听每个会话的第一条真人 `user/message`，提炼关键句后通过
  `ctx.sessionTitle.rename()` 写入（`user` 来源，固定标题，取代内置 LLM
  自动命名；之后手动改名仍然生效且被尊重）。
- 关键句提炼：去代码块/引用/斜杠命令/markdown 符号 → 取第一句 → 反复剥掉
  开头客套词（帮我/请/你看下/我想/能不能…，见 `LEAD_FILLERS`）→ 截断到
  60 UTF-8 字节并加省略号。
- 只对新会话生效，已有会话不追溯改名。

## 安装与挂载

推荐直接从 Git 仓库安装到 DSH 的插件目录（`name` 指向安装后的 `lib/index.js`）：

```bash
# 安装（任选一处持久目录，例如 DSH 插件目录）
git clone https://github.com/ShrimpTang/dsh-session-title-key-phrase.git \
  ~/.dsh/plugins/dsh-session-title-key-phrase
```

在 `~/.dsh/cordis.patch.yml` 追加：

```yaml
- insert:
    - id: session-title-key-phrase
      name: '/Users/shrimp/.dsh/plugins/dsh-session-title-key-phrase/lib/index.js'
```

然后重启 DSH 进程生效。更新插件：

```bash
cd ~/.dsh/plugins/dsh-session-title-key-phrase && git pull
```

然后重启 DSH 进程生效。注意：DSH 内置的 `session-title-llm`
（`@deepseek-ai/dsh-session-title-first-prompt-llm`）也注册了标题 provider；
本插件走 `rename()` 通道，与它共存并在首条提问时覆盖其结果。若想彻底禁用
内置 LLM 命名，可在同一 patch 文件再加一行覆盖该行为 disabled：

```yaml
    - id: session-title-llm
      disabled: true
```

## 与动态插件版的关系

本包是会话中动态插件 `keyphr-1` 的持久化版本，逻辑一致；两者同时启用时
后注册者胜出（都通过 rename，结果相同，无冲突）。
