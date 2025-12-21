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
    Coffee, CalendarRange, CalendarPlus
} from 'lucide-react';
import api from '../../../api/axios';

const OvertimeRangeForm = ({ onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [pegawaiList, setPegawaiList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPegawai, setSelectedPegawai] = useState([]);
    const [expandedDays, setExpandedDays] = useState({});
    const [expandedRanges, setExpandedRanges] = useState({0: true});
    
    // Multiple date ranges
    const [dateRanges, setDateRanges] = useState([{
        id: 0,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        daysInfo: [],
        daysConfig: []
    }]);
    
    const [formData, setFormData] = useState({
        description: '',
        default_start_time: '08:00',
        default_end_time: '17:00',
        default_breaks: [{ start_time: '12:00', end_time: '13:00' }]
    });

    useEffect(() => {
        fetchPegawai();
    }, []);

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

    // Fetch holidays when date range changes
    const fetchDaysInfo = async (rangeId, startDate, endDate) => {
        if (!startDate || !endDate) return;
        try {
            const res = await api.get(`/api/kepegawaian/overtime/check-holidays?start_date=${startDate}&end_date=${endDate}`);
            const daysInfo = res.data || [];
            
            // Initialize days config for this range
            const daysConfig = daysInfo.map(dayInfo => ({
                date: dayInfo.date,
                day_name: dayInfo.day_name,
                is_holiday: dayInfo.is_holiday,
                is_weekend: dayInfo.is_weekend,
                breaks: [...formData.default_breaks],
                participants: selectedPegawai.map(p => ({
                    pegawai_id: p.id,
                    nama_lengkap: p.nama_lengkap,
                    nip: p.nip,
                    attending: true,
                    start_time: formData.default_start_time,
                    end_time: formData.default_end_time
                }))
            }));
            
            setDateRanges(prev => prev.map(r => 
                r.id === rangeId ? { ...r, daysInfo, daysConfig } : r
            ));
        } catch (e) {
            console.error("Gagal memuat info hari", e);
        }
    };

    // Update days config when selected pegawai changes
    useEffect(() => {
        if (selectedPegawai.length > 0) {
            setDateRanges(prev => prev.map(range => ({
                ...range,
                daysConfig: range.daysConfig.map(day => ({
                    ...day,
                    participants: selectedPegawai.map(p => {
                        const existing = day.participants?.find(ep => ep.pegawai_id === p.id);
                        return existing || {
                            pegawai_id: p.id,
                            nama_lengkap: p.nama_lengkap,
                            nip: p.nip,
                            attending: true,
                            start_time: formData.default_start_time,
                            end_time: formData.default_end_time
                        };
                    })
                }))
            })));
        }
    }, [selectedPegawai]);

    const addDateRange = () => {
        const newId = Math.max(...dateRanges.map(r => r.id)) + 1;
        setDateRanges(prev => [...prev, {
            id: newId,
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
            daysInfo: [],
            daysConfig: []
        }]);
        setExpandedRanges(prev => ({ ...prev, [newId]: true }));
    };

    const removeDateRange = (rangeId) => {
        if (dateRanges.length <= 1) {
            toast.error("Minimal harus ada satu rentang tanggal");
            return;
        }
        setDateRanges(prev => prev.filter(r => r.id !== rangeId));
    };

    const updateDateRange = (rangeId, field, value) => {
        setDateRanges(prev => prev.map(r => 
            r.id === rangeId ? { ...r, [field]: value } : r
        ));
        
        // Fetch days info when dates change
        const range = dateRanges.find(r => r.id === rangeId);
        if (range) {
            const startDate = field === 'start_date' ? value : range.start_date;
            const endDate = field === 'end_date' ? value : range.end_date;
            if (startDate && endDate && startDate <= endDate) {
                setTimeout(() => fetchDaysInfo(rangeId, startDate, endDate), 100);
            }
        }
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

    const toggleDay = (rangeId, date) => {
        const key = `${rangeId}-${date}`;
        setExpandedDays(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleRange = (rangeId) => {
        setExpandedRanges(prev => ({ ...prev, [rangeId]: !prev[rangeId] }));
    };

    // Day configuration handlers
    const updateDayConfig = (rangeId, date, field, value) => {
        setDateRanges(prev => prev.map(range => {
            if (range.id !== rangeId) return range;
            return {
                ...range,
                daysConfig: range.daysConfig.map(day => 
                    day.date === date ? { ...day, [field]: value } : day
                )
            };
        }));
    };

    const addBreak = (rangeId, date) => {
        setDateRanges(prev => prev.map(range => {
            if (range.id !== rangeId) return range;
            return {
                ...range,
                daysConfig: range.daysConfig.map(day => 
                    day.date === date 
                        ? { ...day, breaks: [...day.breaks, { start_time: '15:00', end_time: '15:30' }] }
                        : day
                )
            };
        }));
    };

    const removeBreak = (rangeId, date, index) => {
        setDateRanges(prev => prev.map(range => {
            if (range.id !== rangeId) return range;
            return {
                ...range,
                daysConfig: range.daysConfig.map(day => 
                    day.date === date 
                        ? { ...day, breaks: day.breaks.filter((_, i) => i !== index) }
                        : day
                )
            };
        }));
    };

    const updateBreak = (rangeId, date, index, field, value) => {
        setDateRanges(prev => prev.map(range => {
            if (range.id !== rangeId) return range;
            return {
                ...range,
                daysConfig: range.daysConfig.map(day => {
                    if (day.date !== date) return day;
                    const newBreaks = [...day.breaks];
                    newBreaks[index] = { ...newBreaks[index], [field]: value };
                    return { ...day, breaks: newBreaks };
                })
            };
        }));
    };

    const updateParticipant = (rangeId, date, pegawaiId, field, value) => {
        setDateRanges(prev => prev.map(range => {
            if (range.id !== rangeId) return range;
            return {
                ...range,
                daysConfig: range.daysConfig.map(day => {
                    if (day.date !== date) return day;
                    return {
                        ...day,
                        participants: day.participants.map(p => 
                            p.pegawai_id === pegawaiId ? { ...p, [field]: value } : p
                        )
                    };
                })
            };
        }));
    };

    // Apply template to a specific range
    const applyTemplateToRange = (rangeId) => {
        setDateRanges(prev => prev.map(range => {
            if (range.id !== rangeId) return range;
            return {
                ...range,
                daysConfig: range.daysConfig.map(day => ({
                    ...day,
                    breaks: [...formData.default_breaks],
                    participants: day.participants.map(p => ({
                        ...p,
                        start_time: formData.default_start_time,
                        end_time: formData.default_end_time,
                        attending: true
                    }))
                }))
            };
        }));
        toast.success("Template diterapkan");
    };

    const copyDayConfig = (rangeId, sourceDate) => {
        const range = dateRanges.find(r => r.id === rangeId);
        if (!range) return;
        
        const sourceConfig = range.daysConfig.find(d => d.date === sourceDate);
        if (!sourceConfig) return;

        setDateRanges(prev => prev.map(r => {
            if (r.id !== rangeId) return r;
            return {
                ...r,
                daysConfig: r.daysConfig.map(day => {
                    if (day.date === sourceDate) return day;
                    return {
                        ...day,
                        breaks: [...sourceConfig.breaks],
                        participants: day.participants.map(p => {
                            const sourceP = sourceConfig.participants.find(sp => sp.pegawai_id === p.pegawai_id);
                            return sourceP ? { ...p, ...sourceP, pegawai_id: p.pegawai_id } : p;
                        })
                    };
                })
            };
        }));
        toast.success(`Konfigurasi disalin ke hari lain dalam rentang ini`);
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
        let totalRanges = dateRanges.filter(r => r.daysConfig.length > 0).length;

        dateRanges.forEach(range => {
            range.daysConfig.forEach(day => {
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
        });

        return { totalRanges, totalDays, totalHours: totalHours.toFixed(1), attendanceCount };
    }, [dateRanges]);

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

        const validRanges = dateRanges.filter(r => r.daysConfig.length > 0);
        if (validRanges.length === 0) {
            toast.error("Pilih rentang tanggal dan generate konfigurasi hari");
            return;
        }

        setLoading(true);
        try {
            // Combine all days from all ranges
            const allDays = [];
            validRanges.forEach(range => {
                range.daysConfig.forEach(day => {
                    allDays.push({
                        date: day.date,
                        is_holiday: day.is_holiday,
                        breaks: day.breaks,
                        participants: day.participants.map(p => ({
                            pegawai_id: p.pegawai_id,
                            nama_lengkap: p.nama_lengkap,
                            nip: p.nip,
                            attending: p.attending,
                            start_time: p.start_time,
                            end_time: p.end_time
                        }))
                    });
                });
            });

            // Sort by date
            allDays.sort((a, b) => a.date.localeCompare(b.date));

            const payload = {
                start_date: allDays[0].date,
                end_date: allDays[allDays.length - 1].date,
                description: formData.description,
                participant_ids: selectedPegawai.map(p => p.id),
                days: allDays,
                date_ranges: validRanges.map(r => ({
                    start_date: r.start_date,
                    end_date: r.end_date
                })),
                default_start_time: formData.default_start_time,
                default_end_time: formData.default_end_time,
                default_breaks: formData.default_breaks
            };
            
            const res = await api.post('/api/kepegawaian/overtime/range', payload);
            toast.success(res.data.message);
            
            // Reset form
            setSelectedPegawai([]);
            setDateRanges([{
                id: 0,
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date().toISOString().split('T')[0],
                daysInfo: [],
                daysConfig: []
            }]);
            setFormData({
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
                    Buat Pengajuan Lembur (Multi-Rentang)
                </CardTitle>
                <CardDescription className="text-xs">
                    Pilih satu atau lebih rentang tanggal dan konfigurasi jam kerja serta istirahat per hari
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
                <form onSubmit={handleSubmit} className="space-y-5">
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
                        <Label className="text-xs font-medium text-blue-800">Template Default</Label>
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

                        <div className="border rounded-lg max-h-[150px] overflow-y-auto">
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

                    {/* Date Ranges */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium flex items-center gap-2">
                                <CalendarRange className="w-4 h-4" />
                                Rentang Tanggal ({dateRanges.length})
                            </Label>
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={addDateRange}
                            >
                                <CalendarPlus className="w-4 h-4 mr-1" /> Tambah Rentang
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {dateRanges.map((range, rangeIdx) => (
                                <Collapsible
                                    key={range.id}
                                    open={expandedRanges[range.id]}
                                    onOpenChange={() => toggleRange(range.id)}
                                >
                                    <div className="border rounded-lg overflow-hidden">
                                        <CollapsibleTrigger className="w-full">
                                            <div className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100">
                                                <div className="flex items-center gap-2">
                                                    {expandedRanges[range.id] ? 
                                                        <ChevronDown className="w-4 h-4" /> : 
                                                        <ChevronRight className="w-4 h-4" />
                                                    }
                                                    <span className="font-medium text-sm">
                                                        Rentang #{rangeIdx + 1}: {range.start_date} s/d {range.end_date}
                                                    </span>
                                                    {range.daysConfig.length > 0 && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {range.daysConfig.length} hari
                                                        </Badge>
                                                    )}
                                                </div>
                                                {dateRanges.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 hover:text-red-700"
                                                        onClick={(e) => { e.stopPropagation(); removeDateRange(range.id); }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </CollapsibleTrigger>

                                        <CollapsibleContent>
                                            <div className="p-3 space-y-3 border-t">
                                                {/* Date inputs */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Tanggal Mulai</Label>
                                                        <Input 
                                                            type="date" 
                                                            value={range.start_date}
                                                            onChange={e => updateDateRange(range.id, 'start_date', e.target.value)}
                                                            className="h-8"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Tanggal Selesai</Label>
                                                        <Input 
                                                            type="date" 
                                                            value={range.end_date}
                                                            onChange={e => updateDateRange(range.id, 'end_date', e.target.value)}
                                                            className="h-8"
                                                        />
                                                    </div>
                                                </div>

                                                {range.daysConfig.length > 0 && selectedPegawai.length > 0 && (
                                                    <>
                                                        <div className="flex justify-end">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-xs"
                                                                onClick={() => applyTemplateToRange(range.id)}
                                                            >
                                                                <Copy className="w-3 h-3 mr-1" /> Terapkan Template
                                                            </Button>
                                                        </div>

                                                        {/* Days in this range */}
                                                        <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                                                            {range.daysConfig.map((day) => {
                                                                const dayKey = `${range.id}-${day.date}`;
                                                                return (
                                                                    <Collapsible 
                                                                        key={day.date} 
                                                                        open={expandedDays[dayKey]}
                                                                        onOpenChange={() => toggleDay(range.id, day.date)}
                                                                    >
                                                                        <CollapsibleTrigger className="w-full">
                                                                            <div className={`flex items-center justify-between p-2 hover:bg-slate-50 text-xs ${
                                                                                day.is_holiday ? 'bg-red-50' : ''
                                                                            }`}>
                                                                                <div className="flex items-center gap-2">
                                                                                    {expandedDays[dayKey] ? 
                                                                                        <ChevronDown className="w-3 h-3" /> : 
                                                                                        <ChevronRight className="w-3 h-3" />
                                                                                    }
                                                                                    <span className="font-medium">
                                                                                        {dayNameIndo[day.day_name]}, {new Date(day.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                                                    </span>
                                                                                    {day.is_holiday ? (
                                                                                        <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-[10px]">
                                                                                            Libur
                                                                                        </Badge>
                                                                                    ) : (
                                                                                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-[10px]">
                                                                                            Kerja
                                                                                        </Badge>
                                                                                    )}
                                                                                </div>
                                                                                <span className="text-slate-500">
                                                                                    {day.participants.filter(p => p.attending).length} peserta
                                                                                </span>
                                                                            </div>
                                                                        </CollapsibleTrigger>
                                                                        
                                                                        <CollapsibleContent>
                                                                            <div className="p-2 bg-slate-50 space-y-2 border-t text-xs">
                                                                                {/* Break Times */}
                                                                                <div className="flex flex-wrap items-center gap-2">
                                                                                    <span className="text-slate-500">Istirahat:</span>
                                                                                    {day.breaks.map((brk, brkIdx) => (
                                                                                        <div key={brkIdx} className="flex items-center gap-1 bg-white px-1 py-0.5 rounded border">
                                                                                            <Input 
                                                                                                type="time" 
                                                                                                value={brk.start_time}
                                                                                                onChange={e => updateBreak(range.id, day.date, brkIdx, 'start_time', e.target.value)}
                                                                                                className="h-5 w-16 text-xs px-1"
                                                                                            />
                                                                                            <span>-</span>
                                                                                            <Input 
                                                                                                type="time" 
                                                                                                value={brk.end_time}
                                                                                                onChange={e => updateBreak(range.id, day.date, brkIdx, 'end_time', e.target.value)}
                                                                                                className="h-5 w-16 text-xs px-1"
                                                                                            />
                                                                                            <X 
                                                                                                className="w-3 h-3 text-red-500 cursor-pointer"
                                                                                                onClick={() => removeBreak(range.id, day.date, brkIdx)}
                                                                                            />
                                                                                        </div>
                                                                                    ))}
                                                                                    <Button 
                                                                                        type="button" 
                                                                                        variant="ghost" 
                                                                                        size="sm"
                                                                                        className="h-5 text-xs px-1"
                                                                                        onClick={() => addBreak(range.id, day.date)}
                                                                                    >
                                                                                        <Plus className="w-3 h-3" />
                                                                                    </Button>
                                                                                </div>

                                                                                {/* Participants */}
                                                                                <div className="space-y-1">
                                                                                    {day.participants.map((p) => {
                                                                                        const duration = calculateDuration(p.start_time, p.end_time, day.breaks);
                                                                                        return (
                                                                                            <div key={p.pegawai_id} className={`flex items-center gap-2 p-1 rounded ${
                                                                                                p.attending ? 'bg-white border' : 'bg-slate-100 opacity-50'
                                                                                            }`}>
                                                                                                <Checkbox 
                                                                                                    checked={p.attending}
                                                                                                    onCheckedChange={(checked) => updateParticipant(range.id, day.date, p.pegawai_id, 'attending', checked)}
                                                                                                    className="h-3 w-3"
                                                                                                />
                                                                                                <span className="flex-1 truncate">{p.nama_lengkap}</span>
                                                                                                {p.attending && (
                                                                                                    <>
                                                                                                        <Input 
                                                                                                            type="time" 
                                                                                                            value={p.start_time}
                                                                                                            onChange={e => updateParticipant(range.id, day.date, p.pegawai_id, 'start_time', e.target.value)}
                                                                                                            className="h-5 w-16 text-xs"
                                                                                                        />
                                                                                                        <span>-</span>
                                                                                                        <Input 
                                                                                                            type="time" 
                                                                                                            value={p.end_time}
                                                                                                            onChange={e => updateParticipant(range.id, day.date, p.pegawai_id, 'end_time', e.target.value)}
                                                                                                            className="h-5 w-16 text-xs"
                                                                                                        />
                                                                                                        <Badge variant="outline" className="text-[10px]">
                                                                                                            {duration}j
                                                                                                        </Badge>
                                                                                                    </>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                                
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="text-xs w-full"
                                                                                    onClick={() => copyDayConfig(range.id, day.date)}
                                                                                >
                                                                                    <Copy className="w-3 h-3 mr-1" /> Salin ke Hari Lain
                                                                                </Button>
                                                                            </div>
                                                                        </CollapsibleContent>
                                                                    </Collapsible>
                                                                );
                                                            })}
                                                        </div>
                                                    </>
                                                )}

                                                {range.daysConfig.length === 0 && (
                                                    <div className="text-center py-4 text-slate-400 text-xs">
                                                        {selectedPegawai.length === 0 
                                                            ? "Pilih peserta terlebih dahulu"
                                                            : "Pilih tanggal untuk generate konfigurasi"
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        </CollapsibleContent>
                                    </div>
                                </Collapsible>
                            ))}
                        </div>
                    </div>

                    {/* Summary */}
                    {summary.totalDays > 0 && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <Label className="text-xs font-medium text-green-800 mb-2 block">Ringkasan</Label>
                            <div className="grid grid-cols-4 gap-4 text-center">
                                <div>
                                    <div className="text-xl font-bold text-green-700">{summary.totalRanges}</div>
                                    <div className="text-xs text-green-600">Rentang</div>
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-green-700">{summary.totalDays}</div>
                                    <div className="text-xs text-green-600">Hari Aktif</div>
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-green-700">{summary.attendanceCount}</div>
                                    <div className="text-xs text-green-600">Kehadiran</div>
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-green-700">{summary.totalHours}</div>
                                    <div className="text-xs text-green-600">Total Jam</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Submit */}
                    <div className="flex justify-end pt-4 border-t">
                        <Button 
                            type="submit" 
                            disabled={loading || selectedPegawai.length === 0 || summary.totalDays === 0}
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
