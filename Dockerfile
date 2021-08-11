FROM node:14.17.0

# Install dependencies
WORKDIR /opt/app
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

CMD npm start
