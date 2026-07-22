FROM python:3.12-alpine

RUN apk add --no-cache curl

RUN mkdir -p /app

EXPOSE 5173

COPY . /app
WORKDIR /app

CMD ["python", "-m", "http.server", "5173", "--bind", "0.0.0.0"]
