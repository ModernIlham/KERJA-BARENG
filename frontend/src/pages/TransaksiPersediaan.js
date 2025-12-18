import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Pagination } from '../components/ui/pagination';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TransactionTable from '../components/transaksi/TransactionTable';
import PersediaanIncomingForm from '../components/transaksi/PersediaanIncomingForm';
import PersediaanOutgoingForm from '../components/transaksi/PersediaanOutgoingForm';

export default function TransaksiPersediaan({ activeTab = 'riwayat' }) {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

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
          const res = await api.get('/api/persediaan-transaksi/', { params });
          
          let items = res.data.data;
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

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Transaksi Gudang (Persediaan)</h1>
            <p className="text-slate-500 text-sm">Kelola barang masuk dan keluar untuk persediaan / barang habis pakai</p>
        </div>

        <Tabs value={activeTab} onValueChange={(val) => navigate(`/transaksi-persediaan/${val}`)} className="w-full">
            <TabsList className="bg-slate-100 p-1 mb-6">
                <TabsTrigger value="masuk" className="px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Barang Masuk</TabsTrigger>
                <TabsTrigger value="keluar" className="px-6 data-[state=active]:bg-red-600 data-[state=active]:text-white">Barang Keluar</TabsTrigger>
                <TabsTrigger value="riwayat" className="px-6">Riwayat Transaksi</TabsTrigger>
            </TabsList>

            <div className="space-y-4">
                {isDirectIncomingMode && <PersediaanIncomingForm onSuccess={fetchData} />}
                {isDirectOutgoingMode && <PersediaanOutgoingForm onSuccess={fetchData} />}

                <Card>
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base flex justify-between items-center">
                            <span>
                                {activeTab === 'riwayat' ? 'Semua Riwayat' : `Daftar Barang ${activeTab === 'masuk' ? 'Masuk' : 'Keluar'}`} 
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <TransactionTable 
                            data={data} 
                            loading={loading} 
                            assetType="persediaan"
                            type={activeTab} 
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
    </div>
  );
}
