FROM node:22-alpine AS build
WORKDIR /workspace
COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages packages
RUN npm ci --ignore-scripts
COPY apps/web apps/web
RUN npm run build:shared && npm run build:web

FROM nginx:1.27-alpine
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
COPY docker/nginx/web.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
