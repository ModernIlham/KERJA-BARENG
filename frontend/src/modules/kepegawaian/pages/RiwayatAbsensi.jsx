import React, { useState, useEffect } from 'react';
import { PageContainer, PageHeader } from '@/components/ui/page-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, MapPin, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import api from '../../../api/axios';
import { format, parseISO, isSameMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

export default function RiwayatAbsensi() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [month, setMonth] = useState(new Date());
    const [attendanceData, setAttendanceData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchHistory(month);
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

    // Prepare modifiers for calendar
    const presentDays = attendanceData.map(a => parseISO(a.date));
    
    // Determine selected day's data
    const selectedDayData = attendanceData.find(a => 
        selectedDate && a.date === format(selectedDate, 'yyyy-MM-dd')
    );

    return (
        <PageContainer>
            <PageHeader 
                title="Riwayat Absensi" 
                description="Kalender kehadiran dan riwayat waktu kerja." 
            />

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
                                        color: '#16a34a', // green-600
                                        backgroundColor: '#dcfce7' // green-100
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
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                Clock In (Masuk)
                                            </h4>
                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex gap-3">
                                                {selectedDayData.clock_in_photo ? (
                                                     <img src={selectedDayData.clock_in_photo} alt="Clock In" className="w-16 h-16 object-cover rounded bg-slate-200"/>
                                                ) : (
                                                    <div className="w-16 h-16 bg-slate-200 rounded flex items-center justify-center text-xs text-slate-400">No Foto</div>
                                                )}
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1 text-sm font-semibold">
                                                        <Clock size={14} className="text-blue-600"/>
                                                        {format(new Date(selectedDayData.clock_in), 'HH:mm:ss')}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                                        <MapPin size={12}/> {selectedDayData.location_in ? 'Lokasi tercatat' : 'Lokasi tidak ada'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                                Clock Out (Pulang)
                                            </h4>
                                            {selectedDayData.clock_out ? (
                                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex gap-3">
                                                    {selectedDayData.clock_out_photo ? (
                                                        <img src={selectedDayData.clock_out_photo} alt="Clock Out" className="w-16 h-16 object-cover rounded bg-slate-200"/>
                                                    ) : (
                                                        <div className="w-16 h-16 bg-slate-200 rounded flex items-center justify-center text-xs text-slate-400">No Foto</div>
                                                    )}
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1 text-sm font-semibold">
                                                            <Clock size={14} className="text-orange-600"/>
                                                            {format(new Date(selectedDayData.clock_out), 'HH:mm:ss')}
                                                        </div>
                                                        <div className="flex items-center gap-1 text-xs text-slate-500">
                                                            <MapPin size={12}/> {selectedDayData.location_out ? 'Lokasi tercatat' : 'Lokasi tidak ada'}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 border-dashed text-center text-slate-400 text-sm italic">
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
        </PageContainer>
    );
}
