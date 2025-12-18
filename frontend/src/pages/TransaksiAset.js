import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { ArrowDownCircle, ArrowUpCircle, History, Package } from 'lucide-react';
import AssetIncomingForm from '../components/transaksi/AssetIncomingForm';
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
            // Need a way to filter only Asset transactions if using shared endpoint?
            // Currently endpoint returns all. We can filter client side or add param.
            // For now, let's fetch all and filter client side if needed, or assume endpoint handles it.
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
                <h1 className="text-2xl font-bold text-slate-900">Transaksi Aset Tetap</h1>
                <p className="text-sm text-slate-500">Pencatatan perolehan dan mutasi/distribusi aset tetap</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-slate-100 p-1">
                    <TabsTrigger value="riwayat" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <History size={16} className="mr-2"/> Riwayat Transaksi
                    </TabsTrigger>
                    <TabsTrigger value="masuk" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                        <ArrowDownCircle size={16} className="mr-2"/> Barang Masuk (Perolehan)
                    </TabsTrigger>
                    <TabsTrigger value="keluar" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                        <ArrowUpCircle size={16} className="mr-2"/> Barang Keluar (Mutasi/Distribusi)
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="riwayat">
                    <Card>
                        <CardHeader>
                            <CardTitle>Riwayat Transaksi Aset</CardTitle>
                            <CardDescription>Daftar seluruh aktivitas masuk dan keluar aset tetap.</CardDescription>
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

                <TabsContent value="keluar">
                    <AssetOutgoingForm onSuccess={() => setActiveTab('riwayat')} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
