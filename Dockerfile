# Stage 1: Build the React application
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files and build the project
COPY . .
# You can append environment variables here if needed, like:
# RUN VITE_FLAVOR=prd npm run build
RUN npm run build 

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom routing config
COPY nginx.conf /etc/nginx/conf.d/

# Copy the build output from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html/a365ss

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
