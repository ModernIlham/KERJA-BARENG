import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
    Package, ArrowDownToLine, ArrowUpFromLine, RefreshCw, Construction,
    FileText, DollarSign, Layers, ArrowLeftRight, ChevronRight, History
} from 'lucide-react';

// Import all transaction form components
import AssetIncomingForm from '../components/transaksi/AssetIncomingForm';
import AssetTransferMasukForm from '../components/transaksi/AssetTransferMasukForm';
import KDPIncomingForm from '../components/transaksi/KDPIncomingForm';
import AssetPengembanganForm from '../components/transaksi/AssetPengembanganForm';
import KDPPengembanganForm from '../components/transaksi/KDPPengembanganForm';
import AssetOutgoingForm from '../components/transaksi/AssetOutgoingForm';
import TransactionTable from '../components/transaksi/TransactionTable';

// Import new RUH forms
import PerubahanKuantitasForm from '../components/transaksi/PerubahanKuantitasForm';
import PerubahanKondisiForm from '../components/transaksi/PerubahanKondisiForm';
import KoreksiNilaiForm from '../components/transaksi/KoreksiNilaiForm';
import ReklasifikasiForm from '../components/transaksi/ReklasifikasiForm';
import ReklasifikasiKDPForm from '../components/transaksi/ReklasifikasiKDPForm';
import ReklasifikasiMasukForm from '../components/transaksi/ReklasifikasiMasukForm';
import RiwayatTransaksiComprehensive from '../components/transaksi/RiwayatTransaksiComprehensive';

