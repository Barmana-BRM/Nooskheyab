FROM node:22-alpine AS build
WORKDIR /workspace
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages packages
RUN npm ci --ignore-scripts=false
COPY apps/api apps/api
RUN npm run build:shared && npm run build:api

FROM node:22-alpine AS runtime
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=build /workspace/package*.json ./
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/api/package.json apps/api/package.json
COPY --from=build /workspace/apps/api/dist apps/api/dist
COPY --from=build /workspace/apps/api/prisma apps/api/prisma
COPY --from=build /workspace/packages packages
USER node
EXPOSE 4000
CMD ["npm", "run", "start", "--workspace", "apps/api"]
