---
name: update-plugins
description: claude.com/plugins에서 Claude Code 플러그인 목록을 크롤링해 plugins.json을 업데이트합니다. 사용자가 "플러그인 업데이트", "/update-plugins", "플러그인 크롤링", "플러그인 최신화" 등의 표현을 사용할 때 이 스킬을 사용하세요.
---

# update-plugins

`claude.com/plugins`를 크롤링해 Claude Code 플러그인 정보를 수집하고 `plugins.json`을 업데이트하는 스킬입니다.
기존에 수집된 플러그인은 스킵하고 신규 플러그인만 상세 페이지까지 크롤링합니다.

## 실행 순서

### 1단계: 크롤러 실행

아래 명령어를 실행합니다.

```bash
cd "D:\ai\claude-code-plugin" && node crawl.js
```

### 2단계: 결과 확인

`plugins.json`을 읽어 업데이트 결과를 요약합니다.

```bash
node -e "import { readFileSync } from 'fs'; const d = JSON.parse(readFileSync('D:/ai/claude-code-plugin/plugins.json','utf-8')); console.log(JSON.stringify({ total: d.total, crawledAt: d.crawledAt }, null, 2));"
```

### 3단계: 결과 보고

아래 형식으로 결과를 사용자에게 알려줍니다.

- 신규로 추가된 플러그인 수
- 현재 총 플러그인 수
- 크롤링 시각
- 신규 플러그인이 있으면 이름 목록도 함께 출력

## 예외 처리

- **네트워크 오류**: 오류 메시지를 그대로 보여주고 재시도 여부를 사용자에게 물어봄
- **plugins.json 없음**: 전체 크롤링(185개 전부)으로 처음부터 수집한다고 안내 후 실행
