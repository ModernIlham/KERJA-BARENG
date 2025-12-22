import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Checkbox } from '../ui/checkbox';
import { Loader2, Clock, Save, Info, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';

const HARI_KERJA_OPTIONS = [
    { id: 'Senin', label: 'Senin' },
    { id: 'Selasa', label: 'Selasa' },
    { id: 'Rabu', label: 'Rabu' },
    { id: 'Kamis', label: 'Kamis' },
    { id: 'Jumat', label: 'Jumat' },
    { id: 'Sabtu', label: 'Sabtu' },
    { id: 'Minggu', label: 'Minggu' },
];

export default function FlexiTimeSettings() {
    const [settings, setSettings] = useState({
        key: 'flexi_time',
        enabled: true,
        jam_masuk_normal: '08:00',
        jam_pulang_normal: '16:00',
        toleransi_terlambat: 15,
        flexi_masuk_awal: '06:00',
        flexi_masuk_akhir: '09:00',
        durasi_kerja_minimum: 8.0,
        hari_kerja: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
        notes: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/api/activity/flexi-time');
            setSettings(res.data);
        } catch (e) {
            console.error('Failed to fetch flexi-time settings:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/api/activity/flexi-time', settings);
            toast.success('Pengaturan flexi-time berhasil disimpan');
        } catch (e) {
            toast.error('Gagal menyimpan pengaturan');
        } finally {
            setSaving(false);
        }
    };

    const handleHariKerjaChange = (hari, checked) => {
        if (checked) {
            setSettings(s => ({ ...s, hari_kerja: [...s.hari_kerja, hari] }));
        } else {
            setSettings(s => ({ ...s, hari_kerja: s.hari_kerja.filter(h => h !== hari) }));
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="animate-spin h-6 w-6 text-blue-600 mr-2" />
                <span className="text-slate-500">Memuat pengaturan...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-white">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Clock className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <CardTitle className="text-blue-800">Konfigurasi Flexi-Time</CardTitle>
                                <CardDescription className="text-blue-600">
                                    Atur jam kerja fleksibel untuk sistem absensi
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="flexi-enabled" className="text-sm text-slate-600">
                                {settings.enabled ? 'Aktif' : 'Nonaktif'}
                            </Label>
                            <Switch
                                id="flexi-enabled"
                                checked={settings.enabled}
                                onCheckedChange={(checked) => setSettings(s => ({ ...s, enabled: checked }))}
                            />
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Jam Kerja Normal */}
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Clock size={18} className="text-slate-600" /> Jam Kerja Normal
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Jam Masuk</Label>
                                <Input
                                    type="time"
                                    value={settings.jam_masuk_normal}
                                    onChange={(e) => setSettings(s => ({ ...s, jam_masuk_normal: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Jam Pulang</Label>
                                <Input
                                    type="time"
                                    value={settings.jam_pulang_normal}
                                    onChange={(e) => setSettings(s => ({ ...s, jam_pulang_normal: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Toleransi Terlambat (menit)</Label>
                            <Input
                                type="number"
                                min="0"
                                max="60"
                                value={settings.toleransi_terlambat}
                                onChange={(e) => setSettings(s => ({ ...s, toleransi_terlambat: parseInt(e.target.value) || 0 }))}
                            />
                            <p className="text-xs text-slate-500">
                                Pegawai masih dianggap tepat waktu jika terlambat maksimal {settings.toleransi_terlambat} menit
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Range Flexi-Time */}
                <Card className={`border-slate-200 ${!settings.enabled && 'opacity-50'}`}>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Calendar size={18} className="text-green-600" /> Range Flexi-Time
                            {settings.enabled && <Badge className="bg-green-100 text-green-700 text-xs">Aktif</Badge>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Masuk Paling Awal</Label>
                                <Input
                                    type="time"
                                    value={settings.flexi_masuk_awal}
                                    onChange={(e) => setSettings(s => ({ ...s, flexi_masuk_awal: e.target.value }))}
                                    disabled={!settings.enabled}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Masuk Paling Akhir</Label>
                                <Input
                                    type="time"
                                    value={settings.flexi_masuk_akhir}
                                    onChange={(e) => setSettings(s => ({ ...s, flexi_masuk_akhir: e.target.value }))}
                                    disabled={!settings.enabled}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Durasi Kerja Minimum (jam)</Label>
                            <Input
                                type="number"
                                step="0.5"
                                min="1"
                                max="12"
                                value={settings.durasi_kerja_minimum}
                                onChange={(e) => setSettings(s => ({ ...s, durasi_kerja_minimum: parseFloat(e.target.value) || 8 }))}
                                disabled={!settings.enabled}
                            />
                            <p className="text-xs text-slate-500">
                                Total jam kerja minimum yang harus dipenuhi setiap hari
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Hari Kerja */}
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Calendar size={18} className="text-purple-600" /> Hari Kerja
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {HARI_KERJA_OPTIONS.map((hari) => (
                                <div key={hari.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={hari.id}
                                        checked={settings.hari_kerja.includes(hari.id)}
                                        onCheckedChange={(checked) => handleHariKerjaChange(hari.id, checked)}
                                    />
                                    <Label 
                                        htmlFor={hari.id} 
                                        className={`text-sm cursor-pointer ${settings.hari_kerja.includes(hari.id) ? 'text-slate-800 font-medium' : 'text-slate-500'}`}
                                    >
                                        {hari.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-3">
                            Hari yang dipilih akan dihitung sebagai hari kerja
                        </p>
                    </CardContent>
                </Card>

                {/* Catatan */}
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Info size={18} className="text-orange-600" /> Catatan
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <textarea
                            className="w-full h-24 px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Tambahkan catatan atau keterangan mengenai aturan flexi-time..."
                            value={settings.notes || ''}
                            onChange={(e) => setSettings(s => ({ ...s, notes: e.target.value }))}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Info Box */}
            <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4">
                    <div className="flex gap-3">
                        <Info className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-800">
                            <p className="font-medium mb-1">Tentang Flexi-Time</p>
                            <ul className="list-disc list-inside space-y-1 text-yellow-700">
                                <li>Flexi-time memungkinkan pegawai masuk dalam rentang waktu yang ditentukan</li>
                                <li>Jam pulang akan dihitung berdasarkan durasi kerja minimum dari jam masuk</li>
                                <li>Contoh: Jika masuk jam 07:00 dengan durasi minimum 8 jam, pulang minimal jam 15:00</li>
                                <li>Pengaturan ini berlaku untuk semua pegawai</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    {saving ? (
                        <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Menyimpan...</>
                    ) : (
                        <><Save className="mr-2 h-4 w-4" /> Simpan Pengaturan</>
                    )}
                </Button>
            </div>
        </div>
    );
}
