import React, { useState, useEffect } from 'react';
import { PageContainer, PageHeader } from '@/components/ui/page-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, MapPin, Calendar as CalendarIcon, CheckCircle2, Camera, LogIn, LogOut, ExternalLink } from 'lucide-react';
import api from '../../../api/axios';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import AttendanceModal from '@/components/kepegawaian/AttendanceModal';

export default function RiwayatAbsensi() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [month, setMonth] = useState(new Date());
    const [attendanceData, setAttendanceData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [todayAttendance, setTodayAttendance] = useState(null);
    
    // Modal states
    const [clockInModalOpen, setClockInModalOpen] = useState(false);
    const [clockOutModalOpen, setClockOutModalOpen] = useState(false);
    const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);

    useEffect(() => {
        fetchHistory(month);
        fetchTodayAttendance();
    }, [month]);

    const fetchHistory = async (date) => {
        setLoading(true);
        try {
            const res = await api.get('/api/kepegawaian/attendance/history', {
                params: {
                    month: date.getMonth() + 1,
                    year: date.getFullYear()
                }
            });
            setAttendanceData(res.data);
        } catch (e) {
            console.error("Fetch history failed", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchTodayAttendance = async () => {
        try {
            const res = await api.get('/api/kepegawaian/attendance/today');
            setTodayAttendance(res.data);
        } catch (e) {
            console.error("Fetch today attendance failed", e);
        }
    };

    const handleAttendanceSuccess = () => {
        fetchTodayAttendance();
        fetchHistory(month);
    };

    // Prepare modifiers for calendar
    const presentDays = attendanceData.map(a => parseISO(a.date));
    
    // Determine selected day's data
    const selectedDayData = attendanceData.find(a => 
        selectedDate && a.date === format(selectedDate, 'yyyy-MM-dd')
    );

    const openPhotoDialog = (photoUrl) => {
        setSelectedPhoto(photoUrl);
        setPhotoDialogOpen(true);
    };

    // Format location address
    const formatLocation = (location) => {
        if (!location) return null;
        if (location.address) return location.address;
        if (location.lat && location.lng) {
            return `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
        }
        return 'Lokasi tersedia';
    };

    // Get map link
    const getMapLink = (location) => {
        if (!location || !location.lat || !location.lng) return null;
        return `https://www.google.com/maps?q=${location.lat},${location.lng}`;
    };

    return (
        <PageContainer>
            <PageHeader 
                title="Riwayat Absensi" 
                description="Kalender kehadiran dan riwayat waktu kerja." 
                actions={
                    <div className="flex gap-2">
                        {!todayAttendance ? (
                            <Button onClick={() => setClockInModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                                <LogIn size={16} className="mr-2" /> Clock In
                            </Button>
                        ) : !todayAttendance.clock_out ? (
                            <Button onClick={() => setClockOutModalOpen(true)} className="bg-orange-600 hover:bg-orange-700">
                                <LogOut size={16} className="mr-2" /> Clock Out
                            </Button>
                        ) : (
                            <Badge className="bg-green-100 text-green-700 border-green-200 px-4 py-2">
                                <CheckCircle2 size={14} className="mr-2" /> Absensi Lengkap Hari Ini
                            </Badge>
                        )}
                    </div>
                }
            />

            {/* Today's Status Card */}
            {todayAttendance && (
                <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-slate-50">
                    <CardContent className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                                    <Clock className="text-white" size={24} />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Status Hari Ini</p>
                                    <p className="font-bold text-slate-800">
                                        {format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-6">
                                <div className="text-center">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Masuk</p>
                                    <p className="font-mono text-xl font-bold text-blue-600">
                                        {format(new Date(todayAttendance.clock_in), 'HH:mm')}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Pulang</p>
                                    <p className="font-mono text-xl font-bold text-orange-600">
                                        {todayAttendance.clock_out 
                                            ? format(new Date(todayAttendance.clock_out), 'HH:mm')
                                            : '--:--'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 lg:col-span-4">
                    <Card className="border-slate-200 shadow-sm h-full">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Kalender Kehadiran</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-center p-4">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                month={month}
                                onMonthChange={setMonth}
                                className="rounded-md border shadow-sm p-4 bg-white"
                                modifiers={{
                                    present: presentDays
                                }}
                                modifiersStyles={{
                                    present: {
                                        fontWeight: 'bold',
                                        color: '#16a34a',
                                        backgroundColor: '#dcfce7'
                                    }
                                }}
                            />
                        </CardContent>
                        <div className="px-6 pb-6">
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-green-100 rounded-full border border-green-200"></div>
                                    <span>Hadir</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-slate-100 rounded-full border border-slate-200"></div>
                                    <span>Absen/Libur</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="md:col-span-4 lg:col-span-8">
                    <Card className="h-full border-slate-200 shadow-sm">
                        <CardHeader className="border-b bg-slate-50/50">
                            <CardTitle className="flex items-center gap-2">
                                <CalendarIcon size={18}/> 
                                {selectedDate ? format(selectedDate, 'EEEE, d MMMM yyyy', {locale: id}) : 'Pilih Tanggal'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            {selectedDayData ? (
                                <div className="space-y-8">
                                    <div className="flex items-center justify-between">
                                        <Badge className="bg-green-600 hover:bg-green-700 text-base px-4 py-1">
                                            <CheckCircle2 size={16} className="mr-2"/>
                                            {selectedDayData.status}
                                        </Badge>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Jam Kerja</p>
                                            <p className="font-mono text-lg font-bold text-slate-800">
                                                {format(new Date(selectedDayData.clock_in), 'HH:mm')} - {selectedDayData.clock_out ? format(new Date(selectedDayData.clock_out), 'HH:mm') : '...'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Clock In Section */}
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                Clock In (Masuk)
                                            </h4>
                                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
                                                {/* Photo */}
                                                <div className="flex gap-3">
                                                    {selectedDayData.clock_in_photo ? (
                                                        <img 
                                                            src={selectedDayData.clock_in_photo} 
                                                            alt="Clock In" 
                                                            className="w-20 h-20 object-cover rounded-lg bg-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                                                            onClick={() => openPhotoDialog(selectedDayData.clock_in_photo)}
                                                        />
                                                    ) : (
                                                        <div className="w-20 h-20 bg-slate-200 rounded-lg flex items-center justify-center">
                                                            <Camera size={24} className="text-slate-400" />
                                                        </div>
                                                    )}
                                                    <div className="space-y-2 flex-1">
                                                        <div className="flex items-center gap-2 text-sm font-semibold">
                                                            <Clock size={14} className="text-blue-600"/>
                                                            {format(new Date(selectedDayData.clock_in), 'HH:mm:ss')}
                                                        </div>
                                                        {selectedDayData.location_in && (
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-slate-600 line-clamp-2">
                                                                    {formatLocation(selectedDayData.location_in)}
                                                                </p>
                                                                {getMapLink(selectedDayData.location_in) && (
                                                                    <a 
                                                                        href={getMapLink(selectedDayData.location_in)} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                                                    >
                                                                        <MapPin size={10} /> Lihat di Maps
                                                                        <ExternalLink size={10} />
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Clock Out Section */}
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                                Clock Out (Pulang)
                                            </h4>
                                            {selectedDayData.clock_out ? (
                                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
                                                    <div className="flex gap-3">
                                                        {selectedDayData.clock_out_photo ? (
                                                            <img 
                                                                src={selectedDayData.clock_out_photo} 
                                                                alt="Clock Out" 
                                                                className="w-20 h-20 object-cover rounded-lg bg-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                                                                onClick={() => openPhotoDialog(selectedDayData.clock_out_photo)}
                                                            />
                                                        ) : (
                                                            <div className="w-20 h-20 bg-slate-200 rounded-lg flex items-center justify-center">
                                                                <Camera size={24} className="text-slate-400" />
                                                            </div>
                                                        )}
                                                        <div className="space-y-2 flex-1">
                                                            <div className="flex items-center gap-2 text-sm font-semibold">
                                                                <Clock size={14} className="text-orange-600"/>
                                                                {format(new Date(selectedDayData.clock_out), 'HH:mm:ss')}
                                                            </div>
                                                            {selectedDayData.location_out && (
                                                                <div className="space-y-1">
                                                                    <p className="text-xs text-slate-600 line-clamp-2">
                                                                        {formatLocation(selectedDayData.location_out)}
                                                                    </p>
                                                                    {getMapLink(selectedDayData.location_out) && (
                                                                        <a 
                                                                            href={getMapLink(selectedDayData.location_out)} 
                                                                            target="_blank" 
                                                                            rel="noopener noreferrer"
                                                                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                                                        >
                                                                            <MapPin size={10} /> Lihat di Maps
                                                                            <ExternalLink size={10} />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 border-dashed text-center text-slate-400 text-sm italic">
                                                    Belum melakukan clock out
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
                                    <CalendarIcon size={48} className="mb-4 opacity-20"/>
                                    <p>Tidak ada data absensi untuk tanggal ini.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Photo Dialog */}
            <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
                <DialogContent className="max-w-lg">
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

            {/* Attendance Modals */}
            <AttendanceModal 
                isOpen={clockInModalOpen}
                onClose={() => setClockInModalOpen(false)}
                type="clock-in"
                onSuccess={handleAttendanceSuccess}
            />
            <AttendanceModal 
                isOpen={clockOutModalOpen}
                onClose={() => setClockOutModalOpen(false)}
                type="clock-out"
                onSuccess={handleAttendanceSuccess}
            />
        </PageContainer>
    );
}
