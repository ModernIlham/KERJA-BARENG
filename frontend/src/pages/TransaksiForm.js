import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Pagination } from '../components/ui/pagination';
import { Plus } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import TransactionTable from '../components/transaksi/TransactionTable';
import AddTransactionModal from '../components/transaksi/AddTransactionModal';
import PersediaanIncomingForm from '../components/transaksi/PersediaanIncomingForm';
import PersediaanOutgoingForm from '../components/transaksi/PersediaanOutgoingForm';

export default function TransaksiPage() {
  const { type } = useParams(); // 'masuk', 'keluar', 'riwayat'
  const navigate = useNavigate();
  const activeTab = type || 'riwayat';
  
  const [assetType, setAssetType] = useState('persediaan'); // 'aset' or 'persediaan'
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;

  useEffect(() => {
      fetchData();
  }, [activeTab, assetType, currentPage]);

  const fetchData = async () => {
      setLoading(true);
      try {
          let endpoint = '';
          let params = { page: currentPage, limit };

          if (assetType === 'aset') {
              endpoint = '/api/transaksi'; // General Asset Transactions
              if (activeTab === 'masuk') params.jenis = 'MASUK';
              if (activeTab === 'keluar') params.jenis = 'KELUAR';
          } else {
              endpoint = '/api/persediaan-transaksi/'; // Inventory Transactions
          }

          const res = await api.get(endpoint, { params });
          
          // Client-side Filtering for Persediaan (since endpoint returns all)
          let items = res.data.data;
          if (assetType === 'persediaan' && activeTab !== 'riwayat') {
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

  const handleTabChange = (val) => {
      navigate(`/transaksi/${val}`);
      setCurrentPage(1);
  };

  // Conditions to show "Direct Form" instead of "Add Button"
  const isDirectIncomingMode = activeTab === 'masuk' && assetType === 'persediaan';
  const isDirectOutgoingMode = activeTab === 'keluar' && assetType === 'persediaan';

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Transaksi Gudang</h1>
                <p className="text-slate-500 text-sm">Kelola barang masuk dan keluar</p>
            </div>
            
            {/* Show Add Button ONLY if NOT in Direct Form Mode and NOT in Riwayat */}
            {activeTab !== 'riwayat' && !isDirectIncomingMode && !isDirectOutgoingMode && (
                <Button className="bg-slate-900 text-white" onClick={() => setModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> 
                    Tambah Barang {activeTab === 'masuk' ? 'Masuk' : 'Keluar'}
                </Button>
            )}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="bg-slate-100 p-1 mb-6">
                <TabsTrigger value="masuk" className="px-6">Barang Masuk</TabsTrigger>
                <TabsTrigger value="keluar" className="px-6">Barang Keluar</TabsTrigger>
                <TabsTrigger value="riwayat" className="px-6">Riwayat Transaksi</TabsTrigger>
            </TabsList>

            <div className="space-y-4">
                {/* Sub-Tabs / Toggle for Asset Type */}
                <div className="flex gap-2 mb-4">
                    <button 
                        onClick={() => setAssetType('persediaan')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all border ${
                            assetType === 'persediaan' 
                            ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        Aset Lancar (Persediaan)
                    </button>
                    <button 
                        onClick={() => setAssetType('aset')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all border ${
                            assetType === 'aset' 
                            ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        Aset Tetap
                    </button>
                </div>

                {/* Direct Entry Form for Persediaan Masuk */}
                {isDirectIncomingMode && (
                    <PersediaanIncomingForm onSuccess={fetchData} />
                )}

                {/* Direct Entry Form for Persediaan Keluar */}
                {isDirectOutgoingMode && (
                    <PersediaanOutgoingForm onSuccess={fetchData} />
                )}

                <Card>
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base flex justify-between items-center">
                            <span>
                                {activeTab === 'riwayat' ? 'Semua Riwayat' : `Daftar Barang ${activeTab === 'masuk' ? 'Masuk' : 'Keluar'}`} 
                                <span className="text-slate-400 font-normal mx-2">|</span> 
                                <span className="text-blue-600">{assetType === 'persediaan' ? 'Persediaan' : 'Aset Tetap'}</span>
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <TransactionTable 
                            data={data} 
                            loading={loading} 
                            assetType={assetType}
                            type={activeTab} // 'masuk', 'keluar', 'riwayat'
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
            </div>
        </Tabs>

        <AddTransactionModal 
            isOpen={modalOpen} 
            onClose={() => setModalOpen(false)}
            type={activeTab === 'masuk' ? 'in' : 'out'} // 'in'/'out'
            assetType={assetType} // 'persediaan'/'aset'
            onSuccess={fetchData}
        />
    </div>
  );
}
