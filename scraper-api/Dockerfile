FROM mcr.microsoft.com/playwright/python:v1.40.0-jammy

WORKDIR /app

# The playwright image already has dependencies installed.
# We just need our python packages.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Port 8000 is fine, Render will detect it or we can set it in dashboard.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
