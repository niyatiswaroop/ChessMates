FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
# Includes dev dependencies (nodemon) for docker-compose's dev mode
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["node", "server/index.js"]
