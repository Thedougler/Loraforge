# Stage 1: Build the React application
FROM node:18-alpine AS build

WORKDIR /app/frontend

COPY package.json ./
COPY package-lock.json ./
RUN npm install

COPY . .

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the built React app from the build stage
COPY --from=build /app/frontend/dist /usr/share/nginx/html
# Copy example_data to the Nginx HTML directory
COPY ../example_data /usr/share/nginx/html/example_data

# Copy custom Nginx configuration (if any, otherwise use default)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for the web server
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]