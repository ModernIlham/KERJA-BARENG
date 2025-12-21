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
import OvertimeSettings from '../components/OvertimeSettings';
import OvertimeBatchForm from '../components/OvertimeBatchForm';
import OvertimeBatchList from '../components/OvertimeBatchList';
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

        {/* --- PENGAJUAN (NEW BATCH FORM) --- */}
        <TabsContent value="pengajuan" className="space-y-4">
            <OvertimeBatchForm onSuccess={() => setBatchRefresh(prev => prev + 1)} />
        </TabsContent>

        {/* --- DAFTAR SPL --- */}
        <TabsContent value="daftar" className="space-y-4">
            <OvertimeBatchList refreshTrigger={batchRefresh} />
        </TabsContent>

        {/* --- PERSETUJUAN --- */}
        <TabsContent value="persetujuan">
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Menunggu Persetujuan</CardTitle>
                        <CardDescription>Daftar pengajuan lembur yang memerlukan tindakan.</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={fetchRequests}><RefreshCcw className="w-4 h-4"/></Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {requests.filter(r => r.status === 'Pending').length === 0 ? (
                            <div className="text-center py-8 text-slate-500">Tidak ada pengajuan yang perlu disetujui.</div>
                        ) : (
                            requests.filter(r => r.status === 'Pending').map(req => (
                                <div key={req.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border border-slate-100 rounded-lg bg-white hover:bg-slate-50 transition-colors">
                                    <div className="flex items-start gap-4 mb-4 md:mb-0 flex-1">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-full mt-1 shrink-0">
                                            <Clock size={20} />
                                        </div>
                                        <div className="space-y-1 w-full">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-semibold text-slate-900">{req.nama_lengkap} <span className="text-xs font-normal text-slate-500">({req.employee_type})</span></h4>
                                                <div className="text-xs text-slate-400">
                                                    Estimasi: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(req.net_pay)}
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                                                <span className="font-medium text-slate-700">{req.date}</span>
                                                <span>•</span>
                                                <span>{req.start_time} - {req.end_time}</span>
                                                <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-semibold">{req.duration_hours} Jam</span>
                                                {req.is_holiday && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-bold">Libur</span>}
                                            </div>
                                            
                                            <p className="text-sm mt-2 text-slate-600 italic bg-slate-50 p-2 rounded">"{req.description}"</p>
                                            
                                            <div className="flex gap-2 pt-2">
                                                {req.spl_file && (
                                                    <a href={req.spl_file} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100">
                                                        <FileText size={12}/> Lihat SPL
                                                    </a>
                                                )}
                                                {req.evidence_files?.map((url, idx) => (
                                                    <a key={idx} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200 hover:bg-slate-200">
                                                        <ImageIcon size={12}/> Foto {idx+1}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full md:w-auto md:ml-4">
                                        <Button size="sm" variant="outline" onClick={() => handleAction(req.id, 'reject')} className="flex-1 md:flex-none border-red-200 text-red-700 hover:bg-red-50">
                                            <XCircle className="w-4 h-4 mr-2"/> Tolak
                                        </Button>
                                        <Button size="sm" onClick={() => handleAction(req.id, 'approve')} className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white">
                                            <CheckCircle2 className="w-4 h-4 mr-2"/> Setujui
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        {/* --- REKAP & DAFNOM --- */}
        <TabsContent value="rekap" className="space-y-6">
          <Tabs defaultValue="spl" className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6">
                  <TabsTrigger value="spl" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 py-2">Rekap per SPL</TabsTrigger>
                  <TabsTrigger value="list" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 py-2">Rekapitulasi per Pegawai</TabsTrigger>
                  <TabsTrigger value="dafnom" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-0 py-2">Cetak Dafnom (PDF)</TabsTrigger>
              </TabsList>
              
              <TabsContent value="spl" className="pt-4">
                  <RekapSPL />
              </TabsContent>
              
              <TabsContent value="list" className="pt-4">
                  <RekapLemburTable data={rekapData} />
              </TabsContent>
              
              <TabsContent value="dafnom" className="pt-4">
                  <DafnomMonthSelector />
              </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default ManajemenLembur;
