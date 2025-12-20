import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, RefreshCw } from 'lucide-react';
import api from '../../../api/axios';
import { formatCurrency } from '../../../lib/utils';

const OvertimeSettings = () => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                <CardTitle className="text-base font-bold">Pengaturan Tarif Lembur (Dinamis)</CardTitle>
                <Button variant="ghost" size="icon" onClick={fetchSettings}><RefreshCw size={16}/></Button>
            </CardHeader>
            <CardContent className="pt-4">
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

                    {/* NON ASN SECTION */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-orange-700 uppercase border-b pb-1">Tarif Non ASN</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs">Rate Per Jam (Flat)</Label>
                                <Input type="number" value={settings.rate_non_asn} onChange={e => handleChange('rate_non_asn', e.target.value)} />
                                <p className="text-[10px] text-slate-500">Berlaku untuk Satpam, Pengemudi, Pramubakti, dll.</p>
                            </div>
                        </div>
                    </div>

                    {/* UANG MAKAN SECTION */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-green-700 uppercase border-b pb-1">Uang Makan (Per Hari)</h3>
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
                            <div className="space-y-1">
                                <Label className="text-xs">Non ASN</Label>
                                <Input type="number" value={settings.meal_non_asn} onChange={e => handleChange('meal_non_asn', e.target.value)} />
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded">
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
    );
};

export default OvertimeSettings;
