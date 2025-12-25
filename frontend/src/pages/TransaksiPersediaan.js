import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent } from '../components/ui/card';
import { 
    Package, ArrowDownToLine, ArrowUpFromLine, RefreshCw, 
    FileText, ArrowLeftRight, ChevronRight, Box
} from 'lucide-react';

// Import transaction form components
import PersediaanIncomingForm from '../components/transaksi/PersediaanIncomingForm';
import PersediaanOutgoingForm from '../components/transaksi/PersediaanOutgoingForm';
import ReklasifikasiPersediaanAsetForm from '../components/transaksi/ReklasifikasiPersediaanAsetForm';
import RiwayatTransaksiPersediaan from '../components/transaksi/RiwayatTransaksiPersediaan';

export default function TransaksiPersediaan() {
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Get initial tab from URL params, default to 'riwayat'
    const tabParam = searchParams.get('tab') || 'riwayat';
    const subTabParam = searchParams.get('sub') || '';
    
    const [activeTab, setActiveTab] = useState(tabParam);
    const [activeSubTab, setActiveSubTab] = useState(subTabParam);

    // Tab categories for better organization - same structure as TransaksiAset
    const tabCategories = {
        riwayat: {
            label: 'Riwayat',
            icon: FileText,
            color: 'text-slate-600'
        },
        masuk: {
            label: 'Barang Masuk',
            icon: ArrowDownToLine,
            color: 'text-green-600',
            subTabs: [
                { id: 'pembelian', label: 'Pembelian/Pengadaan', desc: 'Perolehan melalui pembelian atau pengadaan', icon: Package },
                { id: 'transfer_masuk', label: 'Transfer Masuk', desc: 'Penerimaan dari unit/satker lain', icon: ArrowDownToLine },
                { id: 'hibah', label: 'Hibah/Sumbangan', desc: 'Penerimaan dari hibah atau sumbangan', icon: Package }
            ]
        },
        keluar: {
            label: 'Barang Keluar',
            icon: ArrowUpFromLine,
            color: 'text-red-600',
            subTabs: [
                { id: 'pemakaian', label: 'Pemakaian Harian', desc: 'Pengeluaran untuk pemakaian kantor', icon: ArrowUpFromLine },
                { id: 'serah_terima', label: 'Serah Terima', desc: 'Serah terima ke pegawai/unit', icon: ArrowUpFromLine },
                { id: 'rusak_hilang', label: 'Rusak/Hilang', desc: 'Penghapusan karena rusak atau hilang', icon: ArrowUpFromLine }
            ]
        },
        perubahan: {
            label: 'Perubahan',
            icon: RefreshCw,
            color: 'text-blue-600',
            subTabs: [
                { id: 'koreksi_stok', label: 'Koreksi Stok', desc: 'Penyesuaian jumlah stok', icon: RefreshCw },
                { id: 'koreksi_nilai', label: 'Koreksi Nilai', desc: 'Penyesuaian nilai satuan', icon: RefreshCw }
            ]
        },
        reklasifikasi: {
            label: 'Reklasifikasi',
            icon: ArrowLeftRight,
            color: 'text-purple-600',
            subTabs: [
                { id: 'persediaan_to_aset', label: 'Persediaan → Aset', desc: 'Reklasifikasi persediaan menjadi aset tetap', icon: Box },
                { id: 'aset_to_persediaan', label: 'Aset → Persediaan', desc: 'Reklasifikasi aset tetap menjadi persediaan', icon: Package }
            ]
        }
    };

    // Sync URL params with state
    useEffect(() => {
        const tab = searchParams.get('tab') || 'riwayat';
        const sub = searchParams.get('sub') || '';
        
        setActiveTab(tab);
        
        // Set default subtab if tab has subtabs and no subtab is set
        if (tab !== 'riwayat' && tabCategories[tab]?.subTabs) {
            if (sub) {
                setActiveSubTab(sub);
            } else {
                const defaultSub = tabCategories[tab].subTabs[0].id;
                setActiveSubTab(defaultSub);
                setSearchParams({ tab, sub: defaultSub });
            }
        } else {
            setActiveSubTab('');
        }
    }, [searchParams]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab !== 'riwayat' && tabCategories[tab]?.subTabs) {
            const defaultSub = tabCategories[tab].subTabs[0].id;
            setActiveSubTab(defaultSub);
            setSearchParams({ tab, sub: defaultSub });
        } else {
            setActiveSubTab('');
            setSearchParams({ tab });
        }
    };

    const handleSubTabChange = (subId) => {
        setActiveSubTab(subId);
        setSearchParams({ tab: activeTab, sub: subId });
    };

    const handleFormSuccess = () => {
        setActiveTab('riwayat');
        setSearchParams({ tab: 'riwayat' });
    };

    const renderSubTabContent = () => {
        switch (activeSubTab) {
            // Perolehan / Barang Masuk
            case 'pembelian':
            case 'transfer_masuk':
            case 'hibah':
                return <PersediaanIncomingForm onSuccess={handleFormSuccess} jenis={activeSubTab} />;
            
            // Pengeluaran / Barang Keluar
            case 'pemakaian':
            case 'serah_terima':
            case 'rusak_hilang':
                return <PersediaanOutgoingForm onSuccess={handleFormSuccess} jenis={activeSubTab} />;
            
            // Perubahan
            case 'koreksi_stok':
                return <PersediaanIncomingForm onSuccess={handleFormSuccess} jenis="koreksi_stok" />;
            case 'koreksi_nilai':
                return <PersediaanIncomingForm onSuccess={handleFormSuccess} jenis="koreksi_nilai" />;
            
            // Reklasifikasi
            case 'persediaan_to_aset':
                return <ReklasifikasiPersediaanAsetForm onSuccess={handleFormSuccess} direction="PERSEDIAAN_TO_ASET" />;
            case 'aset_to_persediaan':
                return <ReklasifikasiPersediaanAsetForm onSuccess={handleFormSuccess} direction="ASET_TO_PERSEDIAAN" />;
            
            default:
                return null;
        }
    };

    const getIconForSubTab = (subTab) => {
        if (subTab.icon) {
            const IconComponent = subTab.icon;
            return <IconComponent className="h-4 w-4" />;
        }
        return null;
    };

    const getColorClass = (categoryKey, isActive) => {
        const colorMap = {
            masuk: isActive ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
            keluar: isActive ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
            perubahan: isActive ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
            reklasifikasi: isActive ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
        };
        return colorMap[categoryKey] || (isActive ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200');
    };

    const renderSubTabs = (categoryKey) => {
        const category = tabCategories[categoryKey];
        if (!category?.subTabs) return null;

        return (
            <Card className="mb-4">
                <CardContent className="py-4">
                    <div className="flex flex-wrap gap-2">
                        {category.subTabs.map(sub => (
                            <button
                                key={sub.id}
                                onClick={() => handleSubTabChange(sub.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${getColorClass(categoryKey, activeSubTab === sub.id)}`}
                            >
                                {getIconForSubTab(sub)}
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
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Transaksi Gudang (Persediaan)</h1>
                <p className="text-sm text-slate-500">
                    Pencatatan transaksi persediaan / barang habis pakai
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
                    <RiwayatTransaksiPersediaan />
                </TabsContent>

                {/* Barang Masuk Tab */}
                <TabsContent value="masuk">
                    {renderSubTabs('masuk')}
                    {renderSubTabContent()}
                </TabsContent>

                {/* Barang Keluar Tab */}
                <TabsContent value="keluar">
                    {renderSubTabs('keluar')}
                    {renderSubTabContent()}
                </TabsContent>

                {/* Perubahan Tab */}
                <TabsContent value="perubahan">
                    {renderSubTabs('perubahan')}
                    {renderSubTabContent()}
                </TabsContent>

                {/* Reklasifikasi Tab */}
                <TabsContent value="reklasifikasi">
                    {renderSubTabs('reklasifikasi')}
                    {renderSubTabContent()}
                </TabsContent>
            </Tabs>
        </div>
    );
}
