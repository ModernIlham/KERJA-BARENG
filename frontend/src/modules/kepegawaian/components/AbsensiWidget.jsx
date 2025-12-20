import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, MapPin, Clock, RefreshCw, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Webcam from 'react-webcam';
import api from '../../../api/axios';
import { toast } from 'sonner';

const AbsensiWidget = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState('loading'); // 'loading', 'in', 'out'
  const [checkInTime, setCheckInTime] = useState(null);
  const [checkOutTime, setCheckOutTime] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Camera & Location
  const webcamRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchTodayStatus();
    return () => clearInterval(timer);
  }, []);

  const fetchTodayStatus = async () => {
    try {
        const res = await api.get('/api/kepegawaian/attendance/today');
        if (res.data) {
            setCheckInTime(new Date(res.data.clock_in));
            if (res.data.clock_out) {
                setCheckOutTime(new Date(res.data.clock_out));
                setStatus('completed'); // Already clocked out
            } else {
                setStatus('in'); // Clocked in, waiting for out
            }
        } else {
            setStatus('out'); // Not checked in yet
        }
    } catch (e) {
        console.error("Fetch status error", e);
        setStatus('out'); // Default
    }
  };

  const getLocation = () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject("Geolocation not supported");
        } else {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                    resolve(position.coords);
                },
                (error) => {
                    setLocationError("Gagal mendapatkan lokasi: " + error.message);
                    reject(error);
                }
            );
        }
    });
  };

  const handleCapture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    setShowCamera(false);
  }, [webcamRef]);

  const handleProcess = async () => {
    if (!capturedImage) {
        setShowCamera(true);
        return;
    }
    
    setLoading(true);
    try {
        // Ensure location
        let loc = location;
        if (!loc) {
            try {
                const pos = await getLocation();
                loc = { lat: pos.latitude, lng: pos.longitude };
            } catch (e) {
                toast.error("Wajib mengaktifkan lokasi untuk absensi!");
                setLoading(false);
                return;
            }
        }

        const payload = {
            photo: capturedImage,
            location: loc
        };

        if (status === 'out') {
            await api.post('/api/kepegawaian/attendance/clock-in', payload);
            toast.success("Berhasil Clock In!");
            setStatus('in');
            setCheckInTime(new Date());
        } else if (status === 'in') {
            await api.post('/api/kepegawaian/attendance/clock-out', payload);
            toast.success("Berhasil Clock Out!");
            setStatus('completed');
            setCheckOutTime(new Date());
        }
        
        setCapturedImage(null);
    } catch (e) {
        toast.error(e.response?.data?.detail || "Gagal memproses absensi");
    } finally {
        setLoading(false);
    }
  };

  // Helper to reset if user wants to retake photo
  const retakePhoto = () => {
      setCapturedImage(null);
      setShowCamera(true);
  };

  return (
    <Card className="w-full border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span>Absensi Harian</span>
          <div className="text-xl font-mono text-blue-600 font-bold">
            {format(currentTime, 'HH:mm:ss')}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-500 text-center border-b pb-2">
          {format(currentTime, 'EEEE, d MMMM yyyy', { locale: id })}
        </div>
        
        {/* Status Display */}
        <div className="flex flex-col gap-2">
            {checkInTime && (
                <div className="flex justify-between text-sm items-center p-2 bg-green-50 text-green-700 rounded border border-green-100">
                    <span className="flex items-center gap-2"><Clock size={14}/> Masuk</span>
                    <span className="font-bold">{format(checkInTime, 'HH:mm')}</span>
                </div>
            )}
            {checkOutTime && (
                <div className="flex justify-between text-sm items-center p-2 bg-orange-50 text-orange-700 rounded border border-orange-100">
                    <span className="flex items-center gap-2"><Clock size={14}/> Pulang</span>
                    <span className="font-bold">{format(checkOutTime, 'HH:mm')}</span>
                </div>
            )}
        </div>

        {/* Camera View */}
        {showCamera && (
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
                <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover"
                    videoConstraints={{ facingMode: "user" }}
                />
                <Button size="sm" className="absolute bottom-2 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white border-white/50" onClick={handleCapture}>
                    <Camera className="mr-2 h-4 w-4" /> Ambil Foto
                </Button>
                <Button size="icon" variant="ghost" className="absolute top-2 right-2 text-white" onClick={() => setShowCamera(false)}>
                    <XCircle />
                </Button>
            </div>
        )}

        {/* Captured Preview */}
        {capturedImage && !showCamera && (
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                <img src={capturedImage} alt="Selfie" className="w-full h-full object-cover" />
                <Button size="sm" variant="secondary" className="absolute bottom-2 right-2 text-xs" onClick={retakePhoto}>
                    <RefreshCw className="mr-1 h-3 w-3" /> Foto Ulang
                </Button>
            </div>
        )}
        
        {/* Location Status */}
        <div className="text-xs text-center text-slate-400 flex items-center justify-center gap-1">
            <MapPin size={12} /> 
            {location ? "Lokasi Terdeteksi" : locationError ? <span className="text-red-400">Lokasi Error</span> : "Menunggu Lokasi..."}
        </div>

        {/* Action Button */}
        {status !== 'completed' ? (
            <Button 
                className={`w-full ${status === 'out' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
                onClick={handleProcess}
                disabled={loading}
            >
                {loading ? "Memproses..." : (capturedImage ? (status === 'out' ? 'Konfirmasi Clock In' : 'Konfirmasi Clock Out') : (status === 'out' ? 'Ambil Foto & Clock In' : 'Ambil Foto & Clock Out'))}
            </Button>
        ) : (
            <div className="p-3 bg-slate-100 text-slate-500 text-center rounded text-sm font-medium">
                Anda sudah menyelesaikan absensi hari ini.
            </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AbsensiWidget;
