import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Clock, MapPin, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import SelfieCapture from './SelfieCapture';
import api from '../../api/axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function AttendanceModal({ isOpen, onClose, type = 'clock-in', onSuccess }) {
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [location, setLocation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const isClockIn = type === 'clock-in';
  const title = isClockIn ? 'Clock In - Masuk Kerja' : 'Clock Out - Pulang Kerja';
  const description = isClockIn 
    ? 'Ambil foto selfie dan pastikan lokasi Anda terdeteksi untuk absensi masuk.'
    : 'Ambil foto selfie untuk absensi pulang kerja.';

  const handleSubmit = async () => {
    if (!capturedPhoto) {
      toast.error('Silakan ambil foto terlebih dahulu');
      return;
    }
    
    if (!location) {
      toast.error('Lokasi belum terdeteksi. Mohon izinkan akses lokasi.');
      return;
    }

    setSubmitting(true);
    
    try {
      const endpoint = isClockIn ? '/api/kepegawaian/attendance/clock-in' : '/api/kepegawaian/attendance/clock-out';
      
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
      toast.success(isClockIn ? 'Clock In berhasil!' : 'Clock Out berhasil!');
      
      setTimeout(() => {
        if (onSuccess) onSuccess();
        handleClose();
      }, 1500);
      
    } catch (error) {
      console.error('Attendance error:', error);
      toast.error(error.response?.data?.detail || 'Gagal melakukan absensi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setCapturedPhoto(null);
    setLocation(null);
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className={isClockIn ? 'text-blue-600' : 'text-orange-600'} size={20} />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4 animate-in zoom-in">
              <CheckCircle2 size={48} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-green-700 mb-1">
              {isClockIn ? 'Clock In Berhasil!' : 'Clock Out Berhasil!'}
            </h3>
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
            
            {/* Location Warning - Required */}
            {!location && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                <span>Lokasi wajib terdeteksi untuk absensi. Mohon izinkan akses lokasi.</span>
              </div>
            )}
            
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={handleClose} 
                className="flex-1"
                disabled={submitting}
              >
                Batal
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!capturedPhoto || !location || submitting}
                className={`flex-1 ${isClockIn ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'}`}
              >
                {submitting ? (
                  <><Loader2 size={16} className="mr-2 animate-spin" /> Memproses...</>
                ) : (
                  <><Clock size={16} className="mr-2" /> {isClockIn ? 'Clock In' : 'Clock Out'}</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
