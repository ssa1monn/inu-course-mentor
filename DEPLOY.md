# 배포 가이드 — DigitalOcean (GitHub Student Pack 무료 크레딧)

INU Course Mentor를 DigitalOcean VM(Droplet)에 `docker-compose`로 배포한다.
완료하면 `http://<서버공인IP>` 가 과제 제출용 URL이 된다.

> DigitalOcean은 Droplet에 **기본 방화벽이 없어서 80포트가 바로 열려 있다.** (오라클 같은 이중 방화벽 설정 불필요)

---

## 0. 사전 준비 (로컬에서)

**GitHub에 최신 코드 push** (서버가 GitHub에서 코드를 받아온다)
- repo: `https://github.com/ssa1monn/inu-course-mentor`
- **`docker-compose.yml` 이 repo 루트에 오도록** push할 것 (= `inu-course-mentor` 폴더 *안*에서 git init)
- `.env` 는 `.gitignore` 처리되어 push되지 않음 → 서버에서 새로 만든다 (STEP 5)

```bash
cd inu-course-mentor
git init && git add . && git commit -m "deploy"
git branch -M main
git remote add origin https://github.com/ssa1monn/inu-course-mentor.git
git push -u origin main
```

---

## STEP 1. Student Pack으로 DigitalOcean 크레딧 받기

1. [education.github.com/pack](https://education.github.com/pack) 접속 (학생 인증 완료 상태)
2. 목록에서 **DigitalOcean** 찾기 → **"$200 in credit over 1 year"** → **Get access** 클릭
3. 연결된 링크로 DigitalOcean 가입 (신규 계정). 크레딧이 자동 적용됨
   - 본인확인용 카드 등록을 요구할 수 있으나, 사용액은 $200 크레딧에서 차감됨

---

## STEP 2. Droplet(서버) 생성

1. DigitalOcean 콘솔 → **Create → Droplets**
2. 설정:
   - **Region**: **Singapore** (한국에서 가장 가까움)
   - **Image**: **Ubuntu 22.04 (LTS) x64**
   - **Size**: Basic → Regular → **$12/mo (2GB RAM / 1 CPU)** 권장
     - ($200 크레딧이라 부담 없음. 2GB면 빌드도 여유. $6/1GB도 가능 — 스왑은 스크립트가 자동 추가)
   - **Authentication**: **Password** 선택이 가장 쉬움 → root 비밀번호 설정 (또는 SSH Key)
3. **Create Droplet** → 생성된 Droplet의 **IP address** 메모

---

## STEP 3. SSH 접속

DigitalOcean 기본 계정은 **root** 다:
```bash
ssh root@<서버IP>
```
(Password 방식이면 설정한 비밀번호 입력. Windows는 PowerShell에서 동일)

---

## STEP 4. 서버 세팅 (Docker + 스왑)

```bash
apt-get update -y && apt-get install -y git
git clone https://github.com/ssa1monn/inu-course-mentor.git
cd inu-course-mentor
bash deploy/setup-server.sh
```
스크립트가 Docker 설치 + (1GB면) 스왑 2GB 추가를 자동으로 한다.

---

## STEP 5. 환경변수(.env) 작성

```bash
cp .env.example .env
nano .env
```
아래 값을 채운다 (**POSTGRES_PASSWORD 와 DATABASE_URL 의 비밀번호를 똑같이** 맞출 것):
```
POSTGRES_USER=inucm
POSTGRES_PASSWORD=<강한_비밀번호>
POSTGRES_DB=inucm
DATABASE_URL=postgresql://inucm:<위와_같은_비밀번호>@db:5432/inucm?schema=public

JWT_SECRET=<openssl rand -hex 32 로 생성한 값>
JWT_EXPIRES_IN=7d

GEMINI_API_KEY=<네 Gemini 키>
GEMINI_MODEL=gemini-3.5-flash
NCS_API_KEY=

PORT=4000
NODE_ENV=production
```
JWT_SECRET 생성: `openssl rand -hex 32`
저장: `Ctrl+O`, `Enter`, `Ctrl+X`

---

## STEP 6. 실행 & 접속 확인

```bash
docker compose up -d --build      # 첫 빌드 몇 분 소요
docker compose ps                 # 4개 컨테이너 Up / db healthy
curl http://localhost/api/health  # {"status":"ok",...}
```
브라우저에서 **`http://<서버IP>`** 접속 → 이 주소가 **과제 제출 URL**.
관리자: `admin` / `admininucm2026!`

---

## (선택) STEP 7. CI/CD 자동배포

`.github/workflows/deploy.yml` 이 이미 있다. GitHub repo **Settings → Secrets and variables → Actions** 에 등록:
- `DEPLOY_HOST` = 서버 IP
- `DEPLOY_USER` = `root`
- `DEPLOY_SSH_KEY` = (SSH Key 방식으로 만들었을 때) private key 전체 내용
- `DEPLOY_PATH` = `/root/inu-course-mentor`

이후 `main` 에 push하면 자동으로 `git pull + docker compose up -d --build` → **CI/CD 조건 충족.**
(Password 방식으로 만들었으면 CI/CD는 생략하고 수동 배포만 해도 과제엔 충분 — deploy.yml 파일 존재 자체로 구성은 보여줌)

---

## 업데이트 / 트러블슈팅

**코드 갱신 후 재배포**:
```bash
cd ~/inu-course-mentor && git pull && docker compose up -d --build
```
**로그**: `docker compose logs -f backend`
**빌드 멈춤(1GB)**: `free -h` 로 스왑 확인, 없으면 `bash deploy/setup-server.sh` 재실행
**완전 초기화**: `docker compose down -v` 후 다시 `up -d --build`
**(선택) DO 방화벽을 켰다면**: Networking → Firewalls 에서 Inbound TCP 80 허용
