# dsh-session-title-key-phrase

把每个 DSH 会话默认命名为：该会话**第一条真人提问**提炼出的关键句。

## 行为

- 监听每个会话的第一条真人 `user/message`，提炼关键句后通过
  `ctx.sessionTitle.rename()` 写入（`user` 来源，固定标题，取代内置 LLM
  自动命名；之后手动改名仍然生效且被尊重）。
- 关键句提炼：去代码块/引用/斜杠命令/markdown 符号 → 取第一句 → 反复剥掉
  开头客套词（帮我/请/你看下/我想/能不能…，见 `lib/index.js` 的
  `LEAD_FILLERS`）→ 截断到 60 UTF-8 字节并加省略号。
- 只对新会话生效，已有会话不追溯改名。

## 安装

```bash
dsh plugin --profile web add github:ShrimpTang/dsh-session-title-key-phrase
```

也可以从本地路径安装（开发模式，`link:` 链接）：

```bash
dsh plugin --profile web add /Users/shrimp/WebstormProjects/dsh-session-title-key-phrase
```

安装后把 `dsh-session-title-key-phrase` 加入 `~/.dsh/profiles/web/package.json`
的 `dsh.profile.bundles` 列表（如安装命令未自动加入），重启 DSH 即生效。

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
    └── index.js       # Host 半区：监听首条提问并重命名会话
```

## License

MIT
