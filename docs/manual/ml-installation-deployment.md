# ML Module, Installation, and Deployment

## ML Module Explanation

### Model Used

The ML portion of the project is centered on face recognition. The repository contains an operational inference layer in `face-api` and a model development pipeline in `FaceModel`.

### Training Process

The `FaceModel` folder contains scripts for:

- generating face embeddings,
- training a classifier,
- evaluating recognition results,
- recognizing faces from uploaded images.

### Dataset

The repository includes dataset and embedding directories such as:

- `dataset/`
- `embeddings/`
- `embeddings1/`
- `ICFD_Samples/`
- `recognized_outputs/`

### Inference Pipeline

1. The teacher uploads an attendance image.
2. The backend forwards the image to the recognition service.
3. The recognition layer extracts faces and confidence values.
4. The backend matches identities against enrolled students.
5. Attendance records are updated with face-detection results.
6. Annotated images are optionally returned for review.

## Installation Guide

Refer to [Setup Guide](../setup/index.md).

## Deployment Guide

### Deployment Architecture

A practical deployment layout is:

- **Backend:** FastAPI service hosted on Render, Docker, a VM, or a container platform.
- **Database:** Managed MySQL service( aiven mysql databse).
- **Mobile App:** Expo/EAS build pipeline or development client.
- **Web App:** Static deployment on Vercel or a similar hosting provider.
- **AI Service:** Separate container or VM for face recognition inference if required ( we used the ngrok running locally ).

### Hosting Platforms

- Backend: Render, Docker host, Linux VM, Kubernetes, or equivalent.
- Web frontend: Vercel.
- Mobile frontend: Expo EAS.
- Database: Managed MySQL.
- AI service: Dedicated container or self-hosted service(ngtok).

### Deployment Steps

1. Configure production environment variables.
2. Build and test the backend.
3. Run database migrations.
4. Deploy the backend with a process manager or container runtime.
5. Update frontend API URLs to the production backend.
6. Build and publish the mobile and web clients.
7. Verify login, attendance, and reporting flows end to end.

### Production Configuration

- Use a strong `SECRET_KEY`.
- Use managed database credentials.
- Restrict CORS origins to the deployed frontends.
- Configure HTTPS on public hosts.
- Use separate Google OAuth client IDs for production apps.
- Store uploaded media in a durable storage backend.
- Keep face recognition services isolated from public unauthenticated traffic.
