FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
# Git on Windows often checks this script out with CRLF. Alpine then fails with
# "exec docker-entrypoint.sh: no such file or directory" because the shebang
# becomes /bin/sh\r. Strip CRs and invoke via /bin/sh so the image always boots.
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
  && chmod +x /usr/local/bin/docker-entrypoint.sh

COPY . .

EXPOSE 3000

ENTRYPOINT ["/bin/sh", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]
