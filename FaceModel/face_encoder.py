import os
import numpy as np
import cv2
import insightface
import onnxruntime as ort

class FaceEncoder:
    def __init__(self):
        available_providers = ort.get_available_providers()
        preferred_providers = ['CPUExecutionProvider', 'CUDAExecutionProvider']
        self.providers = [provider for provider in preferred_providers if provider in available_providers]

        if not self.providers:
            self.providers = ['CPUExecutionProvider']

        model_name = os.getenv('INSIGHTFACE_MODEL_NAME', 'buffalo_l')
        det_size = tuple(
            int(value.strip())
            for value in os.getenv('INSIGHTFACE_DET_SIZE', '640,640').split(',')
        )
        allowed_modules = [
            item.strip()
            for item in os.getenv('INSIGHTFACE_ALLOWED_MODULES', 'detection,recognition').split(',')
            if item.strip()
        ]

        # Load a single detector/recognizer pair to keep memory usage down on Render.
        self.app = insightface.app.FaceAnalysis(
            name=model_name,
            providers=self.providers,
            allowed_modules=allowed_modules,
        )
        self.app.prepare(ctx_id=-1, det_size=det_size)

    def detect_faces(self, img):
        """Detect faces using the configured InsightFace model."""
        return self.app.get(img)

    def l2_normalize(self, x):
        return x / np.sqrt(np.sum(np.square(x)))

    def encode_image(self, file_bytes):
        npimg = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

        if img is None:
            print("⚠️ Could not read image bytes")
            return None

        faces = self.detect_faces(img)
        if len(faces) == 0:
            print("⚠️ No face detected in uploaded image")
            return None

        return self.l2_normalize(faces[0].embedding)