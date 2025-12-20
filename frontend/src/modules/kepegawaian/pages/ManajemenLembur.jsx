import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import RekapLemburTable from '../components/RekapLemburTable';
import { toast } from 'sonner';
import { PageContainer, PageHeader } from '@/components/ui/page-layout';
import { CheckCircle2, XCircle, Clock, RefreshCcw } from 'lucide-react';
import api from '../../../api/axios';
import { useAuth } from '../../../context/AuthContext';

const ManajemenLembur = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pengajuan');
  const [loading, setLoading] = useState(false);
  
  // Data States
  const [requests, setRequests] = useState([]);
  const [rekapData, setRekapData] = useState([]);
  
  // Form State
  const [formData, setFormData] = useState({
      date: '',
      startTime: '',
      endTime: '',
      description: ''
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
          // If admin, show pending requests. If user, show own history?
          // The API endpoint /overtime handles filtering by role.
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

  const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
          await api.post('/api/kepegawaian/overtime', formData);
          toast.success("Pengajuan lembur berhasil dikirim");
          setFormData({ date: '', startTime: '', endTime: '', description: '' });
          if(activeTab === 'pengajuan') fetchRequests(); // Refresh list if showing history
      } catch (e) {
          toast.error(e.response?.data?.detail || "Gagal mengajukan lembur");
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

  // Helper to calculate duration for preview
  const calculateDuration = () => {
      if(formData.startTime && formData.endTime) {
          const t1 = new Date(`2000-01-01T${formData.startTime}`);
          const t2 = new Date(`2000-01-01T${formData.endTime}`);
          const diff = (t2 - t1) / 1000 / 3600;
          return diff > 0 ? diff.toFixed(1) + " Jam" : "Invalid Time";
      }
      return "-";
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Manajemen Lembur" 
        description="Pengajuan, persetujuan, dan rekapitulasi lembur pegawai."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full md:w-[400px] grid-cols-3">
          <TabsTrigger value="pengajuan">Pengajuan</TabsTrigger>
          <TabsTrigger value="persetujuan">Persetujuan</TabsTrigger>
          <TabsTrigger value="rekap">Laporan</TabsTrigger>
        </TabsList>

        <TabsContent value="pengajuan" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <Card className="md:col-span-2 border-slate-200 shadow-sm">
                <CardHeader>
                <CardTitle>Form Pengajuan Lembur</CardTitle>
                <CardDescription>Isi detail rencana lembur anda.</CardDescription>
                </CardHeader>
                <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tanggal Pelaksanaan</Label>
                            <Input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Estimasi Durasi</Label>
                            <Input disabled value={calculateDuration()} className="bg-slate-50" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Jam Mulai</Label>
                            <Input type="time" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label>Jam Selesai</Label>
                            <Input type="time" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Uraian Pekerjaan</Label>
                        <Textarea 
                            placeholder="Jelaskan secara detail pekerjaan yang akan dilakukan..." 
                            required 
                            className="h-24"
                            value={formData.description} 
                            onChange={e => setFormData({...formData, description: e.target.value})} 
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white w-full md:w-auto">
                            {loading ? "Mengirim..." : "Kirim Pengajuan"}
                        </Button>
                    </div>
                </form>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <Card className="bg-blue-50 border-blue-100">
                    <CardHeader>
                        <CardTitle className="text-blue-800 text-sm">Ketentuan Lembur</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-blue-700 space-y-2">
                        <p>• Lembur wajib mendapatkan persetujuan atasan.</p>
                        <p>• Uang makan diberikan jika durasi {'>'}= 4 jam.</p>
                        <p>• Maksimal jam lembur adalah 4 jam per hari (kecuali urgensi tinggi).</p>
                    </CardContent>
                </Card>
                
                {/* History List */}
                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Riwayat Pengajuan</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[300px] overflow-y-auto space-y-2">
                        {requests.filter(r => r.user_id === user?.id).map(req => (
                            <div key={req.id} className="p-2 border rounded bg-slate-50 text-xs">
                                <div className="flex justify-between font-semibold">
                                    <span>{req.date}</span>
                                    <span className={`${req.status === 'Approved' ? 'text-green-600' : req.status === 'Rejected' ? 'text-red-600' : 'text-orange-600'}`}>{req.status}</span>
                                </div>
                                <div className="text-slate-500 mt-1">{req.start_time}-{req.end_time}</div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
          </div>
        </TabsContent>

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
                                    <div className="flex items-start gap-4 mb-4 md:mb-0">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-full mt-1">
                                            <Clock size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-900">{req.nama_lengkap} <span className="text-xs font-normal text-slate-500">({req.employee_type})</span></h4>
                                            <div className="flex flex-wrap gap-2 text-sm text-slate-500 mt-1">
                                                <span className="font-medium text-slate-700">{req.date}</span>
                                                <span>•</span>
                                                <span>{req.start_time} - {req.end_time}</span>
                                                <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-semibold">{req.duration_hours} Jam</span>
                                            </div>
                                            <p className="text-sm mt-2 text-slate-600 italic">"{req.description}"</p>
                                            <div className="mt-1 text-xs text-slate-400">
                                                Estimasi: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(req.net_pay)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full md:w-auto">
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

        <TabsContent value="rekap">
          <RekapLemburTable data={rekapData} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default ManajemenLembur;
