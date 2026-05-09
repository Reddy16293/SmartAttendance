import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QrCode, Upload, CheckCircle2, AlertCircle, Camera } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface QRCodeScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function QRCodeScanDialog({
  open,
  onOpenChange,
  onSuccess,
}: QRCodeScanDialogProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Start camera for scanning
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setStream(mediaStream);
      setIsScanning(true);
    } catch (error) {
      console.error('Failed to start camera:', error);
      toast({
        title: 'Camera Error',
        description: 'Failed to access camera. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  };

  // Capture image from camera
  const captureImage = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'qr-scan.jpg', { type: 'image/jpeg' });
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(blob));
      stopCamera();
      
      // Auto-submit captured image
      await handleUpload(file);
    }, 'image/jpeg');
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
  };

  // Handle QR code upload
  const handleUpload = async (fileToUpload?: File) => {
    const file = fileToUpload || selectedFile;
    if (!file) {
      toast({
        title: 'No File Selected',
        description: 'Please select an image containing a QR code',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      const token = localStorage.getItem('auth_token');

      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`${API_URL}/attendance/upload-qr-image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      setResult(data);

      if (data.success) {
        toast({
          title: 'Success',
          description: data.message,
        });
        setTimeout(() => {
          onOpenChange(false);
          setSelectedFile(null);
          setPreviewUrl(null);
          setResult(null);
          onSuccess?.();
        }, 2000);
      } else {
        toast({
          title: 'Failed',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to upload QR code:', error);
      setResult({
        success: false,
        message: 'Failed to process QR code image',
      });
      toast({
        title: 'Error',
        description: 'Failed to process QR code image',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Cleanup on close
  const handleClose = () => {
    stopCamera();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan QR Code for Attendance</DialogTitle>
          <DialogDescription>
            Scan the QR code displayed by your professor or upload a photo of it
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="scan" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scan">
              <Camera className="h-4 w-4 mr-2" />
              Scan
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="space-y-4">
            <div className="space-y-4">
              {!isScanning && !previewUrl ? (
                <div className="text-center py-8">
                  <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-4">
                    Start your camera to scan the QR code
                  </p>
                  <Button onClick={startCamera}>
                    Start Camera
                  </Button>
                </div>
              ) : previewUrl ? (
                <div className="space-y-4">
                  <div className="bg-muted rounded-lg p-4">
                    <img
                      src={previewUrl}
                      alt="Captured QR Code"
                      className="w-full rounded"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPreviewUrl(null);
                        setSelectedFile(null);
                        startCamera();
                      }}
                      className="flex-1"
                    >
                      Retake
                    </Button>
                    <Button
                      onClick={() => handleUpload()}
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? 'Processing...' : 'Submit'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      className="w-full"
                      playsInline
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={stopCamera}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={captureImage}
                      className="flex-1"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Capture
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-4">
              {!previewUrl ? (
                <div className="text-center py-8">
                  <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-4">
                    Upload a photo of the QR code
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Image
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-muted rounded-lg p-4">
                    <img
                      src={previewUrl}
                      alt="Selected QR Code"
                      className="w-full rounded"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPreviewUrl(null);
                        setSelectedFile(null);
                        setResult(null);
                      }}
                      className="flex-1"
                    >
                      Choose Different Image
                    </Button>
                    <Button
                      onClick={() => handleUpload()}
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? 'Processing...' : 'Submit'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {result && (
          <div
            className={`rounded-lg p-4 flex items-start gap-3 ${
              result.success
                ? 'bg-success/10 border border-success/20'
                : 'bg-destructive/10 border border-destructive/20'
            }`}
          >
            {result.success ? (
              <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p
                className={`font-semibold text-sm ${
                  result.success ? 'text-success' : 'text-destructive'
                }`}
              >
                {result.success ? 'Attendance Submitted' : 'Failed'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {result.message}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
