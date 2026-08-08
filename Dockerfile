# Ontos Planetarium — multi-stage production image
FROM node:22-bookworm AS frontend-build
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ONTOS_ENV=production \
    ONTOS_DEMO_MODE=true \
    ONTOS_DATABASE_URL=sqlite+aiosqlite:///./data/ontos.db

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      libsasl2-dev libldap2-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend ./backend
COPY --from=frontend-build /web/dist ./frontend/dist

RUN mkdir -p /app/data \
 && useradd --create-home --shell /usr/sbin/nologin ontos \
 && chown -R ontos:ontos /app
USER ontos

EXPOSE 8080
WORKDIR /app/backend
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
