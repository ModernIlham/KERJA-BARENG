import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { ArrowDownCircle, ArrowUpCircle, History, ArrowLeftRight, Construction, TrendingUp } from 'lucide-react';
import AssetIncomingForm from '../components/transaksi/AssetIncomingForm';
import AssetTransferMasukForm from '../components/transaksi/AssetTransferMasukForm';
import KDPIncomingForm from '../components/transaksi/KDPIncomingForm';
import AssetPengembanganForm from '../components/transaksi/AssetPengembanganForm';
import KDPPengembanganForm from '../components/transaksi/KDPPengembanganForm';
import AssetOutgoingForm from '../components/transaksi/AssetOutgoingForm';
import TransactionTable from '../components/transaksi/TransactionTable';
import api from '../api/axios';
import { toast } from 'sonner';

export default function TransaksiAset() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("riwayat");

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/transaksi?limit=100');
            setHistory(res.data.data);
        } catch (e) {
            toast.error("Gagal memuat riwayat");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'riwayat') {
            fetchHistory();
        }
    }, [activeTab]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Transaksi Aset Tetap (BMN)</h1>
                <p className="text-sm text-slate-500">Pencatatan perolehan, transfer masuk, KDP, pengembangan, dan distribusi aset tetap</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-slate-100 p-1 flex-wrap h-auto gap-1">
                    <TabsTrigger value="riwayat" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <History size={16} className="mr-2"/> Riwayat
                    </TabsTrigger>
                    <TabsTrigger value="masuk" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                        <ArrowDownCircle size={16} className="mr-2"/> Pembelian
                    </TabsTrigger>
                    <TabsTrigger value="transfer" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                        <ArrowLeftRight size={16} className="mr-2"/> Transfer Masuk
                    </TabsTrigger>
                    <TabsTrigger value="kdp" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">
                        <Construction size={16} className="mr-2"/> KDP Perolehan
                    </TabsTrigger>
                    <TabsTrigger value="pengembangan" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
                        <TrendingUp size={16} className="mr-2"/> Pengembangan
                    </TabsTrigger>
                    <TabsTrigger value="pengembangan-kdp" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">
                        <Construction size={16} className="mr-2"/> Pengembangan KDP
                    </TabsTrigger>
                    <TabsTrigger value="keluar" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                        <ArrowUpCircle size={16} className="mr-2"/> Keluar
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="riwayat">
                    <Card>
                        <CardHeader>
                            <CardTitle>Riwayat Transaksi Aset</CardTitle>
                            <CardDescription>Daftar seluruh aktivitas masuk, pengembangan, dan keluar aset tetap.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TransactionTable 
                                data={history} 
                                loading={loading} 
                                assetType="aset" 
                                type="all"
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="masuk">
                    <AssetIncomingForm onSuccess={() => setActiveTab('riwayat')} />
                </TabsContent>

                <TabsContent value="transfer">
                    <AssetTransferMasukForm onSuccess={() => setActiveTab('riwayat')} />
                </TabsContent>

                <TabsContent value="kdp">
                    <KDPIncomingForm onSuccess={() => setActiveTab('riwayat')} />
                </TabsContent>

                <TabsContent value="pengembangan">
                    <AssetPengembanganForm onSuccess={() => setActiveTab('riwayat')} />
                </TabsContent>

                <TabsContent value="pengembangan-kdp">
                    <KDPPengembanganForm onSuccess={() => setActiveTab('riwayat')} />
                </TabsContent>

                <TabsContent value="keluar">
                    <AssetOutgoingForm onSuccess={() => setActiveTab('riwayat')} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
