
FROM node:22-slim
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --no-frozen-lockfile
COPY . .
RUN pnpm build
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.mjs"]
