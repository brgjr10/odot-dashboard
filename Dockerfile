FROM python:3.12-alpine

RUN apk add --no-cache curl \
 && adduser -D -u 10001 odot

EXPOSE 5173

COPY . /app
WORKDIR /app

# run_server.py, not the stdlib one-liner: it is the only path that applies the
# no-cache headers, the security headers and the file allow-list.
USER odot

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5173/ || exit 1

CMD ["python", "run_server.py", "--port", "5173", "--host", "0.0.0.0", "--no-open"]