import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, RefreshCw, DollarSign, Calendar } from 'lucide-react';
import api from '../../../api/axios';
import { formatCurrency } from '../../../lib/utils';
import HolidayManagement from './HolidayManagement';

const OvertimeSettings = () => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('tarif');

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

    if (loading) return <div>Loading...</div>;

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full md:w-[400px] grid-cols-2">
                <TabsTrigger value="tarif" className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Tarif Lembur
                </TabsTrigger>
                <TabsTrigger value="libur" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Hari Libur
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
