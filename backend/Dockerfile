# Debian (glibc) image: better-sqlite3 downloads a ready-made binary, no compiler needed.
FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY scripts ./scripts
ENV NODE_ENV=production
EXPOSE 4000
VOLUME ["/app/data"]
CMD ["node", "src/server.js"]
