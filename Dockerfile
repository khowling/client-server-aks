FROM node:10

# Create app directory
WORKDIR /usr/src/app

# Bundle app source
COPY . .

EXPOSE 1337

CMD [ "node", "index.js" ]