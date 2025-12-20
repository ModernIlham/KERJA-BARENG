import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import RekapLemburTable from '../components/RekapLemburTable';
import { toast } from 'sonner';
import { PageContainer, PageHeader } from '@/components/ui/page-layout';
import { CheckCircle2, XCircle, Clock, RefreshCcw, Upload, FileText, Image as ImageIcon } from 'lucide-react';
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
                <CardDescription>Lengkapi data lembur beserta bukti pendukung (SPL).</CardDescription>
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
                    
                    <div className="flex items-center space-x-2 border p-3 rounded bg-yellow-50 border-yellow-200">
                        <Checkbox 
                            id="is_holiday" 
                            checked={formData.is_holiday}
                            onCheckedChange={(checked) => setFormData({...formData, is_holiday: checked})}
                        />
                        <Label htmlFor="is_holiday" className="font-medium text-yellow-800 cursor-pointer">
                            Hari Libur / Akhir Pekan (Rate Khusus)
                        </Label>
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
                            placeholder="Jelaskan secara detail..." 
                            required 
                            className="h-20"
                            value={formData.description} 
                            onChange={e => setFormData({...formData, description: e.target.value})} 
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Upload Surat Perintah (SPL)</Label>
                            <Input type="file" accept=".pdf,.jpg,.png" onChange={e => setFormData({...formData, spl_file: e.target.files[0]})} />
                            <p className="text-[10px] text-slate-500">PDF/JPG (Wajib untuk validasi)</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Bukti Foto Kegiatan</Label>
                            <Input type="file" accept="image/*" multiple onChange={e => setFormData({...formData, evidence_files: Array.from(e.target.files)})} />
                            <p className="text-[10px] text-slate-500">Bisa pilih banyak foto</p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white w-full md:w-auto">
                            {loading ? "Mengirim..." : "Kirim Pengajuan"}
                        </Button>
                    </div>
                </form>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <Card className="border-slate-200 h-full">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Riwayat Pengajuan</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[500px] overflow-y-auto space-y-3">
                        {requests.filter(r => r.user_id === user?.id).map(req => (
                            <div key={req.id} className="p-3 border rounded bg-slate-50 text-xs hover:bg-white transition-colors">
                                <div className="flex justify-between font-bold text-slate-800 mb-1">
                                    <span>{req.date}</span>
                                    <span className={`${req.status === 'Approved' ? 'text-green-600' : req.status === 'Rejected' ? 'text-red-600' : 'text-orange-600'}`}>{req.status}</span>
                                </div>
                                <div className="text-slate-600 mb-2">
                                    {req.start_time} - {req.end_time} ({req.duration_hours} Jam)
                                    {req.is_holiday && <span className="ml-2 text-[10px] bg-yellow-200 px-1 rounded text-yellow-800">Libur</span>}
                                </div>
                                <div className="flex gap-2">
                                    {req.spl_file && <a href={req.spl_file} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded hover:underline"><FileText size={10}/> SPL</a>}
                                    {req.evidence_files?.length > 0 && <span className="flex items-center gap-1 text-slate-500 bg-slate-200 px-2 py-1 rounded"><ImageIcon size={10}/> {req.evidence_files.length} Foto</span>}
                                </div>
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

        <TabsContent value="rekap">
          <RekapLemburTable data={rekapData} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default ManajemenLembur;
