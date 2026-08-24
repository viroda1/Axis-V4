FROM nginx:alpine

# Remove the default Nginx config so it doesn't conflict
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom config — named explicitly to avoid collisions
COPY nginx.conf /etc/nginx/conf.d/axis.conf

# Copy all site files into the Nginx web root
COPY . /usr/share/nginx/html

# Set ownership and permissions so Nginx (running as non-root user in alpine) can read everything
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chmod -R 755 /usr/share/nginx/html

# Expose HTTP
EXPOSE 80

# Let the orchestrator know the container is alive
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/index.html > /dev/null 2>&1 || exit 1

# Start Nginx in the foreground (required for Docker)
CMD ["nginx", "-g", "daemon off;"]
