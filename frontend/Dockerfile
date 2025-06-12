# Stage 1: Build the React application
FROM node:18-alpine AS build

WORKDIR /app/frontend

COPY package.json ./
COPY package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the built React app from the build stage
COPY --from=build /app/frontend/dist /usr/share/nginx/html

# Copy custom Nginx configuration (if any, otherwise use default)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for the web server
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]