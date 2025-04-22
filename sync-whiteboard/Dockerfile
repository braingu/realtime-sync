FROM node:23-slim
WORKDIR /app

RUN npm install @Braingu/sync-whiteboard

EXPOSE 5858

CMD ["node", "-e", "require('@Braingu/sync-whiteboard').start()"]
