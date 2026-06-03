FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install

COPY src ./src

EXPOSE 3001

# Use tsx — already in your devDependencies
CMD ["npx", "tsx", "src/index.ts"]