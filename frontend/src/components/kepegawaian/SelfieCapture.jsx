import React, { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from '@vladmandic/face-api';
import { Button } from '../ui/button';
import { Camera, RefreshCcw, CheckCircle2, AlertCircle, MapPin, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const MODEL_URL = '/models';

export default function SelfieCapture({ onCapture, onLocationChange, disabled = false }) {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [capturedImage, setCapturedImage] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceDetectionActive, setFaceDetectionActive] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Location state
  const [location, setLocation] = useState(null);
  const [locationAddress, setLocationAddress] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Load face detection models
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoadingModels(true);
        
        // Try to load from public folder first
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        
        setModelsLoaded(true);
        setLoadingModels(false);
      } catch (error) {
        console.error('Error loading face detection models:', error);
        // If models fail to load, allow capture without detection
        setModelsLoaded(false);
        setLoadingModels(false);
        setErrorMessage('Face detection tidak tersedia. Anda tetap dapat mengambil foto.');
      }
    };
    
    loadModels();
    getLocation();
  }, []);

  // Get current location
  const getLocation = useCallback(() => {
    setLocationLoading(true);
    setLocationError('');
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation tidak didukung browser');
      setLocationLoading(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        setLocation(coords);
        
        // Reverse geocoding to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'id' } }
          );
          const data = await response.json();
          const address = data.display_name || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
          setLocationAddress(address);
          
          if (onLocationChange) {
            onLocationChange({ ...coords, address });
          }
        } catch (e) {
          const fallbackAddress = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
          setLocationAddress(fallbackAddress);
          if (onLocationChange) {
            onLocationChange({ ...coords, address: fallbackAddress });
          }
        }
        
        setLocationLoading(false);
      },
      (error) => {
        console.error('Location error:', error);
        setLocationError('Gagal mendapatkan lokasi. Mohon izinkan akses lokasi.');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [onLocationChange]);

  // Face detection loop
  useEffect(() => {
    let intervalId;
    
    if (modelsLoaded && faceDetectionActive && webcamRef.current && !capturedImage) {
      intervalId = setInterval(async () => {
        try {
          const video = webcamRef.current?.video;
          if (!video || video.readyState !== 4) return;
          
          const detections = await faceapi.detectAllFaces(
            video, 
            new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
          );
          
          setFaceDetected(detections.length > 0);
          
          // Draw face box on canvas
          if (canvasRef.current) {
            const canvas = canvasRef.current;
            const displaySize = { width: video.videoWidth, height: video.videoHeight };
            faceapi.matchDimensions(canvas, displaySize);
            
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (detections.length > 0) {
              const resizedDetections = faceapi.resizeResults(detections, displaySize);
              resizedDetections.forEach(detection => {
                const { x, y, width, height } = detection.box;
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 3;
                ctx.strokeRect(x, y, width, height);
              });
            }
          }
        } catch (e) {
          console.error('Face detection error:', e);
        }
      }, 200);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [modelsLoaded, faceDetectionActive, capturedImage]);

  // Capture image
  const capturePhoto = useCallback(() => {
    if (webcamRef.current) {
      // Use lower quality for smaller file size
      const imageSrc = webcamRef.current.getScreenshot({ width: 640, height: 480 });
      setCapturedImage(imageSrc);
      setFaceDetectionActive(false);
      
      if (onCapture) {
        onCapture(imageSrc);
      }
    }
  }, [onCapture]);

  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setFaceDetectionActive(true);
    setErrorMessage('');
    
    if (onCapture) {
      onCapture(null);
    }
  }, [onCapture]);

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: 'user'
  };

  return (
    <div className="space-y-4">
      {/* Camera Section */}
      <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video">
        {loadingModels ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p className="text-sm">Memuat deteksi wajah...</p>
          </div>
        ) : capturedImage ? (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
        ) : (
          <>
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.6}
              videoConstraints={videoConstraints}
              className="w-full h-full object-cover"
            />
            <canvas 
              ref={canvasRef} 
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
            
            {/* Face Detection Indicator */}
            <div className={cn(
              "absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 transition-all",
              faceDetected 
                ? "bg-green-500/90 text-white" 
                : "bg-red-500/90 text-white"
            )}>
              {faceDetected ? (
                <><CheckCircle2 size={14} /> Wajah Terdeteksi</>
              ) : (
                <><AlertCircle size={14} /> Posisikan Wajah</>
              )}
            </div>
            
            {/* Crosshair Guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-60 border-2 border-dashed border-white/50 rounded-full"></div>
            </div>
          </>
        )}
      </div>
      
      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {errorMessage}
        </div>
      )}
      
      {/* Location Section */}
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            location ? "bg-green-100 text-green-600" : "bg-slate-200 text-slate-500"
          )}>
            <MapPin size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-semibold text-slate-700">Lokasi Saat Ini</h4>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={getLocation}
                disabled={locationLoading}
                className="text-xs h-7"
              >
                <RefreshCcw size={12} className={cn("mr-1", locationLoading && "animate-spin")} />
                Refresh
              </Button>
            </div>
            
            {locationLoading ? (
              <p className="text-xs text-slate-500">Mendapatkan lokasi...</p>
            ) : locationError ? (
              <p className="text-xs text-red-500">{locationError}</p>
            ) : location ? (
              <>
                <p className="text-xs text-slate-600 truncate mb-1">{locationAddress}</p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)} (±{Math.round(location.accuracy)}m)
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-500">Lokasi belum tersedia</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-3">
        {capturedImage ? (
          <>
            <Button 
              variant="outline" 
              onClick={retakePhoto} 
              className="flex-1"
              disabled={disabled}
            >
              <RefreshCcw size={16} className="mr-2" />
              Foto Ulang
            </Button>
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={!location || disabled}
            >
              <CheckCircle2 size={16} className="mr-2" />
              Gunakan Foto Ini
            </Button>
          </>
        ) : (
          <Button 
            onClick={capturePhoto}
            disabled={disabled || !location || (!faceDetected && modelsLoaded)}
            className={cn(
              "w-full py-6 text-lg font-semibold transition-all",
              (faceDetected || !modelsLoaded) && location
                ? "bg-blue-600 hover:bg-blue-700" 
                : "bg-slate-400 cursor-not-allowed"
            )}
          >
            <Camera size={24} className="mr-3" />
            {!location 
              ? 'Menunggu Lokasi...' 
              : (faceDetected || !modelsLoaded) 
                ? 'Ambil Foto' 
                : 'Posisikan Wajah Anda'}
          </Button>
        )}
      </div>
    </div>
  );
}
