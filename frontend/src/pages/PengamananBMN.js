import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
    Shield, FileCheck, ClipboardList, FileText, Calendar, Search, 
    CheckCircle2, AlertTriangle, Clock, Building, Users, Scale,
    FileSpreadsheet, Download, Filter, RefreshCw, Eye, Plus
} from 'lucide-react';

export default function PengamananBMN() {
    const [activeTab, setActiveTab] = useState('administrasi');
    const [searchTerm, setSearchTerm] = useState('');

    // Summary stats
    const stats = {
        administrasi: {
            total: 13553,
            verified: 12890,
            pending: 663,
            percentage: 95.1
        },
        fisik: {
            total: 13553,
            verified: 11200,
            pending: 2353,
            percentage: 82.6
        },
        hukum: {
            total: 1250,
            verified: 980,
            pending: 270,
            percentage: 78.4
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Shield className="h-7 w-7 text-blue-600" />
                    Pengamanan BMN
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Pengelolaan tertib administrasi, fisik, dan hukum Barang Milik Negara
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-medium">Tertib Administrasi</p>
                                <p className="text-2xl font-bold text-slate-900">{stats.administrasi.percentage}%</p>
                                <p className="text-xs text-slate-500">{stats.administrasi.verified.toLocaleString()} dari {stats.administrasi.total.toLocaleString()} item</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                <ClipboardList className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-medium">Tertib Fisik</p>
                                <p className="text-2xl font-bold text-slate-900">{stats.fisik.percentage}%</p>
                                <p className="text-xs text-slate-500">{stats.fisik.verified.toLocaleString()} dari {stats.fisik.total.toLocaleString()} item</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                <FileCheck className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-medium">Tertib Hukum</p>
                                <p className="text-2xl font-bold text-slate-900">{stats.hukum.percentage}%</p>
                                <p className="text-xs text-slate-500">{stats.hukum.verified.toLocaleString()} dari {stats.hukum.total.toLocaleString()} item</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                                <Scale className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-3 w-full max-w-xl bg-slate-100 p-1 rounded-lg">
                    <TabsTrigger value="administrasi" className="flex items-center gap-1.5">
                        <ClipboardList className="h-4 w-4" />
                        <span className="hidden sm:inline">Tertib Administrasi</span>
                        <span className="sm:hidden">Administrasi</span>
                    </TabsTrigger>
                    <TabsTrigger value="fisik" className="flex items-center gap-1.5">
                        <FileCheck className="h-4 w-4" />
                        <span className="hidden sm:inline">Tertib Fisik</span>
                        <span className="sm:hidden">Fisik</span>
                    </TabsTrigger>
                    <TabsTrigger value="hukum" className="flex items-center gap-1.5">
                        <Scale className="h-4 w-4" />
                        <span className="hidden sm:inline">Tertib Hukum</span>
                        <span className="sm:hidden">Hukum</span>
                    </TabsTrigger>
                </TabsList>

                {/* Tertib Administrasi */}
                <TabsContent value="administrasi">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <ClipboardList className="h-5 w-5 text-blue-600" />
                                Tertib Administrasi BMN
                            </CardTitle>
                            <CardDescription>
                                Pengelolaan kelengkapan dokumen, pencatatan, dan pelaporan BMN
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Actions */}
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm">
                                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                                    Verifikasi Dokumen
                                </Button>
                                <Button variant="outline" size="sm">
                                    <FileText className="h-4 w-4 mr-2" />
                                    Kelengkapan Data
                                </Button>
                                <Button variant="outline" size="sm">
                                    <Download className="h-4 w-4 mr-2" />
                                    Export Laporan
                                </Button>
                            </div>

                            {/* Checklist Items */}
                            <div className="space-y-3 mt-4">
                                <h4 className="font-medium text-sm text-slate-700">Checklist Kelengkapan Administrasi</h4>
                                
                                <div className="grid gap-2">
                                    {[
                                        { label: 'Dokumen Perolehan (SPK/Kontrak)', completed: true, count: '13,200/13,553' },
                                        { label: 'Berita Acara Serah Terima (BAST)', completed: true, count: '12,890/13,553' },
                                        { label: 'Kartu Inventaris Barang (KIB)', completed: true, count: '13,100/13,553' },
                                        { label: 'Label/Kode Barang', completed: false, count: '11,500/13,553' },
                                        { label: 'Foto Dokumentasi', completed: false, count: '10,200/13,553' },
                                        { label: 'Input SIMAK-BMN', completed: true, count: '13,553/13,553' },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                {item.completed ? (
                                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                ) : (
                                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                                )}
                                                <span className="text-sm">{item.label}</span>
                                            </div>
                                            <span className="text-xs text-slate-500">{item.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tertib Fisik */}
                <TabsContent value="fisik">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileCheck className="h-5 w-5 text-green-600" />
                                Tertib Fisik BMN
                            </CardTitle>
                            <CardDescription>
                                Pengelolaan kondisi fisik, lokasi, dan keberadaan BMN
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Actions */}
                            <div className="flex flex-wrap gap-2">
                                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Buat Stock Opname
                                </Button>
                                <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4 mr-2" />
                                    Lihat Hasil Opname
                                </Button>
                                <Button variant="outline" size="sm">
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Jadwal Pengecekan
                                </Button>
                            </div>

                            {/* Stock Opname History */}
                            <div className="space-y-3 mt-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-sm text-slate-700">Riwayat Stock Opname</h4>
                                    <Button variant="ghost" size="sm">
                                        <RefreshCw className="h-4 w-4 mr-1" />
                                        Refresh
                                    </Button>
                                </div>
                                
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="text-left p-3 font-medium">Periode</th>
                                                <th className="text-left p-3 font-medium">Unit Kerja</th>
                                                <th className="text-center p-3 font-medium">Total Item</th>
                                                <th className="text-center p-3 font-medium">Ditemukan</th>
                                                <th className="text-center p-3 font-medium">Selisih</th>
                                                <th className="text-center p-3 font-medium">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[
                                                { periode: 'Q4 2025', unit: 'Semua Unit', total: 13553, found: 11200, diff: 2353, status: 'Dalam Proses' },
                                                { periode: 'Q3 2025', unit: 'Semua Unit', total: 13100, found: 12800, diff: 300, status: 'Selesai' },
                                                { periode: 'Q2 2025', unit: 'Semua Unit', total: 12800, found: 12650, diff: 150, status: 'Selesai' },
                                            ].map((row, idx) => (
                                                <tr key={idx} className="border-t">
                                                    <td className="p-3">{row.periode}</td>
                                                    <td className="p-3">{row.unit}</td>
                                                    <td className="p-3 text-center">{row.total.toLocaleString()}</td>
                                                    <td className="p-3 text-center text-green-600">{row.found.toLocaleString()}</td>
                                                    <td className="p-3 text-center text-red-600">{row.diff.toLocaleString()}</td>
                                                    <td className="p-3 text-center">
                                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                                            row.status === 'Selesai' 
                                                                ? 'bg-green-100 text-green-700' 
                                                                : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                            {row.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Condition Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                                {[
                                    { label: 'Baik', count: 10500, color: 'bg-green-100 text-green-700' },
                                    { label: 'Rusak Ringan', count: 2100, color: 'bg-amber-100 text-amber-700' },
                                    { label: 'Rusak Berat', count: 800, color: 'bg-red-100 text-red-700' },
                                    { label: 'Tidak Ditemukan', count: 153, color: 'bg-slate-100 text-slate-700' },
                                ].map((item, idx) => (
                                    <div key={idx} className={`p-3 rounded-lg ${item.color}`}>
                                        <p className="text-xs font-medium">{item.label}</p>
                                        <p className="text-xl font-bold">{item.count.toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tertib Hukum */}
                <TabsContent value="hukum">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Scale className="h-5 w-5 text-purple-600" />
                                Tertib Hukum BMN
                            </CardTitle>
                            <CardDescription>
                                Pengelolaan legalitas kepemilikan, sertifikasi, dan dokumen hukum BMN
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Actions */}
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm">
                                    <FileText className="h-4 w-4 mr-2" />
                                    Verifikasi Sertifikat
                                </Button>
                                <Button variant="outline" size="sm">
                                    <Building className="h-4 w-4 mr-2" />
                                    Status Tanah/Bangunan
                                </Button>
                                <Button variant="outline" size="sm">
                                    <Users className="h-4 w-4 mr-2" />
                                    Penetapan Status
                                </Button>
                            </div>

                            {/* Legal Documents Status */}
                            <div className="space-y-3 mt-4">
                                <h4 className="font-medium text-sm text-slate-700">Status Dokumen Hukum</h4>
                                
                                <div className="grid gap-3">
                                    {[
                                        { 
                                            category: 'Tanah', 
                                            items: [
                                                { label: 'Sertifikat Hak Pakai', total: 45, verified: 38 },
                                                { label: 'SK Penetapan Status', total: 45, verified: 42 },
                                            ]
                                        },
                                        { 
                                            category: 'Bangunan', 
                                            items: [
                                                { label: 'IMB/PBG', total: 120, verified: 95 },
                                                { label: 'Sertifikat Laik Fungsi', total: 120, verified: 78 },
                                            ]
                                        },
                                        { 
                                            category: 'Kendaraan', 
                                            items: [
                                                { label: 'BPKB', total: 85, verified: 85 },
                                                { label: 'STNK Aktif', total: 85, verified: 80 },
                                            ]
                                        },
                                    ].map((cat, idx) => (
                                        <div key={idx} className="border rounded-lg p-4">
                                            <h5 className="font-medium text-slate-800 mb-3">{cat.category}</h5>
                                            <div className="space-y-2">
                                                {cat.items.map((item, iIdx) => (
                                                    <div key={iIdx} className="flex items-center justify-between">
                                                        <span className="text-sm text-slate-600">{item.label}</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-purple-500 rounded-full"
                                                                    style={{ width: `${(item.verified/item.total)*100}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-slate-500 w-16 text-right">
                                                                {item.verified}/{item.total}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
