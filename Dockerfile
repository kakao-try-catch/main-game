# --- 1단계: 빌드 스테이지 ---
FROM node:20-alpine AS build-stage

# 작업 디렉토리 생성
WORKDIR /app

# 프런트엔드 패키지 파일만 먼저 복사 (캐시 효율)
COPY client/package*.json ./
RUN npm install

# 나머지 프런트엔드 소스 복사 후 빌드
COPY client/ .
RUN npm run build

# --- 2단계: 실행 스테이지 (Nginx) ---
FROM nginx:stable-alpine AS production-stage

# 빌드 스테이지에서 생성된 파일들을 Nginx의 기본 웹 루트로 복사
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Nginx 80포트 노출
EXPOSE 80

# Nginx 서버 실행
CMD ["nginx", "-g", "daemon off;"]
