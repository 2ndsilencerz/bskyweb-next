FROM docker.io/node:lts
ADD package.json /app
WORKDIR /app
RUN npm install --verbose
ADD . /app
RUN npm run build --verbose
ENTRYPOINT exec npm start