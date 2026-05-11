# Claude Code Plugin Crawler

`claude.com/plugins`를 크롤링해 Claude Code 플러그인 정보를 수집하고 JSON으로 저장하는 스크립트입니다.

## 수집 데이터

현재 **185개** 플러그인 정보가 [`plugins.json`](./plugins.json)에 저장되어 있습니다.

각 플러그인 항목의 필드:

| 필드 | 설명 |
|------|------|
| `name` | 플러그인 이름 |
| `slug` | URL 슬러그 |
| `url` | 상세 페이지 URL |
| `summary` | 한 줄 요약 |
| `description` | 상세 설명 전문 |
| `madeBy` | 제작자 |
| `installIn` | 설치 환경 (예: Claude Code, Claude Cowork) |
| `installCount` | 설치 수 |
| `isAnthropicVerified` | Anthropic 공식 인증 여부 |
| `worksWith` | 호환 환경 목록 |

## 사용법

### 의존성 설치

```bash
npm install
```

### 크롤링 실행

```bash
node crawl.js
# 또는
npm run crawl
```

기존 `plugins.json`이 있으면 **신규 플러그인만** 상세 페이지까지 크롤링하고 병합합니다.  
처음 실행하거나 파일이 없으면 전체 플러그인을 처음부터 수집합니다.

## 동작 방식

1. **목록 페이지 수집** — 전체 페이지를 순회하며 플러그인 목록을 파싱합니다.  
   `worksWith`에 `Claude Code`가 포함된 항목만 추출합니다.
2. **상세 페이지 수집** — 신규 플러그인의 상세 페이지를 크롤링해 `description`, `madeBy`, `installIn` 등 추가 정보를 수집합니다.  
   요청 간 300ms 딜레이를 둬 서버 부하를 줄입니다.
3. **결과 저장** — 기존 데이터와 병합 후 `plugins.json`으로 저장합니다.

## 요구사항

- Node.js 18 이상 (내장 `fetch` 사용)
- [cheerio](https://github.com/cheeriojs/cheerio) ^1.0.0
