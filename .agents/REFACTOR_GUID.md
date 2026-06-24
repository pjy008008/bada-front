# Vue Project Refactoring Rules

## 목표

현재 App.vue와 style.css에 집중된 코드를 유지보수 가능한 구조로 분리한다.

## 디렉토리 구조

src/
├── components/
├── views/
├── composables/
├── services/
├── stores/
├── assets/
└── styles/

## 규칙

### Components

- 재사용 가능한 UI는 components로 분리
- 한 컴포넌트는 300줄 이하 유지

### Views

- 페이지 단위 컴포넌트만 위치

### Composables

- 비즈니스 로직 분리
- API 호출 로직 제외

### Services

- API 호출만 담당

### Styles

- 공통 스타일은 styles 폴더
- 컴포넌트 스타일은 scoped 사용

## 리팩토링 원칙

1. 기능 변경 금지
2. UI 변경 금지
3. 타입 유지
4. 모든 동작 유지
5. 한 번에 모든 파일 수정하지 말고 단계별 커밋 생성

## 출력 형식

각 단계마다:

1. 현재 문제점
2. 분리할 파일 목록
3. 생성할 파일 트리
4. 변경 코드
5. 검증 방법