export default function TransaksiAset() {
    const [activeTab, setActiveTab] = useState('riwayat');
    const [activeSubTab, setActiveSubTab] = useState('');
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState([]);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/transaksi', { params: { limit: 100 } });
            setTransactions(res.data.data || []);
        } catch (e) {
            console.error('Failed to fetch transactions:', e);
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'riwayat') {
            fetchTransactions();
        }
    }, [activeTab, fetchTransactions]);

    // Tab categories for better organization
    const tabCategories = {
        riwayat: {
            label: 'Riwayat',
            icon: FileText,
            color: 'text-slate-600'
        },
        perolehan: {
            label: 'RUH Perolehan',
            icon: ArrowDownToLine,
            color: 'text-green-600',
            subTabs: [
                { id: 'pembelian', label: 'Pembelian', desc: 'Perolehan melalui pembelian' },
                { id: 'transfer_masuk', label: 'Transfer Masuk', desc: 'Penerimaan dari unit lain' },
                { id: 'kdp_perolehan', label: 'KDP Perolehan', desc: 'Konstruksi Dalam Pengerjaan' },
                { id: 'reklasifikasi_masuk', label: 'Reklasifikasi Masuk', desc: 'Masuk dari perubahan golongan' }
            ]
        },
        pengembangan: {
            label: 'RUH Pengembangan',
            icon: Construction,
            color: 'text-orange-600',
            subTabs: [
                { id: 'pengembangan_langsung', label: 'Pengembangan Langsung', desc: 'Kapitalisasi langsung ke aset' },
                { id: 'pengembangan_kdp', label: 'Pengembangan KDP', desc: 'Melalui Konstruksi Dalam Pengerjaan' }
            ]
        },
        perubahan: {
            label: 'RUH Perubahan',
            icon: RefreshCw,
            color: 'text-blue-600',
            subTabs: [
                { id: 'perubahan_kuantitas', label: 'Perubahan Kuantitas', desc: 'Koreksi jumlah barang' },
                { id: 'perubahan_kondisi', label: 'Perubahan Kondisi', desc: 'Update kondisi aset (Baik/RR/RB)' },
                { id: 'koreksi_nilai_bmn', label: 'Koreksi Nilai BMN', desc: 'Penyesuaian nilai perolehan/buku' },
                { id: 'koreksi_nilai_kdp', label: 'Koreksi Nilai KDP', desc: 'Penyesuaian nilai KDP' },
                { id: 'reklasifikasi_kdp', label: 'Reklasifikasi KDP', desc: 'Pemindahan nilai antar KDP' }
            ]
        },
        penghapusan: {
            label: 'RUH Penghapusan',
            icon: ArrowUpFromLine,
            color: 'text-red-600',
            subTabs: [
                { id: 'keluar', label: 'Pengeluaran Aset', desc: 'Serah terima ke pegawai' },
                { id: 'reklasifikasi_keluar', label: 'Reklasifikasi Keluar', desc: 'Keluar karena perubahan golongan' }
            ]
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        // Reset subtab when changing main tab
        if (tab !== 'riwayat' && tabCategories[tab]?.subTabs) {
            setActiveSubTab(tabCategories[tab].subTabs[0].id);
        } else {
            setActiveSubTab('');
        }
    };

    const handleFormSuccess = () => {
        setActiveTab('riwayat');
        fetchTransactions();
    };

    const renderSubTabContent = () => {
        switch (activeSubTab) {
            // Perolehan
            case 'pembelian':
                return <AssetIncomingForm onSuccess={handleFormSuccess} />;
            case 'transfer_masuk':
                return <AssetTransferMasukForm onSuccess={handleFormSuccess} />;
            case 'kdp_perolehan':
                return <KDPIncomingForm onSuccess={handleFormSuccess} />;
            case 'reklasifikasi_masuk':
                return <ReklasifikasiForm onSuccess={handleFormSuccess} direction="MASUK" />;
            
            // Pengembangan
            case 'pengembangan_langsung':
                return <AssetPengembanganForm onSuccess={handleFormSuccess} />;
            case 'pengembangan_kdp':
                return <KDPPengembanganForm onSuccess={handleFormSuccess} />;
            
            // Perubahan
            case 'perubahan_kuantitas':
                return <PerubahanKuantitasForm onSuccess={handleFormSuccess} />;
            case 'perubahan_kondisi':
                return <PerubahanKondisiForm onSuccess={handleFormSuccess} />;
            case 'koreksi_nilai_bmn':
                return <KoreksiNilaiForm onSuccess={handleFormSuccess} type="BMN" />;
            case 'koreksi_nilai_kdp':
                return <KoreksiNilaiForm onSuccess={handleFormSuccess} type="KDP" />;
            case 'reklasifikasi_kdp':
                return <ReklasifikasiKDPForm onSuccess={handleFormSuccess} />;
            
            // Penghapusan
            case 'keluar':
                return <AssetOutgoingForm onSuccess={handleFormSuccess} />;
            case 'reklasifikasi_keluar':
                return <ReklasifikasiForm onSuccess={handleFormSuccess} direction="KELUAR" />;
            
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Transaksi Aset</h1>
                <p className="text-sm text-slate-500">
                    Pencatatan RUH (Rekam Update History) Transaksi BMN & KDP
                </p>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid grid-cols-5 w-full max-w-3xl bg-slate-100 p-1 rounded-lg">
                    {Object.entries(tabCategories).map(([key, cat]) => (
                        <TabsTrigger 
                            key={key} 
                            value={key}
                            className={`flex items-center gap-1.5 text-xs sm:text-sm data-[state=active]:${cat.color}`}
                        >
                            <cat.icon className="h-4 w-4" />
                            <span className="hidden sm:inline">{cat.label}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* Riwayat Tab */}
                <TabsContent value="riwayat">
                    <RiwayatTransaksiComprehensive />
                </TabsContent>

                {/* Perolehan Tab */}
                <TabsContent value="perolehan">
                    <Card className="mb-4">
                        <CardContent className="py-4">
                            <div className="flex flex-wrap gap-2">
                                {tabCategories.perolehan.subTabs.map(sub => (
                                    <button
                                        key={sub.id}
                                        onClick={() => setActiveSubTab(sub.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                                            activeSubTab === sub.id 
                                                ? 'bg-green-50 border-green-300 text-green-700' 
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <ArrowDownToLine className="h-4 w-4" />
                                        <div className="text-left">
                                            <div className="font-medium text-sm">{sub.label}</div>
                                            <div className="text-xs opacity-70">{sub.desc}</div>
                                        </div>
                                        {activeSubTab === sub.id && <ChevronRight className="h-4 w-4 ml-2" />}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                    {renderSubTabContent()}
                </TabsContent>

                {/* Pengembangan Tab */}
                <TabsContent value="pengembangan">
                    <Card className="mb-4">
                        <CardContent className="py-4">
                            <div className="flex flex-wrap gap-2">
                                {tabCategories.pengembangan.subTabs.map(sub => (
                                    <button
                                        key={sub.id}
                                        onClick={() => setActiveSubTab(sub.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                                            activeSubTab === sub.id 
                                                ? 'bg-orange-50 border-orange-300 text-orange-700' 
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Construction className="h-4 w-4" />
                                        <div className="text-left">
                                            <div className="font-medium text-sm">{sub.label}</div>
                                            <div className="text-xs opacity-70">{sub.desc}</div>
                                        </div>
                                        {activeSubTab === sub.id && <ChevronRight className="h-4 w-4 ml-2" />}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                    {renderSubTabContent()}
                </TabsContent>

                {/* Perubahan Tab */}
                <TabsContent value="perubahan">
                    <Card className="mb-4">
                        <CardContent className="py-4">
                            <div className="flex flex-wrap gap-2">
                                {tabCategories.perubahan.subTabs.map(sub => (
                                    <button
                                        key={sub.id}
                                        onClick={() => setActiveSubTab(sub.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                                            activeSubTab === sub.id 
                                                ? 'bg-blue-50 border-blue-300 text-blue-700' 
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        {sub.id.includes('koreksi') ? (
                                            <DollarSign className="h-4 w-4" />
                                        ) : sub.id.includes('reklasifikasi') ? (
                                            <ArrowLeftRight className="h-4 w-4" />
                                        ) : (
                                            <RefreshCw className="h-4 w-4" />
                                        )}
                                        <div className="text-left">
                                            <div className="font-medium text-sm">{sub.label}</div>
                                            <div className="text-xs opacity-70">{sub.desc}</div>
                                        </div>
                                        {activeSubTab === sub.id && <ChevronRight className="h-4 w-4 ml-2" />}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                    {renderSubTabContent()}
                </TabsContent>

                {/* Penghapusan Tab */}
                <TabsContent value="penghapusan">
                    <Card className="mb-4">
                        <CardContent className="py-4">
                            <div className="flex flex-wrap gap-2">
                                {tabCategories.penghapusan.subTabs.map(sub => (
                                    <button
                                        key={sub.id}
                                        onClick={() => setActiveSubTab(sub.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                                            activeSubTab === sub.id 
                                                ? 'bg-red-50 border-red-300 text-red-700' 
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <ArrowUpFromLine className="h-4 w-4" />
                                        <div className="text-left">
                                            <div className="font-medium text-sm">{sub.label}</div>
                                            <div className="text-xs opacity-70">{sub.desc}</div>
                                        </div>
                                        {activeSubTab === sub.id && <ChevronRight className="h-4 w-4 ml-2" />}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                    {renderSubTabContent()}
                </TabsContent>
            </Tabs>
        </div>
    );
}
