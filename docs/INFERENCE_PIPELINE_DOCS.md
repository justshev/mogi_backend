# ML Inference Pipeline Documentation

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   IoT Sensors   │────▶│  Express API    │────▶│   FastAPI ML    │
│  (ESP32/etc.)   │     │  (Aggregation)  │     │   (Inference)   │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │    Supabase     │
                        │  (PostgreSQL)   │
                        │  - Raw Logs     │
                        │  - Features     │
                        │  - Results      │
                        └─────────────────┘
```

## Data Flow

1. **IoT → Express**: Sensors send raw temperature, humidity, warmth data
2. **Express → Supabase**: Raw logs stored in `logs` table
3. **Express Aggregation**: SQL-based feature computation (avg, min, max, std, trend)
4. **Express → Feature Store**: Aggregated features stored in `feature_store` table
5. **Express → FastAPI**: Only clean numerical features sent for inference
6. **FastAPI → Express**: JSON predictions returned
7. **Express → Supabase**: Results stored in `inference_results` table

## Database Schema

### logs (Raw Sensor Data)

| Column      | Type      | Description                 |
| ----------- | --------- | --------------------------- |
| id          | UUID      | Primary key                 |
| user_id     | UUID      | Owner reference             |
| device_id   | UUID      | Device reference (optional) |
| temperature | FLOAT     | Temperature in Celsius      |
| humidity    | FLOAT     | Humidity percentage         |
| warmth      | FLOAT     | Heat/warmth level           |
| timestamp   | TIMESTAMP | When reading was taken      |

### feature_store (Aggregated Features)

| Column                                                                 | Type      | Description                 |
| ---------------------------------------------------------------------- | --------- | --------------------------- |
| id                                                                     | UUID      | Primary key                 |
| user_id                                                                | UUID      | Owner reference             |
| device_id                                                              | UUID      | Device reference            |
| window_type                                                            | STRING    | 'hourly', 'daily', 'custom' |
| window_start                                                           | TIMESTAMP | Aggregation window start    |
| window_end                                                             | TIMESTAMP | Aggregation window end      |
| sample_count                                                           | INT       | Number of samples           |
| temp_avg, temp_min, temp_max, temp_std, temp_trend                     | FLOAT     | Temperature stats           |
| humidity_avg, humidity_min, humidity_max, humidity_std, humidity_trend | FLOAT     | Humidity stats              |
| warmth_avg, warmth_min, warmth_max, warmth_std, warmth_trend           | FLOAT     | Warmth stats                |
| baglog_count                                                           | INT       | Number of mushroom bags     |

### inference_results (Prediction Audit Trail)

| Column            | Type    | Description            |
| ----------------- | ------- | ---------------------- |
| id                | UUID    | Primary key            |
| user_id           | UUID    | Owner reference        |
| model_version     | STRING  | ML model version       |
| harvest_time_days | FLOAT   | Predicted harvest days |
| risk_fail         | INT     | Binary risk indicator  |
| risk_probability  | FLOAT   | Risk probability       |
| is_anomaly        | BOOLEAN | Anomaly flag           |
| recommendations   | JSON    | Auto recommendations   |

## Express API Endpoints

### POST /api/inference/predict

Full prediction with real-time feature aggregation.

**Request:**

```json
{
  "deviceId": "optional-device-uuid",
  "baglogCount": 100,
  "hoursBack": 24
}
```

**Response:**

```json
{
  "success": true,
  "prediction": {
    "harvest_time_days": 32.5,
    "risk_fail": 0,
    "risk_probability": 0.15,
    "risk_level": "low",
    "anomaly": false,
    "anomaly_score": -0.2,
    "recommendations": ["Conditions are optimal"],
    "model_version": "1.0.0"
  },
  "features": {
    "aggregated": {...},
    "metadata": {...}
  },
  "performance": {
    "totalLatencyMs": 150,
    "inferenceLatencyMs": 45
  }
}
```

### POST /api/inference/predict-stored

Faster prediction using pre-computed features from feature store.

### POST /api/inference/compute-features

Manually trigger feature computation and storage.

### GET /api/inference/features/summary

Get feature summary with data quality metrics.

### GET /api/inference/history

Get prediction history for audit trail.

### GET /api/inference/health

Check inference pipeline health status.

## FastAPI Endpoints

### POST /api/v1/predict

Full multi-model prediction.

**Request:**

```json
{
  "temperature": 25.5,
  "humidity": 85.0,
  "warmth": 28.0,
  "baglog": 100,
  "extended_features": null
}
```

### POST /api/v1/predict/harvest

Harvest time prediction only.

### POST /api/v1/predict/risk

Risk classification only.

### POST /api/v1/predict/anomaly

Anomaly detection only.

### GET /health

Service health check.

## Environment Variables

### Express (.env)

```
FASTAPI_URL=http://localhost:8000
FASTAPI_TIMEOUT=10000
FASTAPI_MAX_RETRIES=3
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### FastAPI (.env)

```
MODEL_DIR=model
MODEL_VERSION=1.0.0
PORT=8000
HOST=0.0.0.0
ENV=production
CORS_ORIGINS=http://localhost:3000
```

## Error Handling

### Circuit Breaker

Express implements a circuit breaker for FastAPI calls:

- Opens after 5 consecutive failures
- Auto-resets after 30 seconds
- Returns fallback predictions when open

### Fallback Predictions

When ML service is unavailable, rule-based fallback provides degraded experience:

- Simple threshold-based recommendations
- Basic risk estimation
- Marked with `isFallback: true`

## Scaling Considerations

1. **Horizontal Scaling**: Both Express and FastAPI are stateless
2. **Feature Pre-computation**: Schedule hourly/daily aggregation jobs
3. **Caching**: Consider Redis for frequently accessed features
4. **Database Indexes**: Optimized for time-range and user queries
5. **Model Loading**: Models loaded once at startup, not per-request

## Retraining Workflow

1. Export feature data from `feature_store` table
2. Update training scripts with new data
3. Retrain models with versioning
4. Deploy new model files to FastAPI
5. Update `MODEL_VERSION` environment variable
6. Restart FastAPI service
