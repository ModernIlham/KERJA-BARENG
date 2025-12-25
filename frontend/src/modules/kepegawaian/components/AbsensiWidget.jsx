import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Camera, MapPin, Clock, CheckCircle2, ExternalLink, LogIn, LogOut, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import SelfieCapture from '@/components/kepegawaian/SelfieCapture';
import api from '../../../api/axios';
import { toast } from 'sonner';

const AbsensiWidget = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState('loading'); // 'loading', 'out', 'in', 'completed'
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [clockInModalOpen, setClockInModalOpen] = useState(false);
  const [clockOutModalOpen, setClockOutModalOpen] = useState(false);
  
  // Capture states
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [location, setLocation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
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

  const handleSubmit = async (type) => {
    if (!capturedPhoto) {
      toast.error('Silakan ambil foto terlebih dahulu');
      return;
    }
    
    if (!location) {
      toast.error('Lokasi belum terdeteksi. Mohon izinkan akses lokasi dan refresh.');
      return;
    }

    setSubmitting(true);
    
    try {
      const endpoint = type === 'clock-in' 
        ? '/api/kepegawaian/attendance/clock-in' 
        : '/api/kepegawaian/attendance/clock-out';
      
      const payload = {
        photo: capturedPhoto,
        location: {
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy,
          address: location.address
        }
      };
      
      await api.post(endpoint, payload);
      
      setSuccess(true);
      toast.success(type === 'clock-in' ? 'Clock In berhasil!' : 'Clock Out berhasil!');
      
      setTimeout(() => {
        handleCloseModal();
        fetchTodayStatus();
      }, 1500);
      
    } catch (error) {
      console.error('Attendance error:', error);
      toast.error(error.response?.data?.detail || 'Gagal melakukan absensi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setCapturedPhoto(null);
    setLocation(null);
    setSuccess(false);
    setClockInModalOpen(false);
    setClockOutModalOpen(false);
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

  const isClockIn = !todayData || !todayData.clock_in;

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
        
        {/* Today's Attendance Detail */}
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

        {/* Action Button */}
        {status !== 'completed' ? (
            <Button 
                className={`w-full ${status === 'out' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'} text-white`}
                onClick={() => status === 'out' ? setClockInModalOpen(true) : setClockOutModalOpen(true)}
                disabled={loading}
            >
                {status === 'out' ? (
                  <><LogIn size={16} className="mr-2"/> Clock In</>
                ) : (
                  <><LogOut size={16} className="mr-2"/> Clock Out</>
                )}
            </Button>
        ) : (
            <div className="p-3 bg-green-50 text-green-700 text-center rounded text-sm font-medium border border-green-200">
                <CheckCircle2 size={16} className="inline mr-2"/>
                Absensi hari ini sudah lengkap
            </div>
        )}
        
        {/* Clock In Modal */}
        <Dialog open={clockInModalOpen} onOpenChange={handleCloseModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="text-blue-600" size={20} />
                Clock In - Masuk Kerja
              </DialogTitle>
              <DialogDescription>
                Ambil foto selfie dengan deteksi wajah dan pastikan lokasi Anda terdeteksi.
              </DialogDescription>
            </DialogHeader>

            {success ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4 animate-in zoom-in">
                  <CheckCircle2 size={48} className="text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-green-700 mb-1">Clock In Berhasil!</h3>
                <p className="text-slate-500 text-sm">
                  {format(new Date(), 'EEEE, d MMMM yyyy - HH:mm', { locale: id })}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <SelfieCapture 
                  onCapture={setCapturedPhoto}
                  onLocationChange={setLocation}
                  disabled={submitting}
                />
                
                {/* Location Warning */}
                {!location && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>Lokasi wajib terdeteksi untuk absensi. Mohon izinkan akses lokasi.</span>
                  </div>
                )}
                
                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={handleCloseModal} 
                    className="flex-1"
                    disabled={submitting}
                  >
                    Batal
                  </Button>
                  <Button 
                    onClick={() => handleSubmit('clock-in')}
                    disabled={!capturedPhoto || !location || submitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {submitting ? (
                      <><Loader2 size={16} className="mr-2 animate-spin" /> Memproses...</>
                    ) : (
                      <><Clock size={16} className="mr-2" /> Clock In</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Clock Out Modal */}
        <Dialog open={clockOutModalOpen} onOpenChange={handleCloseModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="text-orange-600" size={20} />
                Clock Out - Pulang Kerja
              </DialogTitle>
              <DialogDescription>
                Ambil foto selfie dengan deteksi wajah dan pastikan lokasi Anda terdeteksi.
              </DialogDescription>
            </DialogHeader>

            {success ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4 animate-in zoom-in">
                  <CheckCircle2 size={48} className="text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-green-700 mb-1">Clock Out Berhasil!</h3>
                <p className="text-slate-500 text-sm">
                  {format(new Date(), 'EEEE, d MMMM yyyy - HH:mm', { locale: id })}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <SelfieCapture 
                  onCapture={setCapturedPhoto}
                  onLocationChange={setLocation}
                  disabled={submitting}
                />
                
                {/* Location Warning */}
                {!location && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>Lokasi wajib terdeteksi untuk absensi. Mohon izinkan akses lokasi.</span>
                  </div>
                )}
                
                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={handleCloseModal} 
                    className="flex-1"
                    disabled={submitting}
                  >
                    Batal
                  </Button>
                  <Button 
                    onClick={() => handleSubmit('clock-out')}
                    disabled={!capturedPhoto || !location || submitting}
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                  >
                    {submitting ? (
                      <><Loader2 size={16} className="mr-2 animate-spin" /> Memproses...</>
                    ) : (
                      <><Clock size={16} className="mr-2" /> Clock Out</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        
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
