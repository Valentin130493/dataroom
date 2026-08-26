FROM node:22-alpine AS build

RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

RUN pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN pnpm --filter @dataroom/shared build \
  && pnpm --filter @dataroom/api exec prisma generate \
  && pnpm --filter @dataroom/api build

FROM node:22-alpine AS runtime

RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app /app

EXPOSE 4000
CMD ["sh", "-c", "pnpm --filter @dataroom/api db:deploy && node apps/api/dist/main.js"]
