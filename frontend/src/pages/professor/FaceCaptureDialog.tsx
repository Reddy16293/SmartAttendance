import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Camera, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface FaceCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: number;
  className: string;
  sessionId?: number;
  dualVerificationEnabled?: boolean;
}

interface RecognizedStudent {
  name: string;
  confidence: number;
}

export function FaceCaptureDialog({
  open,
  onOpenChange,
  classId,
  className,
  sessionId,
  dualVerificationEnabled = false,
}: FaceCaptureDialogProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recognitionResults, setRecognitionResults] = useState<RecognizedStudent[]>([]);
  const [imageWithBoxes, setImageWithBoxes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<number | undefined>(sessionId);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError('');
      setSuccess(false);
    }
  };

  const createSession = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(
        `${API_URL}/attendance/session/create-with-code?class_id=${classId}&face_recognition_enabled=${dualVerificationEnabled}&generate_code=false`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();
      setCurrentSessionId(data.id);
      return data.id;
    } catch (err: any) {
      setError(err.message || 'Failed to create attendance session');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleUploadImage = async () => {
    if (!selectedImage) {
      setError('Please select an image');
      return;
    }

    if (!currentSessionId) {
      setError('No active session. Creating new session...');
      try {
        const newSessionId = await createSession();
        // Re-run upload with new session
        const formData = new FormData();
        formData.append('image', selectedImage);

        const token = localStorage.getItem('auth_token');
        const response = await fetch(
          `${API_URL}/attendance/session/${newSessionId}/upload-image`,
          {
            method: 'POST',
            body: formData,
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to process image');
        }

        const data = await response.json();
        
        setRecognitionResults(data.recognized_students || []);
        if (data.image_with_boxes) {
          setImageWithBoxes(data.image_with_boxes);
        }
        
        setSuccess(true);
        toast({
          title: 'Face Recognition Complete',
          description: dualVerificationEnabled
            ? `Recognized ${data.recognized_students?.length || 0} students. They will stay pending until code/QR verification is completed.`
            : `Recognized ${data.recognized_students?.length || 0} students. Face-only attendance is marked present.`,
        });
        return;
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to create session';
        setError(errorMsg);
        toast({
          title: 'Error',
          description: errorMsg,
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      setUploading(true);
      setError('');

      const formData = new FormData();
      formData.append('image', selectedImage);

      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_URL}/attendance/session/${currentSessionId}/upload-image`,
        {
          method: 'POST',
          body: formData,
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to process image');
      }

      const data = await response.json();
      
      setRecognitionResults(data.recognized_students || []);
      if (data.image_with_boxes) {
        setImageWithBoxes(data.image_with_boxes);
      }
      
      setSuccess(true);
      toast({
        title: 'Face Recognition Complete',
        description: dualVerificationEnabled
          ? `Recognized ${data.recognized_students?.length || 0} students. They will stay pending until code/QR verification is completed.`
          : `Recognized ${data.recognized_students?.length || 0} students. Face-only attendance is marked present.`,
      });
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to process image.';
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedImage(null);
    setPreviewUrl('');
    setRecognitionResults([]);
    setImageWithBoxes('');
    setError('');
    setSuccess(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Capture Classroom Photo
          </DialogTitle>
          <DialogDescription>
            {className} • Upload a classroom image for face recognition
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success View */}
          {success && recognitionResults.length > 0 ? (
            <div className="space-y-4">
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Successfully recognized {recognitionResults.length} students!
                </AlertDescription>
              </Alert>

              {/* Annotated Image */}
              {imageWithBoxes && (
                <div className="rounded-lg border overflow-hidden">
                  <img
                    src={`data:image/jpeg;base64,${imageWithBoxes}`}
                    alt="Annotated classroom"
                    className="w-full"
                  />
                </div>
              )}

              {/* Recognized Students List */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold mb-3">Recognized Students:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {recognitionResults.map((student, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-white rounded border text-sm"
                    >
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="truncate">{student.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          ) : (
            <>
              {/* Image Upload Section */}
              <div className="space-y-4">
                {/* Preview */}
                {previewUrl ? (
                  <div className="relative rounded-lg border overflow-hidden bg-muted">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full max-h-96 object-contain"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setSelectedImage(null);
                        setPreviewUrl('');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-12 text-center bg-muted/20">
                    <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-2">No image selected</p>
                    <p className="text-sm text-muted-foreground">
                      Upload a classroom photo to detect student faces
                    </p>
                  </div>
                )}

                {/* File Input */}
                <div className="space-y-2">
                  <label
                    htmlFor="face-image-input"
                    className="block text-sm font-medium"
                  >
                    Select Image
                  </label>
                  <input
                    id="face-image-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    disabled={loading || uploading}
                    className="block w-full text-sm text-muted-foreground
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-primary file:text-primary-foreground
                      hover:file:bg-primary/90
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Tips */}
                <Alert>
                  <Upload className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold mb-1">📸 Tips for best results:</p>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>Ensure good lighting in the classroom</li>
                      <li>Capture all students' faces clearly</li>
                      <li>Avoid blurry or dark images</li>
                      <li>Include the entire classroom view</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleUploadImage}
                  disabled={!selectedImage || loading || uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload & Process
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading || uploading}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
