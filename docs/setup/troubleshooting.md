# Troubleshooting

**Port already in use**

On macOS / Linux:
```bash
lsof -i :8000
kill -9 <PID>
```

On Windows (PowerShell):
```powershell
netstat -aon | findstr 8000
taskkill /PID <PID> /F
```

To use a different port for the frontend, update `server.port` in `frontend/vite.config.ts`.

**Database connection errors**

- Verify the credentials in `backend/.env` match your MySQL setup.
- Confirm MySQL is running: `mysql -u root -p`
- If using Docker, confirm the container is active: `docker ps`

**Face API errors**

- Confirm the face recognition service is running.
- Verify `FACE_API_ENDPOINT` in `backend/.env` is correct and reachable.

**CORS errors in the browser**

- Confirm `CORS_ORIGINS` in `backend/.env` includes your frontend URL.
- Restart the backend after making any `.env` changes.

**Mobile app cannot reach the backend**

- Use your machine's local IP instead of `localhost` in `EXPO_PUBLIC_API_URL`.
- Ensure both devices are on the same Wi-Fi network, or use `npx expo start --tunnel`.
