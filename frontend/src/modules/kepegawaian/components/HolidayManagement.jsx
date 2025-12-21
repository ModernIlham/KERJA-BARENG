import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Calendar, RefreshCw, Upload } from 'lucide-react';
import api from '../../../api/axios';

const HolidayManagement = () => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState(null);
    
    const [formData, setFormData] = useState({
        date: '',
        name: '',
        description: '',
        is_national: true,
        is_cuti_nasional: false
    });

    const years = Array.from({ length: 5 }, (_, i) => ({
        value: String(new Date().getFullYear() - 1 + i),
        label: String(new Date().getFullYear() - 1 + i)
    }));

    useEffect(() => {
        fetchHolidays();
    }, [selectedYear]);

    const fetchHolidays = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/kepegawaian/holidays?year=${selectedYear}`);
            setHolidays(res.data);
        } catch (e) {
            toast.error("Gagal memuat data hari libur");
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!formData.date || !formData.name) {
            toast.error("Tanggal dan nama harus diisi");
            return;
        }

        try {
            await api.post('/api/kepegawaian/holidays', formData);
            toast.success("Hari libur berhasil ditambahkan");
            setIsAddDialogOpen(false);
            setFormData({ date: '', name: '', description: '', is_national: true, is_cuti_nasional: false });
            fetchHolidays();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Gagal menambahkan hari libur");
        }
    };

    const handleEdit = async () => {
        if (!editingHoliday) return;

        try {
            await api.put(`/api/kepegawaian/holidays/${editingHoliday.id}`, formData);
            toast.success("Hari libur berhasil diupdate");
            setIsEditDialogOpen(false);
            setEditingHoliday(null);
            setFormData({ date: '', name: '', description: '', is_national: true, is_cuti_nasional: false });
            fetchHolidays();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Gagal mengupdate hari libur");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Yakin ingin menghapus hari libur ini?")) return;

        try {
            await api.delete(`/api/kepegawaian/holidays/${id}`);
            toast.success("Hari libur berhasil dihapus");
            fetchHolidays();
        } catch (e) {
            toast.error("Gagal menghapus hari libur");
        }
    };

    const openEditDialog = (holiday) => {
        setEditingHoliday(holiday);
        setFormData({
            date: holiday.date,
            name: holiday.name,
            description: holiday.description || '',
            is_national: holiday.is_national !== false,
            is_cuti_nasional: holiday.is_cuti_nasional === true
        });
        setIsEditDialogOpen(true);
    };

    const handleBulkImport = async () => {
        // Dynamic national holidays based on selected year
        // Note: Some dates are approximate for Islamic/Lunar holidays
        const year = parseInt(selectedYear);
        
        // Fixed holidays (same date every year)
        const fixedHolidays = [
            { month: "01", day: "01", name: "Tahun Baru Masehi" },
            { month: "05", day: "01", name: "Hari Buruh Internasional" },
            { month: "06", day: "01", name: "Hari Lahir Pancasila" },
            { month: "08", day: "17", name: "Hari Kemerdekaan RI" },
            { month: "12", day: "25", name: "Hari Raya Natal" },
        ];

        // Variable holidays by year (Islamic, Lunar, Hindu calendars)
        const variableHolidaysByYear = {
            2024: [
                { date: "2024-02-08", name: "Isra Mi'raj Nabi Muhammad SAW" },
                { date: "2024-02-10", name: "Tahun Baru Imlek" },
                { date: "2024-03-11", name: "Hari Raya Nyepi" },
                { date: "2024-03-29", name: "Wafat Isa Al-Masih" },
                { date: "2024-04-10", name: "Hari Raya Idul Fitri" },
                { date: "2024-04-11", name: "Hari Raya Idul Fitri" },
                { date: "2024-05-09", name: "Kenaikan Isa Al-Masih" },
                { date: "2024-05-23", name: "Hari Raya Waisak" },
                { date: "2024-06-17", name: "Hari Raya Idul Adha" },
                { date: "2024-07-07", name: "Tahun Baru Islam 1446 H" },
                { date: "2024-09-16", name: "Maulid Nabi Muhammad SAW" },
            ],
            2025: [
                { date: "2025-01-29", name: "Tahun Baru Imlek" },
                { date: "2025-03-29", name: "Hari Raya Nyepi" },
                { date: "2025-03-31", name: "Hari Raya Idul Fitri" },
                { date: "2025-04-01", name: "Hari Raya Idul Fitri" },
                { date: "2025-04-18", name: "Wafat Isa Al-Masih" },
                { date: "2025-05-12", name: "Hari Raya Waisak" },
                { date: "2025-05-29", name: "Kenaikan Isa Al-Masih" },
                { date: "2025-06-07", name: "Hari Raya Idul Adha" },
                { date: "2025-06-27", name: "Tahun Baru Islam 1447 H" },
                { date: "2025-09-05", name: "Maulid Nabi Muhammad SAW" },
            ],
            2026: [
                { date: "2026-02-17", name: "Tahun Baru Imlek" },
                { date: "2026-03-19", name: "Hari Raya Nyepi" },
                { date: "2026-03-20", name: "Hari Raya Idul Fitri" },
                { date: "2026-03-21", name: "Hari Raya Idul Fitri" },
                { date: "2026-04-03", name: "Wafat Isa Al-Masih" },
                { date: "2026-05-14", name: "Kenaikan Isa Al-Masih" },
                { date: "2026-05-31", name: "Hari Raya Waisak" },
                { date: "2026-05-27", name: "Hari Raya Idul Adha" },
                { date: "2026-06-17", name: "Tahun Baru Islam 1448 H" },
                { date: "2026-08-26", name: "Maulid Nabi Muhammad SAW" },
            ],
            2027: [
                { date: "2027-02-06", name: "Tahun Baru Imlek" },
                { date: "2027-03-09", name: "Hari Raya Idul Fitri" },
                { date: "2027-03-10", name: "Hari Raya Idul Fitri" },
                { date: "2027-03-26", name: "Wafat Isa Al-Masih" },
                { date: "2027-04-07", name: "Hari Raya Nyepi" },
                { date: "2027-05-06", name: "Kenaikan Isa Al-Masih" },
                { date: "2027-05-16", name: "Hari Raya Idul Adha" },
                { date: "2027-05-20", name: "Hari Raya Waisak" },
                { date: "2027-06-06", name: "Tahun Baru Islam 1449 H" },
                { date: "2027-08-15", name: "Maulid Nabi Muhammad SAW" },
            ],
            2028: [
                { date: "2028-01-26", name: "Tahun Baru Imlek" },
                { date: "2028-02-26", name: "Hari Raya Idul Fitri" },
                { date: "2028-02-27", name: "Hari Raya Idul Fitri" },
                { date: "2028-03-26", name: "Hari Raya Nyepi" },
                { date: "2028-04-14", name: "Wafat Isa Al-Masih" },
                { date: "2028-05-04", name: "Hari Raya Idul Adha" },
                { date: "2028-05-09", name: "Hari Raya Waisak" },
                { date: "2028-05-25", name: "Kenaikan Isa Al-Masih" },
                { date: "2028-05-25", name: "Tahun Baru Islam 1450 H" },
                { date: "2028-08-03", name: "Maulid Nabi Muhammad SAW" },
            ],
        };

        // Build holiday list for selected year
        const nationalHolidays = [];
        
        // Add fixed holidays
        fixedHolidays.forEach(h => {
            nationalHolidays.push({
                date: `${year}-${h.month}-${h.day}`,
                name: h.name,
                is_national: true
            });
        });

        // Add variable holidays if available for the year
        if (variableHolidaysByYear[year]) {
            variableHolidaysByYear[year].forEach(h => {
                nationalHolidays.push({
                    date: h.date,
                    name: h.name,
                    is_national: true
                });
            });
        } else {
            toast.warning(`Data hari libur variabel untuk tahun ${year} belum tersedia. Hanya hari libur tetap yang akan diimport.`);
        }

        try {
            const res = await api.post('/api/kepegawaian/holidays/bulk', nationalHolidays);
            toast.success(`${res.data.created} hari libur berhasil ditambahkan untuk tahun ${year}`);
            if (res.data.skipped > 0) {
                toast.info(`${res.data.skipped} sudah ada/dilewati`);
            }
            fetchHolidays();
        } catch (e) {
            toast.error("Gagal import hari libur");
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
    };

    const groupByMonth = (holidays) => {
        const grouped = {};
        holidays.forEach(h => {
            const month = h.date.substring(0, 7); // YYYY-MM
            if (!grouped[month]) grouped[month] = [];
            grouped[month].push(h);
        });
        return grouped;
    };

    const monthNames = {
        '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
        '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
        '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember'
    };

    const grouped = groupByMonth(holidays);

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Manajemen Hari Libur
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                        Kelola hari libur nasional dan cuti bersama yang akan ditandai di tabel Dafnom
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-24 h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(y => (
                                <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={fetchHolidays}>
                        <RefreshCw size={16} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                {/* Action Buttons */}
                <div className="flex gap-2 mb-4">
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                                <Plus className="w-4 h-4 mr-2" /> Tambah Hari Libur
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Tambah Hari Libur Baru</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Tanggal</Label>
                                    <Input 
                                        type="date" 
                                        value={formData.date}
                                        onChange={e => setFormData({...formData, date: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nama Hari Libur</Label>
                                    <Input 
                                        placeholder="Contoh: Hari Raya Idul Fitri"
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Keterangan (Opsional)</Label>
                                    <Input 
                                        placeholder="Keterangan tambahan..."
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="is_national"
                                        checked={formData.is_national}
                                        onCheckedChange={checked => setFormData({...formData, is_national: checked, is_cuti_nasional: false})}
                                    />
                                    <Label htmlFor="is_national" className="cursor-pointer">Hari Libur Nasional</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="is_cuti_nasional"
                                        checked={formData.is_cuti_nasional}
                                        onCheckedChange={checked => setFormData({...formData, is_cuti_nasional: checked, is_national: !checked})}
                                    />
                                    <Label htmlFor="is_cuti_nasional" className="cursor-pointer">Cuti Nasional (Warna Pudar)</Label>
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline">Batal</Button>
                                </DialogClose>
                                <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    Simpan
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button size="sm" variant="outline" onClick={handleBulkImport}>
                        <Upload className="w-4 h-4 mr-2" /> Import Libur Nasional {selectedYear}
                    </Button>
                </div>

                {/* Info Box */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-xs text-yellow-800">
                    <strong>Info:</strong> Hari Sabtu dan Minggu otomatis ditandai sebagai libur di tabel Dafnom. 
                    Gunakan fitur ini untuk menambahkan hari libur nasional atau cuti bersama tambahan.
                </div>

                {/* Holiday List */}
                {loading ? (
                    <div className="text-center py-8 text-slate-500">Memuat...</div>
                ) : holidays.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        Belum ada hari libur yang ditambahkan untuk tahun {selectedYear}
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto">
                        {Object.entries(grouped).map(([month, items]) => (
                            <div key={month} className="border rounded-lg overflow-hidden">
                                <div className="bg-slate-100 px-3 py-2 font-semibold text-sm">
                                    {monthNames[month.split('-')[1]]} {month.split('-')[0]}
                                </div>
                                <div className="divide-y">
                                    {items.map(holiday => (
                                        <div key={holiday.id} className="flex items-center justify-between px-3 py-2 hover:bg-slate-50">
                                            <div className="flex-1">
                                                <div className="font-medium text-sm">{holiday.name}</div>
                                                <div className="text-xs text-slate-500">
                                                    {formatDate(holiday.date)}
                                                    {holiday.is_cuti_nasional ? (
                                                        <span className="ml-2 px-1.5 py-0.5 bg-red-50 text-red-400 rounded text-[10px]">
                                                            Cuti Nasional
                                                        </span>
                                                    ) : holiday.is_national && (
                                                        <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px]">
                                                            Nasional
                                                        </span>
                                                    )}
                                                </div>
                                                {holiday.description && (
                                                    <div className="text-xs text-slate-400 mt-0.5">{holiday.description}</div>
                                                )}
                                            </div>
                                            <div className="flex gap-1">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8"
                                                    onClick={() => openEditDialog(holiday)}
                                                >
                                                    <Edit2 size={14} />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleDelete(holiday.id)}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Edit Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Hari Libur</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Tanggal</Label>
                                <Input 
                                    type="date" 
                                    value={formData.date}
                                    onChange={e => setFormData({...formData, date: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Nama Hari Libur</Label>
                                <Input 
                                    placeholder="Contoh: Hari Raya Idul Fitri"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Keterangan (Opsional)</Label>
                                <Input 
                                    placeholder="Keterangan tambahan..."
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="is_national_edit"
                                    checked={formData.is_national}
                                    onCheckedChange={checked => setFormData({...formData, is_national: checked, is_cuti_nasional: false})}
                                />
                                <Label htmlFor="is_national_edit" className="cursor-pointer">Hari Libur Nasional</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="is_cuti_nasional_edit"
                                    checked={formData.is_cuti_nasional}
                                    onCheckedChange={checked => setFormData({...formData, is_cuti_nasional: checked, is_national: !checked})}
                                />
                                <Label htmlFor="is_cuti_nasional_edit" className="cursor-pointer">Cuti Nasional (Warna Pudar)</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Batal</Button>
                            </DialogClose>
                            <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700 text-white">
                                Update
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
};

export default HolidayManagement;
