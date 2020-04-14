FROM node:10
RUN apt-get update
RUN apt-get install -y --no-install-recommends \
    ca-certificates \
    build-essential \
    g++ \
    libboost-all-dev \
    libc6-dev \
    wget
RUN wget https://static.rust-lang.org/rustup/dist/x86_64-unknown-linux-gnu/rustup-init; \
    chmod +x rustup-init; \
    ./rustup-init -y --default-toolchain stable; \
    rm rustup-init; \
    ln -s $HOME/.cargo/bin/rustc /usr/local/bin/rustc; \
    mkdir -p /playground;
WORKDIR /
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "index.js"]