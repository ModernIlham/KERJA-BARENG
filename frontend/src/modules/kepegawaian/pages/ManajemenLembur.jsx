import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import RekapLemburTable from '../components/RekapLemburTable';
import DafnomLembur from '../components/DafnomLembur';
import DafnomSPL from '../components/DafnomSPL';
import OvertimeSettings from '../components/OvertimeSettings';
import OvertimeRangeForm from '../components/OvertimeRangeForm';
import OvertimeBatchList from '../components/OvertimeBatchList';
import OvertimeApproval from '../components/OvertimeApproval';
import RekapSPL from '../components/RekapSPL';
import { toast } from 'sonner';
import { PageContainer, PageHeader } from '@/components/ui/page-layout';
import { CheckCircle2, XCircle, Clock, RefreshCcw, Upload, FileText, Image as ImageIcon, Settings, Printer, Users } from 'lucide-react';
import api from '../../../api/axios';
import { useAuth } from '../../../context/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Dafnom Month Selector Component
const DafnomMonthSelector = () => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()));

  const months = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ];

  const years = Array.from({ length: 5 }, (_, i) => ({
    value: String(currentDate.getFullYear() - 2 + i),
    label: String(currentDate.getFullYear() - 2 + i)
  }));

  return (
    <div className="space-y-4">
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Pilih Periode Dafnom</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-40">
              <Label className="text-xs mb-1 block">Bulan</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-28">
              <Label className="text-xs mb-1 block">Tahun</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      <DafnomLembur month={selectedMonth} year={selectedYear} />
    </div>
  );
};

// Dafnom SPL Selector Component
const DafnomSPLSelector = () => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()));

  const months = [
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ];

  const years = Array.from({ length: 5 }, (_, i) => ({
    value: String(currentDate.getFullYear() - 2 + i),
    label: String(currentDate.getFullYear() - 2 + i)
  }));

  return (
    <div className="space-y-4">
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Pilih Periode Dafnom per SPL</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-40">
              <Label className="text-xs mb-1 block">Bulan</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-28">
              <Label className="text-xs mb-1 block">Tahun</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      <DafnomSPL month={selectedMonth} year={selectedYear} />
    </div>
  );
};

