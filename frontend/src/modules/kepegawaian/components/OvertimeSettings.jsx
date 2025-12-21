import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, RefreshCw, DollarSign, Calendar, Trash2, AlertTriangle, Users, Clock, Database } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import api from '../../../api/axios';
import { formatCurrency } from '../../../lib/utils';
import HolidayManagement from './HolidayManagement';

const OvertimeSettings = () => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('tarif');
    
    // Reset states
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [resetType, setResetType] = useState(null);
    const [confirmText, setConfirmText] = useState('');
    const [resetting, setResetting] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/api/kepegawaian/settings');
            setSettings(res.data);
        } catch (e) {
            toast.error("Gagal memuat pengaturan");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put('/api/kepegawaian/settings', settings);
            toast.success("Pengaturan berhasil disimpan");
        } catch (e) {
            toast.error("Gagal menyimpan");
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field, value) => {
        setSettings(prev => ({ ...prev, [field]: parseFloat(value) }));
    };

    // Reset data handlers
    const resetConfig = {
        overtime: {
            title: 'Reset Data Lembur',
            description: 'Hapus semua data pengajuan lembur, SPL batch, dan data absensi. Data tarif dan hari libur tidak akan dihapus.',
            endpoint: '/api/kepegawaian/reset/overtime',
            icon: Clock,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
            borderColor: 'border-orange-200'
        },
        employees: {
            title: 'Reset Data Pegawai',
            description: 'Hapus semua data pegawai dari database. Perhatian: Ini akan menghapus semua pegawai yang terdaftar!',
            endpoint: '/api/kepegawaian/reset/employees',
            icon: Users,
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200'
        },
        all: {
            title: 'Reset Total Semua Data',
            description: 'Hapus SEMUA data kepegawaian termasuk pegawai, lembur, absensi, dan hari libur kustom. Hanya pengaturan tarif yang dipertahankan.',
            endpoint: '/api/kepegawaian/reset/all',
            icon: Database,
            color: 'text-red-700',
            bgColor: 'bg-red-100',
            borderColor: 'border-red-300'
        }
    };

    const openResetDialog = (type) => {
        setResetType(type);
        setConfirmText('');
        setResetDialogOpen(true);
    };

    const handleReset = async () => {
        if (confirmText !== 'CONFIRM') {
            toast.error('Ketik "CONFIRM" untuk melanjutkan');
            return;
        }

        setResetting(true);
        const t = toast.loading('Menghapus data...');

        try {
            const config = resetConfig[resetType];
            const res = await api.delete(config.endpoint, {
                data: { confirm: 'CONFIRM' }
            });
            
            toast.success(res.data.message, { id: t });
            setResetDialogOpen(false);
            setConfirmText('');
            
            // Show deleted counts
            if (res.data.deleted) {
                const counts = Object.entries(res.data.deleted)
                    .map(([key, val]) => `${key}: ${val}`)
                    .join(', ');
                toast.info(`Data dihapus: ${counts}`);
            }
        } catch (e) {
            const errorMsg = e.response?.data?.detail || 'Gagal menghapus data';
            toast.error(errorMsg, { id: t });
        } finally {
            setResetting(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full md:w-[500px] grid-cols-3">
                <TabsTrigger value="tarif" className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Tarif Lembur
                </TabsTrigger>
                <TabsTrigger value="libur" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Hari Libur
                </TabsTrigger>
                <TabsTrigger value="reset" className="flex items-center gap-2 text-red-600">
                    <Trash2 className="w-4 h-4" /> Reset Data
                </TabsTrigger>
            </TabsList>

            <TabsContent value="tarif">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                        <CardTitle className="text-base font-bold">Pengaturan Tarif Lembur (Dinamis)</CardTitle>
                        <Button variant="ghost" size="icon" onClick={fetchSettings}><RefreshCw size={16}/></Button>
                    </CardHeader>
                    <CardContent className="pt-4 h-[600px] overflow-y-auto">
                        <form onSubmit={handleSave} className="space-y-6">
                            {/* ASN SECTION */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-blue-700 uppercase border-b pb-1">Tarif ASN (Per Jam)</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Golongan I</Label>
                                        <Input type="number" value={settings.rate_asn_gol_1} onChange={e => handleChange('rate_asn_gol_1', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Golongan II</Label>
                                        <Input type="number" value={settings.rate_asn_gol_2} onChange={e => handleChange('rate_asn_gol_2', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Golongan III</Label>
                                        <Input type="number" value={settings.rate_asn_gol_3} onChange={e => handleChange('rate_asn_gol_3', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Golongan IV</Label>
                                        <Input type="number" value={settings.rate_asn_gol_4} onChange={e => handleChange('rate_asn_gol_4', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            {/* NON ASN SECTION (UPDATED) */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-orange-700 uppercase border-b pb-1">Tarif Non ASN (Per Jam) - Kategori Independen</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-xs">PPNPN (Umum)</Label>
                                        <Input type="number" value={settings.rate_non_asn_ppnpn} onChange={e => handleChange('rate_non_asn_ppnpn', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Satpam</Label>
                                        <Input type="number" value={settings.rate_non_asn_satpam} onChange={e => handleChange('rate_non_asn_satpam', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Supir</Label>
                                        <Input type="number" value={settings.rate_non_asn_supir} onChange={e => handleChange('rate_non_asn_supir', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Pramubakti</Label>
                                        <Input type="number" value={settings.rate_non_asn_pramubakti} onChange={e => handleChange('rate_non_asn_pramubakti', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Konsultan Individu</Label>
                                        <Input type="number" value={settings.rate_non_asn_konsultan} onChange={e => handleChange('rate_non_asn_konsultan', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Tenaga Ahli</Label>
                                        <Input type="number" value={settings.rate_non_asn_tenaga_ahli} onChange={e => handleChange('rate_non_asn_tenaga_ahli', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Teknisi</Label>
                                        <Input type="number" value={settings.rate_non_asn_teknisi} onChange={e => handleChange('rate_non_asn_teknisi', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            {/* UANG MAKAN SECTION */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-green-700 uppercase border-b pb-1">Uang Makan (Per Hari/Kejadian)</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-xs">ASN Gol I & II</Label>
                                        <Input type="number" value={settings.meal_asn_gol_1_2} onChange={e => handleChange('meal_asn_gol_1_2', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">ASN Gol III</Label>
                                        <Input type="number" value={settings.meal_asn_gol_3} onChange={e => handleChange('meal_asn_gol_3', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">ASN Gol IV</Label>
                                        <Input type="number" value={settings.meal_asn_gol_4} onChange={e => handleChange('meal_asn_gol_4', e.target.value)} />
                                    </div>
                                </div>
                                
                                <h4 className="text-xs font-semibold text-green-600 mt-2">Non-ASN Meal Rates</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">PPNPN (Umum)</Label>
                                        <Input type="number" className="h-8" value={settings.meal_non_asn_ppnpn} onChange={e => handleChange('meal_non_asn_ppnpn', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">Satpam</Label>
                                        <Input type="number" className="h-8" value={settings.meal_non_asn_satpam} onChange={e => handleChange('meal_non_asn_satpam', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">Supir</Label>
                                        <Input type="number" className="h-8" value={settings.meal_non_asn_supir} onChange={e => handleChange('meal_non_asn_supir', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">Pramubakti</Label>
                                        <Input type="number" className="h-8" value={settings.meal_non_asn_pramubakti} onChange={e => handleChange('meal_non_asn_pramubakti', e.target.value)} />
                                    </div>
                                </div>
                                
                                <p className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded mt-2">
                                    *Uang makan diberikan jika jam lembur minimal 2 jam.
                                </p>
                            </div>

                            {/* POTONGAN PPH SECTION */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-red-700 uppercase border-b pb-1">Potongan PPH (Persentase)</h3>
                                
                                <h4 className="text-xs font-semibold text-red-600">Tarif PPH ASN per Golongan</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Golongan I</Label>
                                        <div className="flex items-center gap-1">
                                            <Input 
                                                type="number" 
                                                step="0.01"
                                                value={(settings.tax_asn_gol_1 || 0) * 100} 
                                                onChange={e => handleChange('tax_asn_gol_1', parseFloat(e.target.value) / 100)} 
                                            />
                                            <span className="text-xs text-slate-500">%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Golongan II</Label>
                                        <div className="flex items-center gap-1">
                                            <Input 
                                                type="number" 
                                                step="0.01"
                                                value={(settings.tax_asn_gol_2 || 0) * 100} 
                                                onChange={e => handleChange('tax_asn_gol_2', parseFloat(e.target.value) / 100)} 
                                            />
                                            <span className="text-xs text-slate-500">%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Golongan III</Label>
                                        <div className="flex items-center gap-1">
                                            <Input 
                                                type="number" 
                                                step="0.01"
                                                value={(settings.tax_asn_gol_3 || 0) * 100} 
                                                onChange={e => handleChange('tax_asn_gol_3', parseFloat(e.target.value) / 100)} 
                                            />
                                            <span className="text-xs text-slate-500">%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Golongan IV</Label>
                                        <div className="flex items-center gap-1">
                                            <Input 
                                                type="number" 
                                                step="0.01"
                                                value={(settings.tax_asn_gol_4 || 0) * 100} 
                                                onChange={e => handleChange('tax_asn_gol_4', parseFloat(e.target.value) / 100)} 
                                            />
                                            <span className="text-xs text-slate-500">%</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <h4 className="text-xs font-semibold text-red-600 mt-3">Tarif PPH Non-ASN per Kategori</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">PPNPN (Umum)</Label>
                                        <div className="flex items-center gap-1">
                                            <Input 
                                                type="number" 
                                                step="0.01"
                                                className="h-8"
                                                value={(settings.tax_non_asn_ppnpn || 0) * 100} 
                                                onChange={e => handleChange('tax_non_asn_ppnpn', parseFloat(e.target.value) / 100)} 
                                            />
                                            <span className="text-xs text-slate-500">%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">Satpam</Label>
                                        <div className="flex items-center gap-1">
                                            <Input 
                                                type="number" 
                                                step="0.01"
                                                className="h-8"
                                                value={(settings.tax_non_asn_satpam || 0) * 100} 
                                                onChange={e => handleChange('tax_non_asn_satpam', parseFloat(e.target.value) / 100)} 
                                            />
                                            <span className="text-xs text-slate-500">%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">Supir</Label>
                                        <div className="flex items-center gap-1">
                                            <Input 
                                                type="number" 
                                                step="0.01"
                                                className="h-8"
                                                value={(settings.tax_non_asn_supir || 0) * 100} 
                                                onChange={e => handleChange('tax_non_asn_supir', parseFloat(e.target.value) / 100)} 
                                            />
                                            <span className="text-xs text-slate-500">%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">Pramubakti</Label>
                                        <div className="flex items-center gap-1">
                                            <Input 
                                                type="number" 
                                                step="0.01"
                                                className="h-8"
                                                value={(settings.tax_non_asn_pramubakti || 0) * 100} 
                                                onChange={e => handleChange('tax_non_asn_pramubakti', parseFloat(e.target.value) / 100)} 
                                            />
                                            <span className="text-xs text-slate-500">%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">Konsultan</Label>
                                        <div className="flex items-center gap-1">
                                            <Input 
                                                type="number" 
                                                step="0.01"
                                                className="h-8"
                                                value={(settings.tax_non_asn_konsultan || 0) * 100} 
                                                onChange={e => handleChange('tax_non_asn_konsultan', parseFloat(e.target.value) / 100)} 
                                            />
                                            <span className="text-xs text-slate-500">%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">Tenaga Ahli</Label>
                                        <div className="flex items-center gap-1">
                                            <Input 
                                                type="number" 
                                                step="0.01"
                                                className="h-8"
                                                value={(settings.tax_non_asn_tenaga_ahli || 0) * 100} 
                                                onChange={e => handleChange('tax_non_asn_tenaga_ahli', parseFloat(e.target.value) / 100)} 
                                            />
                                            <span className="text-xs text-slate-500">%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">Teknisi</Label>
                                        <div className="flex items-center gap-1">
                                            <Input 
                                                type="number" 
                                                step="0.01"
                                                className="h-8"
                                                value={(settings.tax_non_asn_teknisi || 0) * 100} 
                                                onChange={e => handleChange('tax_non_asn_teknisi', parseFloat(e.target.value) / 100)} 
                                            />
                                            <span className="text-xs text-slate-500">%</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <p className="text-[10px] text-slate-500 bg-red-50 p-2 rounded mt-2">
                                    *PPH dihitung dari (Uang Lembur + Uang Makan) × Tarif PPH. Masukkan nilai dalam persen (misal: 5 untuk 5%).
                                </p>
                            </div>

                            {/* FORMULA INFO */}
                            <div className="space-y-2 bg-blue-50 p-3 rounded-lg">
                                <h4 className="text-xs font-bold text-blue-800">Formula Perhitungan Lembur:</h4>
                                <div className="text-[10px] text-blue-700 space-y-1">
                                    <p><strong>Hari Kerja:</strong> Jam × Tarif per jam</p>
                                    <p><strong>Hari Libur:</strong> Jam × Tarif per jam × 2</p>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t">
                                <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    <Save className="w-4 h-4 mr-2"/>
                                    {saving ? "Menyimpan..." : "Simpan Perubahan"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="libur">
                <HolidayManagement />
            </TabsContent>
        </Tabs>
    );
};

export default OvertimeSettings;
