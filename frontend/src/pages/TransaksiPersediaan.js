import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Pagination } from '../components/ui/pagination';
import { Plus, ArrowLeftRight, ChevronRight, Package, Box } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TransactionTable from '../components/transaksi/TransactionTable';
import PersediaanIncomingForm from '../components/transaksi/PersediaanIncomingForm';
import PersediaanOutgoingForm from '../components/transaksi/PersediaanOutgoingForm';
import ReklasifikasiPersediaanAsetForm from '../components/transaksi/ReklasifikasiPersediaanAsetForm';

import SuratGeneratorModal from '../components/transaksi/SuratGeneratorModal';
import { Printer } from 'lucide-react';

export default function TransaksiPersediaan({ activeTab = 'riwayat' }) {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('persediaan_to_aset');
  
  // Printing State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printTxIds, setPrintTxIds] = useState([]); // IDs to print

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;

  useEffect(() => {
      fetchData();
  }, [activeTab, currentPage]);

  const fetchData = async () => {
      setLoading(true);
      try {
          const params = { page: currentPage, limit };
          
          // Use Grouped endpoint for 'riwayat' tab
          const endpoint = activeTab === 'riwayat' 
              ? '/api/persediaan-transaksi/grouped' 
              : '/api/persediaan-transaksi/';
              
          const res = await api.get(endpoint, { params });
          
          let items = res.data.data;
          // Filter logic not needed for grouped endpoint as it returns groups
          if (activeTab !== 'riwayat') {
              const filterType = activeTab === 'masuk' ? 'in' : 'out';
              items = items.filter(i => i.jenis === filterType);
          }

          setData(items);
          setTotalPages(res.data.total_pages);
          setTotalItems(res.data.total);
      } catch (err) {
          console.error(err);
      } finally {
          setLoading(false);
      }
  };

  // Conditions to show "Direct Form"
  const isDirectIncomingMode = activeTab === 'masuk';
  const isDirectOutgoingMode = activeTab === 'keluar';
  const isReklasifikasiMode = activeTab === 'reklasifikasi';

  const handlePrintClick = () => {
      // Collect IDs from visible data (or allow selection)
      // For now, let's just print visible items for "BAST Harian" scenario
      // Or better, filter by active tab if 'masuk'/'keluar'
      if (data.length === 0) return;
      const ids = data.map(i => i._id);
      setPrintTxIds(ids);
      setIsPrintModalOpen(true);
  };

  const handleFormSuccess = () => {
      fetchData();
  };

  // Reklasifikasi sub-tabs
  const reklasifikasiSubTabs = [
    { id: 'persediaan_to_aset', label: 'Persediaan → Aset', desc: 'Reklasifikasi persediaan menjadi aset tetap', icon: Box },
    { id: 'aset_to_persediaan', label: 'Aset → Persediaan', desc: 'Reklasifikasi aset tetap menjadi persediaan', icon: Package }
  ];

  const renderReklasifikasiContent = () => {
    switch (activeSubTab) {
      case 'persediaan_to_aset':
        return <ReklasifikasiPersediaanAsetForm onSuccess={handleFormSuccess} direction="PERSEDIAAN_TO_ASET" />;
      case 'aset_to_persediaan':
        return <ReklasifikasiPersediaanAsetForm onSuccess={handleFormSuccess} direction="ASET_TO_PERSEDIAAN" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Transaksi Gudang (Persediaan)</h1>
                <p className="text-slate-500 text-sm">Kelola barang masuk, keluar, dan reklasifikasi untuk persediaan / barang habis pakai</p>
            </div>
            {/* Global Print Button for current view */}
            <Button variant="outline" className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50" onClick={handlePrintClick}>
                <Printer className="mr-2 h-4 w-4"/> Buat Surat / BA
            </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(val) => navigate(`/transaksi-persediaan/${val}`)} className="w-full">
            <TabsList className="bg-slate-100 p-1 mb-6">
                <TabsTrigger value="masuk" className="px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Barang Masuk</TabsTrigger>
                <TabsTrigger value="keluar" className="px-6 data-[state=active]:bg-red-600 data-[state=active]:text-white">Barang Keluar</TabsTrigger>
                <TabsTrigger value="reklasifikasi" className="px-6 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                    <ArrowLeftRight className="h-4 w-4 mr-1" /> Reklasifikasi
                </TabsTrigger>
                <TabsTrigger value="riwayat" className="px-6">Riwayat Transaksi</TabsTrigger>
            </TabsList>

            {/* Reklasifikasi Tab Content */}
            <TabsContent value="reklasifikasi">
                <Card className="mb-4">
                    <CardContent className="py-4">
                        <div className="flex flex-wrap gap-2">
                            {reklasifikasiSubTabs.map(sub => (
                                <button
                                    key={sub.id}
                                    onClick={() => setActiveSubTab(sub.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                                        activeSubTab === sub.id 
                                            ? 'bg-purple-50 border-purple-300 text-purple-700' 
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <sub.icon className="h-4 w-4" />
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
                {renderReklasifikasiContent()}
            </TabsContent>

            <div className="space-y-4">
                {isDirectIncomingMode && <PersediaanIncomingForm onSuccess={fetchData} />}
                {isDirectOutgoingMode && <PersediaanOutgoingForm onSuccess={fetchData} />}

                {!isReklasifikasiMode && (
                    <Card>
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-base flex justify-between items-center">
                                <span>
                                    {activeTab === 'riwayat' ? 'Semua Riwayat' : `Daftar Barang ${activeTab === 'masuk' ? 'Masuk' : 'Keluar'}`} 
                                    <SuratGeneratorModal 
                                        isOpen={isPrintModalOpen} 
                                        onClose={() => setIsPrintModalOpen(false)} 
                                        transactionIds={printTxIds}
                                        defaultType={activeTab === 'masuk' ? 'BAST' : 'SBB'}
                                    />
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <TransactionTable 
                                data={data} 
                                loading={loading} 
                                assetType="persediaan"
                                type={activeTab} 
                                isGrouped={activeTab === 'riwayat'}
                            />
                            <Pagination 
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={totalItems}
                                limit={limit}
                                onPageChange={setCurrentPage}
                            />
                        </CardContent>
                    </Card>
                )}
            </div>
        </Tabs>
    </div>
  );
}
