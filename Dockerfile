FROM node:10
RUN apt-get update
RUN apt-get install -y --no-install-recommends \
    build-essential \
    g++ \
    libboost-all-dev
WORKDIR /
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "index.js"]