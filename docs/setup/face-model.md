# Face Recognition Model Setup

The `FaceModel/` module is responsible for generating face embeddings and running the face recognition service used by the attendance system.

## Step 1: Navigate to FaceModel Directory

```bash
cd FaceModel
```

## Step 2: Install Dependencies

Create a virtual environment if required:

#### Windows

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

#### Linux / macOS

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install required packages:

```bash
pip install -r requirements.txt
```

## Step 3: Generate Face Embeddings

Run the following command to generate facial embeddings from the training dataset:

```bash
python generate_embeddings.py
```

> This process extracts facial feature vectors and stores them for recognition during attendance verification.

## Step 4: Start Face Recognition Service

Run the face recognition server with ngrok support:

```bash
python run_facemodel_with_ngrok.py
```

This will:
- Start the face recognition API
- Expose the API using ngrok
- Generate a public URL for external/mobile access

## Step 5: Update Backend Face API Endpoint

After starting ngrok, copy the generated public URL and update the backend `.env` file:

```env
FACE_API_ENDPOINT=https://your-ngrok-url/recognize
```

Restart the backend server after updating the endpoint.

## Notes

- Ensure the embeddings are generated before starting the recognition service.
- The `FaceModel/` service must be running for face-based attendance verification.
- If using a physical mobile device, ngrok helps expose the local face recognition API externally.
