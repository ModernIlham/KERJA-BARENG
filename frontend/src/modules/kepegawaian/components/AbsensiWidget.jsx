import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const AbsensiWidget = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState('out'); // 'in', 'out'
  const [checkInTime, setCheckInTime] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClockInOut = () => {
    if (status === 'out') {
      setStatus('in');
      setCheckInTime(new Date());
    } else {
      setStatus('out');
      setCheckInTime(null);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Absensi Harian</span>
          <div className="text-xl font-mono text-blue-600">
            {format(currentTime, 'HH:mm:ss')}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-500 text-center">
          {format(currentTime, 'EEEE, d MMMM yyyy', { locale: id })}
        </div>
        
        <div className="flex flex-col gap-2">
          {status === 'in' && checkInTime && (
            <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Masuk: {format(checkInTime, 'HH:mm')}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="w-full gap-2">
                <Camera className="w-4 h-4" />
                Selfie
            </Button>
            <Button variant="outline" className="w-full gap-2">
                <MapPin className="w-4 h-4" />
                Lokasi
            </Button>
        </div>

        <Button 
          className={`w-full ${status === 'out' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
          onClick={handleClockInOut}
        >
          {status === 'out' ? 'Clock In' : 'Clock Out'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AbsensiWidget;
