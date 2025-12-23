import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Plus, Trash, Edit, Loader2, CreditCard, Building, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';

export default function BankManager() {
    const [banks, setBanks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Form states
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBank, setEditingBank] = useState(null);
    const [formData, setFormData] = useState({ nama_bank: '', kode_bank: '', jumlah_digit: '' });

    useEffect(() => {
        fetchBanks();
    }, []);

    const fetchBanks = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/settings/banks');
            setBanks(res.data);
        } catch (e) {
            toast.error("Gagal memuat daftar bank");
        } finally {
            setLoading(false);
        }
    };

    const openDialog = (bank = null) => {
        if (bank) {
            setEditingBank(bank);
            setFormData({ 
                nama_bank: bank.nama_bank, 
                kode_bank: bank.kode_bank || '',
                jumlah_digit: bank.jumlah_digit || ''
            });
        } else {
            setEditingBank(null);
            setFormData({ nama_bank: '', kode_bank: '', jumlah_digit: '' });
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.nama_bank.trim()) {
            toast.error("Nama bank tidak boleh kosong");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                nama_bank: formData.nama_bank,
                kode_bank: formData.kode_bank,
                jumlah_digit: formData.jumlah_digit ? parseInt(formData.jumlah_digit) : null
            };
            
            if (editingBank) {
                await api.put(`/api/settings/banks/${editingBank.id}`, payload);
                toast.success("Bank berhasil diperbarui");
            } else {
                await api.post('/api/settings/banks', payload);
                toast.success("Bank berhasil ditambahkan");
            }
            setIsDialogOpen(false);
            fetchBanks();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Gagal menyimpan bank");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (bank) => {
        if (bank.is_default) {
            toast.error("Bank default tidak dapat dihapus");
            return;
        }
        
        if (!window.confirm(`Hapus bank "${bank.nama_bank}"?`)) return;
        
        try {
            await api.delete(`/api/settings/banks/${bank.id}`);
            toast.success("Bank berhasil dihapus");
            fetchBanks();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Gagal menghapus bank");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="animate-spin h-6 w-6 text-blue-600 mr-2" />
                <span className="text-slate-500">Memuat daftar bank...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg text-green-700">
                        <CreditCard size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">Manajemen Bank</h3>
                        <p className="text-xs text-slate-500">
                            Kelola daftar bank untuk rekening pegawai. Data ini akan otomatis tersinkron dengan template import Excel.
                        </p>
                    </div>
                </div>
                <Button onClick={() => openDialog()} className="bg-green-600 hover:bg-green-700">
                    <Plus size={16} className="mr-2" /> Tambah Bank
                </Button>
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                <strong>Info:</strong> Bank yang ditambahkan akan otomatis muncul di:
                <ul className="mt-1 list-disc list-inside">
                    <li>Dropdown "Nama Bank" di form Pegawai</li>
                    <li>Pilihan dropdown di Template Import Excel</li>
                    <li>Sheet "Referensi Data" di Template Excel</li>
                </ul>
            </div>

            {/* Table */}
            <Card className="border-slate-200">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-12">No</TableHead>
                                <TableHead>Nama Bank</TableHead>
                                <TableHead>Kode Bank</TableHead>
                                <TableHead className="w-24">Jumlah Digit</TableHead>
                                <TableHead className="w-24">Tipe</TableHead>
                                <TableHead className="text-right w-32">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {banks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                        <Building className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                                        Belum ada data bank
                                    </TableCell>
                                </TableRow>
                            ) : (
                                banks.map((bank, index) => (
                                    <TableRow key={bank.id}>
                                        <TableCell className="font-medium">{index + 1}</TableCell>
                                        <TableCell className="font-medium">{bank.nama_bank}</TableCell>
                                        <TableCell className="text-slate-500 font-mono text-sm">
                                            {bank.kode_bank || '-'}
                                        </TableCell>
                                        <TableCell className="text-slate-600 font-mono text-sm">
                                            {bank.jumlah_digit ? `${bank.jumlah_digit} digit` : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {bank.is_default ? (
                                                <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600">
                                                    <Lock size={10} className="mr-1" /> Default
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] text-green-600 border-green-200">
                                                    Custom
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-1 justify-end">
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    onClick={() => openDialog(bank)}
                                                    className="text-blue-600 hover:bg-blue-50 h-8 w-8 p-0"
                                                >
                                                    <Edit size={14} />
                                                </Button>
                                                {!bank.is_default && (
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost" 
                                                        onClick={() => handleDelete(bank)}
                                                        className="text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                                                    >
                                                        <Trash size={14} />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-green-600" />
                            {editingBank ? 'Edit Bank' : 'Tambah Bank Baru'}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nama Bank <span className="text-red-500">*</span></Label>
                            <Input 
                                value={formData.nama_bank}
                                onChange={(e) => setFormData({...formData, nama_bank: e.target.value})}
                                placeholder="Contoh: Bank ABC"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Kode Bank (Opsional)</Label>
                            <Input 
                                value={formData.kode_bank}
                                onChange={(e) => setFormData({...formData, kode_bank: e.target.value})}
                                placeholder="Contoh: 014"
                            />
                            <p className="text-[10px] text-slate-500">
                                Kode bank dari Bank Indonesia (3 digit)
                            </p>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Jumlah Digit Rekening</Label>
                            <Input 
                                type="number"
                                min="1"
                                max="30"
                                value={formData.jumlah_digit}
                                onChange={(e) => setFormData({...formData, jumlah_digit: e.target.value})}
                                placeholder="Contoh: 10"
                            />
                            <p className="text-[10px] text-slate-500">
                                Jumlah digit standar untuk no rekening bank ini. Digunakan untuk validasi input pegawai.
                            </p>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
                                {saving ? (
                                    <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Menyimpan...</>
                                ) : (
                                    editingBank ? 'Simpan Perubahan' : 'Tambah Bank'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
