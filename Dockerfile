FROM rust:1.70-slim-buster
RUN apt-get update -y && apt-get install git -y
RUN git clone -b testnet3 \
    https://github.com/medici-collective/sdk.git \
    --depth 1
WORKDIR sdk
RUN pwd
RUN ["chmod", "+x", "build_ubuntu.sh"]
RUN ./build_ubuntu.sh
EXPOSE 3033/tcp
EXPOSE 4133/tcp
RUN pwd
RUN cargo install --path . --locked
# RUN cd rust/develop
RUN pwd
RUN cargo run --bin aleo-develop
CMD aleo-start