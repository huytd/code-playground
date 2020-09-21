FROM node:10
RUN apt-get update; \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    build-essential \
    g++ \
    libboost-all-dev \
    libc6-dev \
    libcurl4-gnutls-dev; \
    mkdir -p /playground;
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
WORKDIR /
COPY package*.json ./
RUN npm install
COPY . .
ENV NODE_ENV=production
CMD ["node", "index.js"]