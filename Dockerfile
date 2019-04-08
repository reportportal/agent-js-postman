FROM postman/newman:alpine

RUN npm install -g @reportportal/newman-reporter-reportportal
