FROM node:22-alpine AS build
WORKDIR /workspace
COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages packages
RUN npm ci --ignore-scripts
COPY apps/web apps/web
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_ALLOWED_EXTERNAL_HOSTS=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_ALLOWED_EXTERNAL_HOSTS=$VITE_ALLOWED_EXTERNAL_HOSTS
RUN npm run build:shared && npm run build:web

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
COPY docker/nginx/web.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
