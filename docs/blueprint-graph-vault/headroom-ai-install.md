# headroom-ai-install

> entityType: tool-install
>
> *External linked node (other context).*

## Observations

- headroom-ai v0.36.5 installed globally as a uv tool with Python 3.12 (headroom-ai[all] extra)
- Executable: C:\Users\S Roe\.local\bin\headroom.exe, on PATH
- Why Python 3.12: uv tool install --python 3.13 failed because the [all] extra pins torch/onnxruntime versions with no cp313 wheels for win platform
- Verified with: headroom --version (0.36.5) and headroom doctor (CLI functional; proxy/agent routing not yet configured)
- Proxy now RUNNING on http://127.0.0.1:8787 (detached process PID 18440, started 2026-08-30; /health returns healthy; logs at %TEMP%\headroom-proxy-8787.log)
- Cold start is slow (~2-3 min): banner prints before the socket binds; confirm with netstat or headroom doctor -p 8787
- To engage Cline: Cline settings > API Provider > Anthropic Base URL http://127.0.0.1:8787, OpenAI Compatible Base URL http://127.0.0.1:8787/v1
- headroom doctor: proxy PASS; remaining warnings are client routing only (claude/codex/shell env unset)
- 0.37.0 update available: run headroom update

## Relations

**Outgoing**

- `supports` → [[The Blueprint - AI assist layer]]

**Incoming**

- none