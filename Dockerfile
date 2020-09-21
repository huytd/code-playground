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
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
RUN rustc --version
WORKDIR /
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "index.js"]