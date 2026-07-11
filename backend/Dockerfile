FROM python:3.11-slim

WORKDIR /app

# build tools help wheels for numpy / pandas / lxml compile if needed
RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# --host 0.0.0.0 so the container is reachable from the host machine
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
