FROM node:10-alpine as builder
COPY package*.json ./
RUN npm ci --production


FROM node:12-alpine
#Create the application directory
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app

COPY --from=builder node_modules node_modules
COPY --chown=node:node . .

RUN apk add --no-cache tini
# Tini is now available at /sbin/tini
ENTRYPOINT ["/sbin/tini", "--"]
USER node


CMD ["node", "server.js"]
EXPOSE 3000