const ManajemenLembur = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pengajuan');
  const [loading, setLoading] = useState(false);
  const [batchRefresh, setBatchRefresh] = useState(0);
  
  // Data States
  const [requests, setRequests] = useState([]);
  const [rekapData, setRekapData] = useState([]);
  
  // Form State
  const [formData, setFormData] = useState({
      date: '',
      startTime: '',
      endTime: '',
      description: '',
      is_holiday: false,
      spl_file: null,
      evidence_files: []
  });

  useEffect(() => {
      if (activeTab === 'persetujuan' || activeTab === 'pengajuan') {
          fetchRequests();
      }
      if (activeTab === 'rekap') {
          fetchRekap();
      }
  }, [activeTab]);

  const fetchRequests = async () => {
      try {
          const res = await api.get('/api/kepegawaian/overtime', {
              params: { status: activeTab === 'persetujuan' ? 'Pending' : undefined }
          });
          setRequests(res.data);
      } catch (e) {
          console.error("Fetch requests failed", e);
      }
  };

  const fetchRekap = async () => {
      try {
          const res = await api.get('/api/kepegawaian/overtime/recap');
          setRekapData(res.data);
      } catch (e) {
          console.error("Fetch rekap failed", e);
      }
  };

  const handleFileUpload = async (file, type) => {
      const form = new FormData();
      form.append('file', file);
      form.append('type', type);
      
      try {
          const res = await api.post('/api/kepegawaian/upload', form, {
              headers: { 'Content-Type': 'multipart/form-data' }
          });
          return res.data.url;
      } catch (e) {
          toast.error("Gagal upload file");
          throw e;
      }
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      const t = toast.loading("Mengirim pengajuan...");
      
      try {
          let splUrl = null;
          let evidenceUrls = [];

          // Upload SPL
          if (formData.spl_file) {
              splUrl = await handleFileUpload(formData.spl_file, 'spl');
          }

          // Upload Evidence
          if (formData.evidence_files.length > 0) {
              for (const file of formData.evidence_files) {
                  const url = await handleFileUpload(file, 'evidence');
                  evidenceUrls.push(url);
              }
          }

          const payload = {
              ...formData,
              start_time: formData.startTime,
              end_time: formData.endTime,
              spl_file: splUrl,
              evidence_files: evidenceUrls
          };

          await api.post('/api/kepegawaian/overtime', payload);
          toast.success("Pengajuan lembur berhasil dikirim", { id: t });
          setFormData({ 
              date: '', startTime: '', endTime: '', description: '', 
              is_holiday: false, spl_file: null, evidence_files: [] 
          });
          if(activeTab === 'pengajuan') fetchRequests(); 
      } catch (e) {
          console.error(e);
          const errorMsg = e.response?.data?.detail 
            ? (typeof e.response.data.detail === 'object' ? JSON.stringify(e.response.data.detail) : e.response.data.detail)
            : "Gagal mengajukan lembur";
          toast.error(errorMsg, { id: t });
      } finally {
          setLoading(false);
      }
  };

  const handleAction = async (id, action) => {
      try {
          await api.patch(`/api/kepegawaian/overtime/${id}/${action}`);
          toast.success(`Berhasil ${action === 'approve' ? 'menyetujui' : 'menolak'} lembur`);
          fetchRequests();
      } catch (e) {
          toast.error("Gagal memproses");
      }
  };

  const calculateDuration = () => {
      if(formData.startTime && formData.endTime) {
          const t1 = new Date(`2000-01-01T${formData.startTime}`);
          let t2 = new Date(`2000-01-01T${formData.endTime}`);
          if (t2 < t1) t2.setDate(t2.getDate() + 1);
          const diff = (t2 - t1) / 1000 / 3600;
          return diff > 0 ? diff.toFixed(1) + " Jam" : "Invalid Time";
      }
      return "-";
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Manajemen Lembur" 
        description="Pengajuan, persetujuan, dan rekapitulasi lembur pegawai dengan aturan Depnaker/PMK."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full md:w-[700px] grid-cols-5">
          <TabsTrigger value="pengajuan">
            <Users className="w-4 h-4 mr-1 hidden sm:inline" />Pengajuan
          </TabsTrigger>
          <TabsTrigger value="daftar">Daftar SPL</TabsTrigger>
          <TabsTrigger value="persetujuan">Persetujuan</TabsTrigger>
          <TabsTrigger value="rekap">Laporan</TabsTrigger>
          {user?.role === 'admin' && <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-1"/>Aturan</TabsTrigger>}
        </TabsList>

        {/* --- PENGATURAN (ADMIN ONLY) --- */}
        {user?.role === 'admin' && (
            <TabsContent value="settings">
                <OvertimeSettings />
            </TabsContent>
        )}

        {/* --- PENGAJUAN (NEW RANGE FORM) --- */}
        <TabsContent value="pengajuan" className="space-y-4">
            <OvertimeRangeForm onSuccess={() => setBatchRefresh(prev => prev + 1)} />
        </TabsContent>

        {/* --- DAFTAR SPL --- */}
        <TabsContent value="daftar" className="space-y-4">
            <OvertimeBatchList refreshTrigger={batchRefresh} />
        </TabsContent>

        {/* --- PERSETUJUAN --- */}
        <TabsContent value="persetujuan">
            <OvertimeApproval refreshTrigger={batchRefresh} />
        </TabsContent>

        {/* --- REKAP & DAFNOM --- */}
        <TabsContent value="rekap" className="space-y-6">
          <Tabs defaultValue="spl" className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-4 flex-wrap">
                  <TabsTrigger value="spl" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 py-2">Rekap per SPL</TabsTrigger>
                  <TabsTrigger value="list" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 py-2">Rekap per Pegawai</TabsTrigger>
                  <TabsTrigger value="dafnom-pegawai" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 py-2">Dafnom per Pegawai</TabsTrigger>
                  <TabsTrigger value="dafnom-spl" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 py-2">Dafnom per SPL</TabsTrigger>
              </TabsList>
              
              <TabsContent value="spl" className="pt-4">
                  <RekapSPL />
              </TabsContent>
              
              <TabsContent value="list" className="pt-4">
                  <RekapLemburTable data={rekapData} month={String(new Date().getMonth() + 1).padStart(2, '0')} year={String(new Date().getFullYear())} />
              </TabsContent>
              
              <TabsContent value="dafnom-pegawai" className="pt-4">
                  <DafnomMonthSelector />
              </TabsContent>
              
              <TabsContent value="dafnom-spl" className="pt-4">
                  <DafnomSPLSelector />
              </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default ManajemenLembur;
