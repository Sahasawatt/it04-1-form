FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first (better layer caching). package.json's postinstall runs
# `prisma generate`, so the prisma schema must be present before `npm install`.
COPY package.json ./
COPY prisma ./prisma

RUN npm install

COPY . .

# `next build` needs devDependencies (typescript, prisma CLI, @types/*), so
# NODE_ENV must NOT be set to production at build time.
RUN npm run build

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
