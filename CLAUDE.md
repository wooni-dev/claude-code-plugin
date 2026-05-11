# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 목적

`https://claude.com/plugins` 페이지를 크롤링하여 Claude Code 플러그인 정보를 수집하고 JSON 파일로 저장한다.

## 목표

- 대상 URL: `https://claude.com/plugins`
- 각 플러그인의 이름, 설명, 메타데이터 등 항목 추출
- 결과물: 이 디렉토리에 구조화된 JSON 파일로 저장

## 참고 사항

- 프로젝트 디렉토리는 빈 상태로 시작하며, 작업 진행에 따라 스크립트와 출력 파일이 추가된다.
- 빌드 단계 없이 바로 실행 가능한 단일 스크립트(Python 또는 Node.js)를 선호한다.
- 출력 JSON은 사람이 읽기 쉽도록 들여쓰기 2칸으로 pretty-print한다.
- `package.json` 생성 시 `"type": "module"`로 설정한다.
