FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build — compile TypeScript
RUN npx tsc -p tsconfig.json

# Verify build output exists
RUN ls -la dist/main.js

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
