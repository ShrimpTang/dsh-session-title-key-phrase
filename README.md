# dsh-session-title-key-phrase

把每个 DSH 会话默认命名为：该会话**第一条真人提问**提炼出的关键句。

## 行为

- 通过向 `ctx.sessionTitle` **注册一个 provider**（`automatic: 'first-prompt'`）实现：由会话标题服务自身驱动，在**第一条真人提问**到达时调用并写入标题（`provider` 来源）——这是官方 `first-prompt-llm` 使用的同一扩展点，无需自行监听 `session/event`，因此一定会被调用。
- 关键句提炼：去代码块/引用/斜杠命令/markdown 符号 → 取第一句 → 反复剥掉
  开头客套词（帮我/请/你看下/我想/能不能…，见 `lib/index.js` 的
  `LEAD_FILLERS`）→ 截断到 60 UTF-8 字节并加省略号。
- 只对新会话生效，已有会话不追溯改名。

> **注意**：profile 内置的 `@deepseek-ai/dsh-session-title-first-prompt-llm`
> 会占用**唯一**的 provider 槽位，所以需在 profile 的
> `cordis.patch.yml` 里禁用 `session-title-llm`（见下），并重启 `dsh web`
> （bundle 层只在启动时加载，用户 patch 层才会热更）。

## 安装

```bash
dsh plugin --profile web add github:ShrimpTang/dsh-session-title-key-phrase
```

也可以从本地路径安装（开发模式，`link:` 链接）：

```bash
dsh plugin --profile web add /Users/shrimp/WebstormProjects/dsh-session-title-key-phrase
```

安装后：把 `dsh-session-title-key-phrase` 加入
`~/.dsh/profiles/web/package.json` 的 `dsh.profile.bundles` 列表（如安装命令
未自动加入），**并在 `~/.dsh/profiles/web/cordis.patch.yml` 里禁用占位的
LLM 标题 provider**，最后**重启 DSH**：

```yaml
# ~/.dsh/profiles/web/cordis.patch.yml
- id: session-title-llm
  disabled: true
```

## 卸载

```bash
dsh plugin --profile web remove dsh-session-title-key-phrase
```

## 结构

```
dsh-session-title-key-phrase/
├── cordis.patch.yml   # Loader 行：向 profile 组合插入本插件
├── package.json       # dsh.bundle.patch 声明
└── lib/
    └── index.js       # Host 半区：注册 sessionTitle provider，用首条提问提炼关键句
```

## License

MIT
