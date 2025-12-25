import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Camera, MapPin, Clock, RefreshCw, XCircle, CheckCircle2, ExternalLink, LogIn, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Webcam from 'react-webcam';
import api from '../../../api/axios';
import { toast } from 'sonner';

const AbsensiWidget = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState('loading'); // 'loading', 'out', 'in', 'completed'
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Camera & Location
  const webcamRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  
  // Photo dialog
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchTodayStatus();
    return () => clearInterval(timer);
  }, []);

  const fetchTodayStatus = async () => {
    try {
        const res = await api.get('/api/kepegawaian/attendance/today');
        if (res.data) {
            setTodayData(res.data);
            if (res.data.clock_out) {
                setStatus('completed');
            } else {
                setStatus('in');
            }
        } else {
            setStatus('out');
            setTodayData(null);
        }
    } catch (e) {
        console.error("Fetch status error", e);
        setStatus('out');
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
        } else if (status === 'in') {
            await api.post('/api/kepegawaian/attendance/clock-out', payload);
            toast.success("Berhasil Clock Out!");
        }
        
        setCapturedImage(null);
        fetchTodayStatus(); // Refresh data
    } catch (e) {
        toast.error(e.response?.data?.detail || "Gagal memproses absensi");
    } finally {
        setLoading(false);
    }
  };

  const retakePhoto = () => {
      setCapturedImage(null);
      setShowCamera(true);
  };

  const openPhotoDialog = (photoUrl) => {
      setSelectedPhoto(photoUrl);
      setPhotoDialogOpen(true);
  };

  // Format location address
  const formatLocation = (loc) => {
      if (!loc) return null;
      if (loc.address) return loc.address;
      if (loc.lat && loc.lng) {
          return `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`;
      }
      return 'Lokasi tersedia';
  };

  // Get map link
  const getMapLink = (loc) => {
      if (!loc || !loc.lat || !loc.lng) return null;
      return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
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
        
        {/* Today's Attendance Detail - Like RiwayatAbsensi */}
        {todayData && (
          <div className="space-y-4">
            {/* Status Badge & Jam Kerja */}
            <div className="flex items-center justify-between">
              <Badge className="bg-green-600 hover:bg-green-700 px-3 py-1">
                <CheckCircle2 size={14} className="mr-1"/> Hadir
              </Badge>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Jam Kerja</p>
                <p className="font-mono text-sm font-bold text-slate-800">
                  {format(new Date(todayData.clock_in), 'HH:mm')} - {todayData.clock_out ? format(new Date(todayData.clock_out), 'HH:mm') : '...'}
                </p>
              </div>
            </div>

            {/* Clock In Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Clock In (Masuk)
              </h4>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex gap-3">
                  {todayData.clock_in_photo ? (
                    <img 
                      src={todayData.clock_in_photo} 
                      alt="Clock In" 
                      className="w-16 h-16 object-cover rounded-lg bg-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => openPhotoDialog(todayData.clock_in_photo)}
                    />
                  ) : (
                    <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center">
                      <Camera size={20} className="text-slate-400" />
                    </div>
                  )}
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Clock size={12} className="text-blue-600"/>
                      {format(new Date(todayData.clock_in), 'HH:mm:ss')}
                    </div>
                    {todayData.location_in && (
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-600 line-clamp-2">
                          {formatLocation(todayData.location_in)}
                        </p>
                        {getMapLink(todayData.location_in) && (
                          <a 
                            href={getMapLink(todayData.location_in)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <MapPin size={10} /> Maps
                            <ExternalLink size={8} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Clock Out Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                Clock Out (Pulang)
              </h4>
              {todayData.clock_out ? (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex gap-3">
                    {todayData.clock_out_photo ? (
                      <img 
                        src={todayData.clock_out_photo} 
                        alt="Clock Out" 
                        className="w-16 h-16 object-cover rounded-lg bg-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => openPhotoDialog(todayData.clock_out_photo)}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center">
                        <Camera size={20} className="text-slate-400" />
                      </div>
                    )}
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Clock size={12} className="text-orange-600"/>
                        {format(new Date(todayData.clock_out), 'HH:mm:ss')}
                      </div>
                      {todayData.location_out && (
                        <div className="space-y-0.5">
                          <p className="text-[10px] text-slate-600 line-clamp-2">
                            {formatLocation(todayData.location_out)}
                          </p>
                          {getMapLink(todayData.location_out) && (
                            <a 
                              href={getMapLink(todayData.location_out)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <MapPin size={10} /> Maps
                              <ExternalLink size={8} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 border-dashed text-center text-slate-400 text-xs italic">
                  Belum melakukan clock out
                </div>
              )}
            </div>
          </div>
        )}

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
                className={`w-full ${status === 'out' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'} text-white`}
                onClick={handleProcess}
                disabled={loading}
            >
                {loading ? "Memproses..." : (
                  capturedImage ? (
                    status === 'out' ? (
                      <><LogIn size={16} className="mr-2"/> Konfirmasi Clock In</>
                    ) : (
                      <><LogOut size={16} className="mr-2"/> Konfirmasi Clock Out</>
                    )
                  ) : (
                    status === 'out' ? (
                      <><Camera size={16} className="mr-2"/> Ambil Foto & Clock In</>
                    ) : (
                      <><Camera size={16} className="mr-2"/> Ambil Foto & Clock Out</>
                    )
                  )
                )}
            </Button>
        ) : (
            <div className="p-3 bg-green-50 text-green-700 text-center rounded text-sm font-medium border border-green-200">
                <CheckCircle2 size={16} className="inline mr-2"/>
                Absensi hari ini sudah lengkap
            </div>
        )}
        
        {/* Photo Dialog */}
        <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Foto Absensi</DialogTitle>
                </DialogHeader>
                {selectedPhoto && (
                    <img 
                        src={selectedPhoto} 
                        alt="Attendance Photo" 
                        className="w-full rounded-lg"
                    />
                )}
            </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AbsensiWidget;
