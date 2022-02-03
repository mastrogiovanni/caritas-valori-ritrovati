FROM node:15.14.0-alpine3.10

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY index.js ./

CMD [ "node", "index.js" ]