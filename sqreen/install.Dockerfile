ARG BASE_IMAGE=node_8_express_4
FROM $BASE_IMAGE

COPY . AgentNode
RUN npm pack ./AgentNode
RUN npm install -S sqreen-1*

CMD ["npm", "start"]
