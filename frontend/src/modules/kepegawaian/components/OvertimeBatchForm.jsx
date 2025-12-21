import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Users, Calendar, Clock, FileText, Send, Search, X, CheckCircle } from 'lucide-react';
import api from '../../../api/axios';

const OvertimeBatchForm = ({ onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [pegawaiList, setPegawaiList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPegawai, setSelectedPegawai] = useState([]);
    
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        is_holiday: false,
        start_time: '17:00',
        end_time: '20:00',
        description: '',
        participant_ids: []
    });

    useEffect(() => {
        fetchPegawai();
    }, []);

    const fetchPegawai = async () => {
        try {
            const res = await api.get('/api/pegawai');
            setPegawaiList(res.data);
        } catch (e) {
            toast.error("Gagal memuat data pegawai");
        }
    };

    const filteredPegawai = pegawaiList.filter(p => {
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

    const selectAll = () => {
        setSelectedPegawai(filteredPegawai);
    };

    const clearAll = () => {
        setSelectedPegawai([]);
    };

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

        setLoading(true);
        try {
            const payload = {
                ...formData,
                participant_ids: selectedPegawai.map(p => p.id)
            };
            
            const res = await api.post('/api/kepegawaian/overtime/batch', payload);
            toast.success(res.data.message);
            
            // Reset form
            setSelectedPegawai([]);
            setFormData({
                date: new Date().toISOString().split('T')[0],
                is_holiday: false,
                start_time: '17:00',
                end_time: '20:00',
                description: '',
                participant_ids: []
            });
            
            if (onSuccess) onSuccess();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Gagal membuat lembur");
        } finally {
            setLoading(false);
        }
    };

    // Calculate duration
    const calculateDuration = () => {
        try {
            const [h1, m1] = formData.start_time.split(':').map(Number);
            const [h2, m2] = formData.end_time.split(':').map(Number);
            let start = h1 * 60 + m1;
            let end = h2 * 60 + m2;
            if (end < start) end += 24 * 60;
            const diff = (end - start) / 60;
            return diff.toFixed(1);
        } catch {
            return '0';
        }
    };

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Buat Pengajuan Lembur Baru
                </CardTitle>
                <CardDescription className="text-xs">
                    Pilih pegawai yang akan dimasukkan ke dalam SPL dan isi detail kegiatan lembur
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Date & Time Section */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium">Tanggal Lembur</Label>
                            <Input 
                                type="date" 
                                value={formData.date}
                                onChange={e => setFormData({...formData, date: e.target.value})}
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium">Jam Mulai</Label>
                            <Input 
                                type="time" 
                                value={formData.start_time}
                                onChange={e => setFormData({...formData, start_time: e.target.value})}
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium">Jam Selesai</Label>
                            <Input 
                                type="time" 
                                value={formData.end_time}
                                onChange={e => setFormData({...formData, end_time: e.target.value})}
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium">Durasi</Label>
                            <div className="h-9 flex items-center px-3 bg-slate-100 rounded-md text-sm font-medium">
                                {calculateDuration()} jam
                            </div>
                        </div>
                    </div>

                    {/* Holiday Checkbox */}
                    <div className="flex items-center space-x-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <Checkbox 
                            id="is_holiday"
                            checked={formData.is_holiday}
                            onCheckedChange={checked => setFormData({...formData, is_holiday: checked})}
                        />
                        <Label htmlFor="is_holiday" className="cursor-pointer text-sm">
                            Lembur dilakukan pada <strong>Hari Libur / Weekend</strong>
                        </Label>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label className="text-xs font-medium">Deskripsi Kegiatan Lembur</Label>
                        <Textarea 
                            placeholder="Jelaskan kegiatan lembur yang dilakukan..."
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            rows={3}
                        />
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

                        {/* Selected Pegawai Tags */}
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

                        {/* Search */}
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input 
                                placeholder="Cari pegawai berdasarkan nama, NIP, atau jabatan..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>

                        {/* Pegawai List */}
                        <div className="border rounded-lg max-h-[300px] overflow-y-auto">
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
                                                className={`flex items-center p-3 cursor-pointer transition-colors ${
                                                    isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                                                }`}
                                                onClick={() => togglePegawai(pegawai)}
                                            >
                                                <div className="w-6 h-6 flex items-center justify-center mr-3">
                                                    {isSelected ? (
                                                        <CheckCircle className="w-5 h-5 text-blue-600" />
                                                    ) : (
                                                        <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm">{pegawai.nama_lengkap}</div>
                                                    <div className="text-xs text-slate-500 flex gap-3">
                                                        <span>{pegawai.nip || '-'}</span>
                                                        <span>•</span>
                                                        <span>{pegawai.jabatan || '-'}</span>
                                                        <span>•</span>
                                                        <span className={pegawai.status_kepegawaian === 'PNS' ? 'text-blue-600' : 'text-orange-600'}>
                                                            {pegawai.status_kepegawaian || 'Non-ASN'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end pt-4 border-t">
                        <Button 
                            type="submit" 
                            disabled={loading || selectedPegawai.length === 0}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Send className="w-4 h-4 mr-2" />
                            {loading ? "Menyimpan..." : `Ajukan Lembur (${selectedPegawai.length} orang)`}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};

export default OvertimeBatchForm;
