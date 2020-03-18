ARG node_version=8
ARG base_image=node
FROM $base_image:$node_version
RUN node -v

WORKDIR /usr/src/agent
COPY . .

RUN npm install
RUN ulimit -c unlimited

