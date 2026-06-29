# ── Slim production image ──────────────────────────────────────────────
# The React app is built LOCALLY via `npm run build` (deploy.ps1 step 1).
# This Dockerfile only copies the pre-built dist/ into an Nginx container.
# No Node.js or npm install needed on the server.
# ───────────────────────────────────────────────────────────────────────
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom routing config (handles SPA fallback to index.html)
COPY nginx.conf /etc/nginx/conf.d/

# Copy the pre-built static assets
COPY dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
