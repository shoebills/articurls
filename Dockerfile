FROM python:3.14-slim

WORKDIR /app

RUN apt-get update && apt-get install -y libpq-dev gcc

COPY src/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]