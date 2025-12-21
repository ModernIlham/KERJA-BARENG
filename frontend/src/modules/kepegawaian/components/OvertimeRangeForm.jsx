import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { 
    Users, Calendar, Clock, FileText, Send, Search, X, CheckCircle, 
    ChevronDown, ChevronRight, Plus, Trash2, Copy, Sun, Moon,
    Coffee, CalendarRange
} from 'lucide-react';
import api from '../../../api/axios';

const OvertimeRangeForm = ({ onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [pegawaiList, setPegawaiList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPegawai, setSelectedPegawai] = useState([]);
    const [daysInfo, setDaysInfo] = useState([]);
    const [daysConfig, setDaysConfig] = useState([]);
    const [expandedDays, setExpandedDays] = useState({});
    
    const [formData, setFormData] = useState({
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        description: '',
        default_start_time: '08:00',
        default_end_time: '17:00',
        default_breaks: [{ start_time: '12:00', end_time: '13:00' }]
    });

    useEffect(() => {
        fetchPegawai();
    }, []);

    // Fetch holidays when date range changes
    useEffect(() => {
        if (formData.start_date && formData.end_date) {
            fetchDaysInfo();
        }
    }, [formData.start_date, formData.end_date]);

    // Initialize days config when days info or selected pegawai changes
    useEffect(() => {
        if (daysInfo.length > 0) {
            initializeDaysConfig();
        }
    }, [daysInfo, selectedPegawai, formData.default_start_time, formData.default_end_time, formData.default_breaks]);

    const fetchPegawai = async () => {
        try {
            const res = await api.get('/api/pegawai?limit=200');
            let data = res.data;
            if (data && data.data && Array.isArray(data.data)) {
                data = data.data;
            }
            const mappedData = (Array.isArray(data) ? data : []).map(p => ({
                ...p,
                id: p.id || p._id
            }));
            setPegawaiList(mappedData);
        } catch (e) {
            console.error("Gagal memuat data pegawai", e);
            setPegawaiList([]);
        }
    };

    const fetchDaysInfo = async () => {
        try {
            const res = await api.get(`/api/kepegawaian/overtime/check-holidays?start_date=${formData.start_date}&end_date=${formData.end_date}`);
            setDaysInfo(res.data || []);
        } catch (e) {
            console.error("Gagal memuat info hari", e);
            setDaysInfo([]);
        }
    };

    const initializeDaysConfig = () => {
        const newConfig = daysInfo.map(dayInfo => {
            // Find existing config for this date
            const existingConfig = daysConfig.find(d => d.date === dayInfo.date);
            
            return {
                date: dayInfo.date,
                day_name: dayInfo.day_name,
                is_holiday: dayInfo.is_holiday,
                is_weekend: dayInfo.is_weekend,
                breaks: existingConfig?.breaks || [...formData.default_breaks],
                participants: selectedPegawai.map(p => {
                    // Find existing participant config
                    const existingParticipant = existingConfig?.participants?.find(ep => ep.pegawai_id === p.id);
                    return {
                        pegawai_id: p.id,
                        nama_lengkap: p.nama_lengkap,
                        nip: p.nip,
                        attending: existingParticipant?.attending ?? true,
                        start_time: existingParticipant?.start_time || formData.default_start_time,
                        end_time: existingParticipant?.end_time || formData.default_end_time
                    };
                })
            };
        });
        setDaysConfig(newConfig);
    };

    const filteredPegawai = (pegawaiList || []).filter(p => {
        const search = searchTerm.toLowerCase();
        return (
            p.nama_lengkap?.toLowerCase().includes(search) ||
            p.nip?.toLowerCase().includes(search) ||
            p.jabatan?.toLowerCase().includes(search)
        );
    });

    const togglePegawai = (pegawai) => {
        const isSelected = selectedPegawai.find(p => p.id === pegawai.id);
        if (isSelected) {
            setSelectedPegawai(prev => prev.filter(p => p.id !== pegawai.id));
        } else {
            setSelectedPegawai(prev => [...prev, pegawai]);
        }
    };

    const selectAll = () => setSelectedPegawai(filteredPegawai);
    const clearAll = () => setSelectedPegawai([]);

    const toggleDay = (date) => {
        setExpandedDays(prev => ({ ...prev, [date]: !prev[date] }));
    };

    // Day configuration handlers
    const updateDayBreaks = (date, breaks) => {
        setDaysConfig(prev => prev.map(d => 
            d.date === date ? { ...d, breaks } : d
        ));
    };

    const addBreak = (date) => {
        setDaysConfig(prev => prev.map(d => 
            d.date === date 
                ? { ...d, breaks: [...d.breaks, { start_time: '15:00', end_time: '15:30' }] }
                : d
        ));
    };

    const removeBreak = (date, index) => {
        setDaysConfig(prev => prev.map(d => 
            d.date === date 
                ? { ...d, breaks: d.breaks.filter((_, i) => i !== index) }
                : d
        ));
    };

    const updateBreak = (date, index, field, value) => {
        setDaysConfig(prev => prev.map(d => {
            if (d.date === date) {
                const newBreaks = [...d.breaks];
                newBreaks[index] = { ...newBreaks[index], [field]: value };
                return { ...d, breaks: newBreaks };
            }
            return d;
        }));
    };

    const updateParticipant = (date, pegawaiId, field, value) => {
        setDaysConfig(prev => prev.map(d => {
            if (d.date === date) {
                const newParticipants = d.participants.map(p => 
                    p.pegawai_id === pegawaiId ? { ...p, [field]: value } : p
                );
                return { ...d, participants: newParticipants };
            }
            return d;
        }));
    };

    // Template apply functions
    const applyDefaultToAllDays = () => {
        setDaysConfig(prev => prev.map(d => ({
            ...d,
            breaks: [...formData.default_breaks],
            participants: d.participants.map(p => ({
                ...p,
                start_time: formData.default_start_time,
                end_time: formData.default_end_time,
                attending: true
            }))
        })));
        toast.success("Template diterapkan ke semua hari");
    };

    const copyDayConfig = (sourceDate) => {
        const sourceConfig = daysConfig.find(d => d.date === sourceDate);
        if (!sourceConfig) return;

        setDaysConfig(prev => prev.map(d => {
            if (d.date === sourceDate) return d;
            return {
                ...d,
                breaks: [...sourceConfig.breaks],
                participants: d.participants.map(p => {
                    const sourceP = sourceConfig.participants.find(sp => sp.pegawai_id === p.pegawai_id);
                    return sourceP ? { ...p, ...sourceP, pegawai_id: p.pegawai_id } : p;
                })
            };
        }));
        toast.success(`Konfigurasi ${sourceDate} disalin ke hari lain`);
    };

    // Calculate duration for display
    const calculateDuration = (startTime, endTime, breaks = []) => {
        try {
            const [h1, m1] = startTime.split(':').map(Number);
            const [h2, m2] = endTime.split(':').map(Number);
            let start = h1 * 60 + m1;
            let end = h2 * 60 + m2;
            if (end < start) end += 24 * 60;
            let totalMinutes = end - start;
            
            // Subtract breaks
            breaks.forEach(brk => {
                const [bh1, bm1] = brk.start_time.split(':').map(Number);
                const [bh2, bm2] = brk.end_time.split(':').map(Number);
                let bStart = bh1 * 60 + bm1;
                let bEnd = bh2 * 60 + bm2;
                if (bEnd < bStart) bEnd += 24 * 60;
                totalMinutes -= (bEnd - bStart);
            });
            
            return Math.max(0, totalMinutes / 60).toFixed(1);
        } catch {
            return '0';
        }
    };

    // Summary calculations
    const summary = useMemo(() => {
        let totalDays = 0;
        let totalHours = 0;
        let attendanceCount = 0;

        daysConfig.forEach(day => {
            const attending = day.participants.filter(p => p.attending);
            if (attending.length > 0) {
                totalDays++;
                attending.forEach(p => {
                    const hours = parseFloat(calculateDuration(p.start_time, p.end_time, day.breaks));
                    totalHours += hours;
                    attendanceCount++;
                });
            }
        });

        return { totalDays, totalHours: totalHours.toFixed(1), attendanceCount };
    }, [daysConfig]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (selectedPegawai.length === 0) {
            toast.error("Pilih minimal satu peserta lembur");
            return;
        }

        if (!formData.description) {
            toast.error("Isi deskripsi kegiatan lembur");
            return;
        }

        if (daysConfig.length === 0) {
            toast.error("Pilih rentang tanggal terlebih dahulu");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                start_date: formData.start_date,
                end_date: formData.end_date,
                description: formData.description,
                participant_ids: selectedPegawai.map(p => p.id),
                days: daysConfig.map(d => ({
                    date: d.date,
                    is_holiday: d.is_holiday,
                    breaks: d.breaks,
                    participants: d.participants.map(p => ({
                        pegawai_id: p.pegawai_id,
                        nama_lengkap: p.nama_lengkap,
                        nip: p.nip,
                        attending: p.attending,
                        start_time: p.start_time,
                        end_time: p.end_time
                    }))
                })),
                default_start_time: formData.default_start_time,
                default_end_time: formData.default_end_time,
                default_breaks: formData.default_breaks
            };
            
            const res = await api.post('/api/kepegawaian/overtime/range', payload);
            toast.success(res.data.message);
            
            // Reset form
            setSelectedPegawai([]);
            setDaysConfig([]);
            setDaysInfo([]);
            setFormData({
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date().toISOString().split('T')[0],
                description: '',
                default_start_time: '08:00',
                default_end_time: '17:00',
                default_breaks: [{ start_time: '12:00', end_time: '13:00' }]
            });
            
            if (onSuccess) onSuccess();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Gagal membuat lembur");
        } finally {
            setLoading(false);
        }
    };

    const dayNameIndo = {
        'Monday': 'Senin', 'Tuesday': 'Selasa', 'Wednesday': 'Rabu',
        'Thursday': 'Kamis', 'Friday': 'Jumat', 'Saturday': 'Sabtu', 'Sunday': 'Minggu'
    };

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                    <CalendarRange className="w-5 h-5" />
                    Buat Pengajuan Lembur (Multi-Hari)
                </CardTitle>
                <CardDescription className="text-xs">
                    Pilih rentang tanggal dan konfigurasi jam kerja serta istirahat per hari
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Date Range */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium">Tanggal Mulai</Label>
                            <Input 
                                type="date" 
                                value={formData.start_date}
                                onChange={e => setFormData({...formData, start_date: e.target.value})}
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium">Tanggal Selesai</Label>
                            <Input 
                                type="date" 
                                value={formData.end_date}
                                onChange={e => setFormData({...formData, end_date: e.target.value})}
                                className="h-9"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label className="text-xs font-medium">Deskripsi Kegiatan Lembur</Label>
                        <Textarea 
                            placeholder="Jelaskan kegiatan lembur yang dilakukan..."
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            rows={2}
                        />
                    </div>

                    {/* Default Template */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium text-blue-800">Template Default (untuk semua hari)</Label>
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={applyDefaultToAllDays}
                                className="text-xs"
                            >
                                <Copy className="w-3 h-3 mr-1" /> Terapkan ke Semua Hari
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Jam Mulai</Label>
                                <Input 
                                    type="time" 
                                    value={formData.default_start_time}
                                    onChange={e => setFormData({...formData, default_start_time: e.target.value})}
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Jam Selesai</Label>
                                <Input 
                                    type="time" 
                                    value={formData.default_end_time}
                                    onChange={e => setFormData({...formData, default_end_time: e.target.value})}
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div className="col-span-2 space-y-1">
                                <Label className="text-xs flex items-center gap-1">
                                    <Coffee className="w-3 h-3" /> Istirahat Default
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                    {formData.default_breaks.map((brk, idx) => (
                                        <div key={idx} className="flex items-center gap-1 bg-white px-2 py-1 rounded border text-xs">
                                            <Input 
                                                type="time" 
                                                value={brk.start_time}
                                                onChange={e => {
                                                    const newBreaks = [...formData.default_breaks];
                                                    newBreaks[idx].start_time = e.target.value;
                                                    setFormData({...formData, default_breaks: newBreaks});
                                                }}
                                                className="h-6 w-20 text-xs px-1"
                                            />
                                            <span>-</span>
                                            <Input 
                                                type="time" 
                                                value={brk.end_time}
                                                onChange={e => {
                                                    const newBreaks = [...formData.default_breaks];
                                                    newBreaks[idx].end_time = e.target.value;
                                                    setFormData({...formData, default_breaks: newBreaks});
                                                }}
                                                className="h-6 w-20 text-xs px-1"
                                            />
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-5 w-5"
                                                onClick={() => {
                                                    const newBreaks = formData.default_breaks.filter((_, i) => i !== idx);
                                                    setFormData({...formData, default_breaks: newBreaks});
                                                }}
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm"
                                        className="h-6 text-xs"
                                        onClick={() => setFormData({
                                            ...formData, 
                                            default_breaks: [...formData.default_breaks, { start_time: '15:00', end_time: '15:30' }]
                                        })}
                                    >
                                        <Plus className="w-3 h-3 mr-1" /> Tambah
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Participant Selection */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Pilih Peserta Lembur
                            </Label>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                                    Pilih Semua
                                </Button>
                                <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
                                    Hapus Semua
                                </Button>
                            </div>
                        </div>

                        {selectedPegawai.length > 0 && (
                            <div className="flex flex-wrap gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                {selectedPegawai.map(p => (
                                    <Badge 
                                        key={p.id} 
                                        variant="secondary" 
                                        className="bg-blue-100 text-blue-800 px-2 py-1 flex items-center gap-1"
                                    >
                                        {p.nama_lengkap}
                                        <X 
                                            className="w-3 h-3 cursor-pointer hover:text-red-600" 
                                            onClick={() => togglePegawai(p)}
                                        />
                                    </Badge>
                                ))}
                                <span className="text-xs text-blue-600 flex items-center">
                                    ({selectedPegawai.length} orang dipilih)
                                </span>
                            </div>
                        )}

                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input 
                                placeholder="Cari pegawai berdasarkan nama, NIP, atau jabatan..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>

                        <div className="border rounded-lg max-h-[200px] overflow-y-auto">
                            {filteredPegawai.length === 0 ? (
                                <div className="p-4 text-center text-slate-500 text-sm">
                                    Tidak ada pegawai ditemukan
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {filteredPegawai.map(pegawai => {
                                        const isSelected = selectedPegawai.find(p => p.id === pegawai.id);
                                        return (
                                            <div 
                                                key={pegawai.id}
                                                className={`flex items-center p-2 cursor-pointer transition-colors ${
                                                    isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                                                }`}
                                                onClick={() => togglePegawai(pegawai)}
                                            >
                                                <div className="w-5 h-5 flex items-center justify-center mr-2">
                                                    {isSelected ? (
                                                        <CheckCircle className="w-4 h-4 text-blue-600" />
                                                    ) : (
                                                        <div className="w-3 h-3 border-2 border-slate-300 rounded" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm">{pegawai.nama_lengkap}</div>
                                                    <div className="text-xs text-slate-500">
                                                        {pegawai.nip || '-'} • {pegawai.jabatan || '-'}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Per-Day Configuration */}
                    {daysConfig.length > 0 && selectedPegawai.length > 0 && (
                        <div className="space-y-3">
                            <Label className="text-xs font-medium flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Konfigurasi Per Hari ({daysConfig.length} hari)
                            </Label>
                            
                            <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                                {daysConfig.map((day, dayIdx) => (
                                    <Collapsible 
                                        key={day.date} 
                                        open={expandedDays[day.date]}
                                        onOpenChange={() => toggleDay(day.date)}
                                    >
                                        <CollapsibleTrigger className="w-full">
                                            <div className={`flex items-center justify-between p-3 hover:bg-slate-50 ${
                                                day.is_holiday ? 'bg-red-50' : ''
                                            }`}>
                                                <div className="flex items-center gap-3">
                                                    {expandedDays[day.date] ? 
                                                        <ChevronDown className="w-4 h-4" /> : 
                                                        <ChevronRight className="w-4 h-4" />
                                                    }
                                                    <div className="text-left">
                                                        <div className="font-medium text-sm flex items-center gap-2">
                                                            {dayNameIndo[day.day_name] || day.day_name}, {new Date(day.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            {day.is_holiday && (
                                                                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-xs">
                                                                    <Moon className="w-3 h-3 mr-1" /> Libur
                                                                </Badge>
                                                            )}
                                                            {!day.is_holiday && (
                                                                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-xs">
                                                                    <Sun className="w-3 h-3 mr-1" /> Kerja
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {day.participants.filter(p => p.attending).length} peserta aktif • 
                                                            {day.breaks.length} istirahat
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button 
                                                    type="button" 
                                                    variant="ghost" 
                                                    size="sm"
                                                    className="text-xs"
                                                    onClick={(e) => { e.stopPropagation(); copyDayConfig(day.date); }}
                                                >
                                                    <Copy className="w-3 h-3 mr-1" /> Salin ke Hari Lain
                                                </Button>
                                            </div>
                                        </CollapsibleTrigger>
                                        
                                        <CollapsibleContent>
                                            <div className="p-3 bg-slate-50 space-y-3 border-t">
                                                {/* Break Times */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-xs font-medium flex items-center gap-1">
                                                            <Coffee className="w-3 h-3" /> Jam Istirahat
                                                        </Label>
                                                        <Button 
                                                            type="button" 
                                                            variant="outline" 
                                                            size="sm"
                                                            className="h-6 text-xs"
                                                            onClick={() => addBreak(day.date)}
                                                        >
                                                            <Plus className="w-3 h-3 mr-1" /> Tambah Istirahat
                                                        </Button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {day.breaks.map((brk, brkIdx) => (
                                                            <div key={brkIdx} className="flex items-center gap-1 bg-white px-2 py-1 rounded border text-xs">
                                                                <span className="text-slate-500">#{brkIdx + 1}</span>
                                                                <Input 
                                                                    type="time" 
                                                                    value={brk.start_time}
                                                                    onChange={e => updateBreak(day.date, brkIdx, 'start_time', e.target.value)}
                                                                    className="h-6 w-20 text-xs px-1"
                                                                />
                                                                <span>-</span>
                                                                <Input 
                                                                    type="time" 
                                                                    value={brk.end_time}
                                                                    onChange={e => updateBreak(day.date, brkIdx, 'end_time', e.target.value)}
                                                                    className="h-6 w-20 text-xs px-1"
                                                                />
                                                                <Button 
                                                                    type="button" 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-5 w-5 text-red-500 hover:text-red-700"
                                                                    onClick={() => removeBreak(day.date, brkIdx)}
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                        {day.breaks.length === 0 && (
                                                            <span className="text-xs text-slate-400 italic">Tidak ada istirahat</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Participants */}
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-medium flex items-center gap-1">
                                                        <Users className="w-3 h-3" /> Kehadiran & Jam Kerja Peserta
                                                    </Label>
                                                    <div className="space-y-1">
                                                        {day.participants.map((p, pIdx) => {
                                                            const duration = calculateDuration(p.start_time, p.end_time, day.breaks);
                                                            return (
                                                                <div key={p.pegawai_id} className={`flex items-center gap-2 p-2 rounded border ${
                                                                    p.attending ? 'bg-white' : 'bg-slate-100 opacity-60'
                                                                }`}>
                                                                    <Checkbox 
                                                                        checked={p.attending}
                                                                        onCheckedChange={(checked) => updateParticipant(day.date, p.pegawai_id, 'attending', checked)}
                                                                    />
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-sm font-medium truncate">{p.nama_lengkap}</div>
                                                                    </div>
                                                                    {p.attending && (
                                                                        <>
                                                                            <Input 
                                                                                type="time" 
                                                                                value={p.start_time}
                                                                                onChange={e => updateParticipant(day.date, p.pegawai_id, 'start_time', e.target.value)}
                                                                                className="h-7 w-24 text-xs"
                                                                            />
                                                                            <span className="text-xs">-</span>
                                                                            <Input 
                                                                                type="time" 
                                                                                value={p.end_time}
                                                                                onChange={e => updateParticipant(day.date, p.pegawai_id, 'end_time', e.target.value)}
                                                                                className="h-7 w-24 text-xs"
                                                                            />
                                                                            <Badge variant="outline" className="text-xs">
                                                                                {duration} jam
                                                                            </Badge>
                                                                        </>
                                                                    )}
                                                                    {!p.attending && (
                                                                        <span className="text-xs text-slate-400 italic">Tidak hadir</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Summary */}
                    {daysConfig.length > 0 && selectedPegawai.length > 0 && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <Label className="text-xs font-medium text-green-800 mb-2 block">Ringkasan</Label>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <div className="text-2xl font-bold text-green-700">{summary.totalDays}</div>
                                    <div className="text-xs text-green-600">Hari Aktif</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-green-700">{summary.attendanceCount}</div>
                                    <div className="text-xs text-green-600">Total Kehadiran</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-green-700">{summary.totalHours}</div>
                                    <div className="text-xs text-green-600">Total Jam</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Submit */}
                    <div className="flex justify-end pt-4 border-t">
                        <Button 
                            type="submit" 
                            disabled={loading || selectedPegawai.length === 0 || daysConfig.length === 0}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Send className="w-4 h-4 mr-2" />
                            {loading ? "Menyimpan..." : `Ajukan Lembur (${summary.totalDays} hari)`}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};

export default OvertimeRangeForm;
