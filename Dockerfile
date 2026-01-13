# --- 1단계: 빌드 스테이지 ---
FROM node:24-alpine AS build-stage

# 작업 디렉토리 생성
WORKDIR /app

# 루트 package.json 및 lock 파일 복사
COPY package*.json ./
COPY pnpm-workspace.yaml ./

# 프런트엔드 패키지 파일 복사 (캐시 효율)
COPY packages/client/package*.json ./packages/client/
COPY packages/common/package.json ./packages/common/
COPY packages/server/package*.json ./packages/server/

# 의존성 설치
# Enable Corepack to get pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate
# Install dependencies for all workspace packages
RUN pnpm -r install --ignore-scripts

# 공통 패키지 소스 복사 및 빌드
COPY packages/common/src ./packages/common/src
COPY packages/common/tsconfig.json ./packages/common/
RUN pnpm --filter ./packages/common build

# 클라이언트 소스 복사
COPY packages/client/ ./packages/client/

# 클라이언트 의존성 재설치 (로컬 node_modules 생성 및 바이너리 링크 보장)
RUN pnpm --filter ./packages/client install --ignore-scripts

# 클라이언트 빌드 (Phaser와 React 코드를 정적 파일로 변환)
RUN pnpm --filter ./packages/client build

# --- 2단계: 실행 스테이지 (Nginx) ---
FROM nginx:stable-alpine AS production-stage

# 빌드 스테이지에서 생성된 파일들을 Nginx의 기본 웹 루트로 복사
COPY --from=build-stage /app/packages/client/dist /usr/share/nginx/html

# Nginx 80포트 노출
EXPOSE 80

# Nginx 서버 실행
CMD ["nginx", "-g", "daemon off;"]
