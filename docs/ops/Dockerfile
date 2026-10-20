# Template for deployment topology B (paid API with a durable commerce database). NOT built or run in this
# work; review before use. See docs/runbooks/operations.md.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
# Purchases, entitlements and replay claims: mount a persistent volume here.
ENV LAMBLE_COMMERCE_DB_PATH=/var/lib/lamble/commerce.sqlite
COPY --from=build /app /app
RUN mkdir -p /var/lib/lamble && chown node:node /var/lib/lamble
USER node
EXPOSE 3000
CMD ["npm", "start"]
