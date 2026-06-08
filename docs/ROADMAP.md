# ROADMAP — INU Course Mentor (INUCM)

> 실행 계획 · 일정 · 작업 분해
> 참고: [PRD.md](./PRD.md) · [SPEC.md](./SPEC.md)
> 기준일 2026-06-07 / **마감 2026-06-09 23:59:59** (실질 약 2.5일)

---

## 0. 전략 요약

- **MVP(P0) 먼저 끝내고** 그 위에 P1 → P2를 쌓는다. 언제 멈춰도 "동작하는 제출물"이 남게.
- 필수 평가요건(Docker·Nginx·CI/CD·Web Storage·DBMS·배포 URL·영상)은 **MVP 단계에서
  뼈대를 미리 깔아둔다**. 마지막에 몰아서 하지 않는다.
- 배포는 로컬 docker-compose가 뜨는 순간 한 번 해보고, 이후 기능 추가마다 갱신.
- 막히면 해당 기능을 P2로 내리고 다음으로 넘어간다. (특히 외부 진로 API)

### 우선순위 컷 라인
```
반드시(P0):  인프라 뼈대 + 회원/로그인 + 엑셀 업로드/파싱 + 강의 검색 + 배포 + 영상
중요(P1):    가상 시간표/충돌 + 졸업요건 계산 + AI 조언
여유(P2):    이력 저장 관리 UI + 외부 진로 API(NCS/커리어넷) + 디자인 고도화
```

---

## 1. 마일스톤

| # | 마일스톤 | 정의(Done) |
|---|---|---|
| M0 | **Walking skeleton** | docker-compose up → Nginx 통해 React가 뜨고 `/api/health` 200 |
| M1 | **인증 + DB** | 회원가입·로그인(JWT) 동작, PostgreSQL 연결, Prisma 마이그레이션 |
| M2 | **엑셀 → 강의 검색** | 엑셀 업로드→파싱→적재, 강의 목록/검색/필터 화면 |
| M3 | **첫 배포 + CI** | 공개 URL 접속 가능, GitHub Actions 빌드 통과 |
| M4 | **시간표 + 졸업요건** | 가상시간표(충돌감지, IndexedDB 저장) + 졸업요건 충족률 |
| M5 | **AI 조언** | `/api/recommend`로 Gemini 자연어 조언 생성·표시·저장 |
| M6 | **마감 패키지** | 최종 배포 갱신 + 7분 영상 + README + 제출 |

---

## 2. 일자별 계획

### Day 1 — 6/7 (오늘, 남은 시간) : 뼈대 + 인증 + 엑셀
목표: **M0 → M1 → M2 진입**
- [ ] 프로젝트 폴더/모노레포 구조 생성 (frontend, backend, proxy, docker-compose, .env.example, .gitignore)
- [ ] backend: Express 부트스트랩, `/api/health`, helmet/cors, Prisma + PostgreSQL 연결
- [ ] frontend: Vite + React + Tailwind + react-router + axios + zustand 초기화
- [ ] proxy: nginx.conf(정적 + `/api` 프록시), Dockerfile들, docker-compose 작성 → **M0 로컬 확인**
- [ ] DB 스키마(schema.prisma) 작성 + 첫 migration
- [ ] 회원가입/로그인 API(JWT, bcrypt) + 프론트 로그인/회원가입 페이지 + 프로필 입력 → **M1**
- [ ] 엑셀 파서 서비스(`excelParser.js`) 구현 — SPEC 4장 알고리즘(다중요일/null 처리) + 단위 검증
- [ ] `/api/courses/upload` (multer) + 업로드 UI

### Day 2 — 6/8 : 강의검색 + 배포/CI + 시간표 + 졸업요건
목표: **M2 완료 → M3 → M4**
- [ ] `/api/courses` 검색·필터(학과/이수구분/요일/시간/키워드/페이지) + 강의 목록 UI(CourseCard) → **M2**
- [ ] **첫 배포**: 배포 타깃에 docker-compose 올리고 공개 URL 확보 + GitHub Actions `ci.yml` → **M3**
- [ ] 가상 시간표: 담기/빼기, TimetableGrid, **시간 충돌 감지**, **IndexedDB 저장**(inuDB 패턴)
- [ ] 수강 이력(Enrollment) 입력/조회
- [ ] 졸업요건: `GradReqRule` 시드(컴공 데모) + `/api/graduation` 계산 + 충족률 시각화 → **M4**

### Day 3 — 6/9 (마감일) : AI + 마무리 + 영상 + 제출
목표: **M5 → M6**, 늦어도 **저녁까지 코드 동결**
- [ ] `/api/recommend`: 컨텍스트 조립 + Gemini 호출 + 폴백 + `Recommendation` 캐시
- [ ] AI 조언 페이지(마크다운 렌더) + 저장된 조언 조회 → **M5**
- [ ] (여유 P2) 외부 진로 API, 이력 관리 UI, 디자인 다듬기
- [ ] **최종 배포 갱신** + 전체 데모 시나리오 점검(가입→업로드→검색→요건→조언→시간표)
- [ ] README 정리(실행법, 스택, 기능, URL)
- [ ] **7분 영상 녹화**(서비스 소개 + 주요기능 시연) → 첨부
- [ ] 과제란에 **배포 URL** 작성 + 영상 제출 → **M6**

