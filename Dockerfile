FROM postman/newman:alpine

RUN npm install -g newman-reporter-reportportal
