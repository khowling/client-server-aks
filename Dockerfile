FROM node:10

# Create app directory
WORKDIR /usr/src/app

# Bundle app source
COPY . .

EXPOSE 1337/tcp 8080/tcp

CMD [ "node", "index.js" ]