> 시간 압박 시 컷 순서: 외부 진로 API → 이력관리 UI → AI(폴백으로 대체) → 졸업요건 →
> 가상시간표. (엑셀/검색/인증/배포/영상은 사수.)

---

## 3. 작업 분해 (트랙별 체크리스트)

### 인프라 / DevOps
- [ ] docker-compose 4서비스(db/backend/frontend/proxy) + bridge network + db volume
- [ ] proxy Dockerfile + nginx.conf (upstream backend, SPA fallback)
- [ ] backend/frontend Dockerfile (multi-stage 빌드)
- [ ] .env.example / .gitignore(.env, node_modules, dist)
- [ ] GitHub Actions: ci.yml(빌드·lint), deploy.yml(배포)
- [ ] 배포 타깃 프로비저닝 + 공개 URL + (가능하면 HTTPS)

### Backend
- [ ] Express 앱 + 미들웨어(helmet, cors, json, error handler)
- [ ] Prisma client + schema + migration + seed(GradReqRule 데모)
- [ ] auth: register/login, JWT 발급·검증 미들웨어, bcrypt
- [ ] me: 프로필/선호 조회·수정
- [ ] excelParser 서비스(SheetJS) + courses/upload(multer) + 배치 upsert
- [ ] courses 검색·필터·페이지네이션, course 상세
- [ ] enrollments CRUD
- [ ] gradReq 서비스 + graduation 엔드포인트
- [ ] aiAdvisor 서비스(Gemini) + recommend + recommendations + 폴백

### Frontend
- [ ] Vite + Tailwind + router + axios 인스턴스(JWT 인터셉터) + zustand persist
- [ ] 페이지: Register, Login, Profile, Courses(검색/필터), Timetable, Graduation, Advice
- [ ] 컴포넌트: CourseCard, TimetableGrid, ConflictBadge, ReqChart, UploadButton
- [ ] IndexedDB 래퍼(idb.js) — 가상 시간표 store
- [ ] 로딩/에러 처리, 반응형 기본 레이아웃

### 데이터 / 검증
- [ ] 실제 종합시간표 엑셀로 파서 검증(다중요일·null·분반 케이스)
- [ ] 컴퓨터공학부 졸업요건 데모 규칙 정의

### 제출물
- [ ] 데모 계정/샘플 데이터 준비
- [ ] 7분 영상 시나리오 대본 → 녹화 → 편집
- [ ] README + 배포 URL

---

## 4. 결정 필요 항목 (사용자 확인)

진행 전/중에 확정하면 좋은 것들:

1. **배포 타깃**: 단일 VM(EC2/Oracle Free 등)+docker-compose 권장(요건 한 번에 충족).
   혹시 선호하는 호스팅이 있는지?
2. **AI 키**: `GEMINI_API_KEY` 발급 여부. 없으면 발급 안내 or 폴백만으로 시연.
3. **졸업요건 데이터**: 컴퓨터공학부 실제 요건 자료가 있으면 정확도↑. 없으면 데모 규칙 사용.
4. **외부 진로 API**: NCS 키 보유 여부(커리어넷은 미발급 가정). P2로 둘지 확정.

> git push 및 시크릿 등록·배포 실행은 **사용자가 직접** 수행. 코드/워크플로/문서는 Claude가 작성.

---

## 5. 진행 상태 로그
(작업하며 갱신)

- 2026-06-07: PRD/SPEC/ROADMAP 작성 완료. 엑셀 구조 분석 완료(20컬럼, 2,467행, 시간 포맷 규격 확정).
- 2026-06-07: **핵심 구현 1차 완료(M0~M5)** — 로컬 docker-compose 전체 스택 동작 확인.
  - 인프라: docker-compose 4컨테이너(db/backend/frontend/proxy), Nginx 단일 진입점, GitHub Actions(ci/deploy) 작성
  - 백엔드: Express + Prisma + PostgreSQL, JWT 인증, 엑셀 파서(실파일 2,467강의 검증), 강의 검색/필터,
    수강이력, 졸업요건 계산, AI 조언(Gemini + 폴백)
  - 프론트엔드: React+Vite+Tailwind(INU 화이트/블루/옐로), 로그인/가입/프로필/대시보드/강의검색/가상시간표/졸업요건/AI조언
  - Web Storage: localStorage(JWT/프로필) + IndexedDB(가상 시간표)
  - E2E 검증 완료: 가입→업로드(2,467)→검색(웹프로그래밍 시간 파싱 정상)→수강이력→졸업요건(15학점 집계)→AI 폴백 조언
  - 로컬 http://localhost 기동 확인 (health/SPA fallback/4컨테이너 정상)
- 남은 작업(P1~P2): 배포 타깃에 실제 배포(공개 URL), GEMINI_API_KEY 연결 후 AI 실응답 확인,
  (선택) 외부 진로 API, 디자인 다듬기, 7분 발표 영상.
