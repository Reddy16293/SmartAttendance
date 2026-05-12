# Frontend Setup

## Step 1: Configure environment variables

Create a `.env` file inside the `frontend/` folder:

```env
# ── API ───────────────────────────────────────────────────
VITE_API_URL=http://localhost:8000

# ── Google OAuth (optional) ───────────────────────────────
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

> For production, replace `VITE_API_URL` with your deployed backend URL.

## Step 2: Install and run

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:8080`.

> The frontend expects the backend API at `http://localhost:8000`. CORS is pre-configured for this.
