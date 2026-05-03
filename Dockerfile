# Use the official Playwright Python image with Chrome pre-installed
FROM mcr.microsoft.com/playwright/python:v1.59.0-jammy

# Set working directory
WORKDIR /app

# Install system dependencies for xvfb (virtual display)
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY server/ .

# Expose port
EXPOSE 8000

# Use xvfb-run to provide a virtual display for Chrome
# This allows Playwright to run with headless=False on a server
CMD ["sh", "-c", "xvfb-run -a uvicorn main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips '*'"]
