import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, Loader2, CheckCircle2, Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface ImageCaptureProps {
  onImageSubmit: (imageData: string) => void;
}

export function ImageCapture({ onImageSubmit }: ImageCaptureProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1280, height: 720 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCapturing(true);
    } catch (error) {
      toast({
        title: 'Camera Error',
        description: 'Unable to access camera. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!capturedImage) return;

    setIsProcessing(true);
    // Simulate API call for face recognition
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    toast({
      title: 'Processing Complete',
      description: 'Face recognition completed. Attendance results are ready.',
    });
    
    onImageSubmit(capturedImage);
    setIsProcessing(false);
  };

  const clearImage = () => {
    setCapturedImage(null);
    stopCamera();
  };

  return (
    <Card className="card-shadow max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-3">
          <Camera className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="font-heading">Capture Classroom Image</CardTitle>
        <CardDescription>
          Take a photo of your classroom or upload an existing image for attendance processing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preview Area */}
        <div
          className={cn(
            'relative aspect-video rounded-xl overflow-hidden bg-muted/50 border-2 border-dashed border-border transition-all',
            (capturedImage || isCapturing) && 'border-solid border-primary/30'
          )}
        >
          {isCapturing ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : capturedImage ? (
            <>
              <img
                src={capturedImage}
                alt="Captured classroom"
                className="w-full h-full object-cover"
              />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-3 right-3 h-8 w-8 rounded-full shadow-lg"
                onClick={clearImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <Image className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm font-medium">No image captured</p>
              <p className="text-xs mt-1">Use camera or upload an image</p>
            </div>
          )}

          {/* Processing Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
              <div className="relative">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-primary/30 animate-ping" />
                </div>
              </div>
              <p className="mt-4 font-medium">Processing Faces...</p>
              <p className="text-sm text-muted-foreground">This may take a moment</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {isCapturing ? (
            <>
              <Button onClick={captureImage} className="flex-1 gap-2">
                <Camera className="h-4 w-4" />
                Capture Photo
              </Button>
              <Button variant="outline" onClick={stopCamera} className="flex-1">
                Cancel
              </Button>
            </>
          ) : capturedImage ? (
            <>
              <Button
                onClick={handleSubmit}
                className="flex-1 gap-2"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {isProcessing ? 'Processing...' : 'Submit for Recognition'}
              </Button>
              <Button variant="outline" onClick={clearImage} className="flex-1" disabled={isProcessing}>
                Retake
              </Button>
            </>
          ) : (
            <>
              <Button onClick={startCamera} className="flex-1 gap-2">
                <Camera className="h-4 w-4" />
                Open Camera
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Upload Image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-accent/50 rounded-lg p-4">
          <h4 className="font-medium text-sm mb-2">📸 Tips for best results:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Ensure good lighting in the classroom</li>
            <li>• Capture all students' faces clearly</li>
            <li>• Avoid blurry or dark images</li>
            <li>• Include the entire classroom view</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
