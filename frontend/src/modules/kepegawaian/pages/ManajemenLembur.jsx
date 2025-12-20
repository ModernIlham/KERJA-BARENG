import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import RekapLemburTable from '../components/RekapLemburTable';
import { toast } from 'sonner';
import { PageContainer, PageHeader } from '@/components/ui/page-layout';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

// Mock Data
const mockRequests = [
  { id: 1, name: 'Budi Santoso', date: '2023-10-01', start: '17:00', end: '21:00', duration: 4, reason: 'Deadline Laporan Akhir Tahun', status: 'pending' },
  { id: 2, name: 'Siti Aminah', date: '2023-10-02', start: '17:00', end: '19:00', duration: 2, reason: 'Rapat Koordinasi Anggaran', status: 'approved' },
  { id: 3, name: 'Rudi Hermawan', date: '2023-10-03', start: '18:00', end: '20:00', duration: 2, reason: 'Maintenance Server', status: 'pending' },
];

const mockEmployees = [
  { id: 1, name: 'Budi Santoso', type: 'ASN', grade: 'III', totalHours: 12 },
  { id: 2, name: 'Siti Aminah', type: 'NON_ASN', grade: 'Senior', totalHours: 8 },
  { id: 3, name: 'Rudi Hermawan', type: 'ASN', grade: 'II', totalHours: 20 },
  { id: 4, name: 'Dewi Lestari', type: 'NON_ASN', grade: 'Junior', totalHours: 5 },
];

const ManajemenLembur = () => {
  const [activeTab, setActiveTab] = useState('pengajuan');
  const [formData, setFormData] = useState({
      date: '',
      startTime: '',
      endTime: '',
      description: ''
  });

  const handleSubmit = (e) => {
      e.preventDefault();
      toast.success("Pengajuan lembur berhasil dikirim");
      setFormData({ date: '', startTime: '', endTime: '', description: '' });
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
                            <Input disabled value="Auto-calculated" className="bg-slate-50" />
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
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white w-full md:w-auto">
                            Kirim Pengajuan
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
            </div>
          </div>
        </TabsContent>

        <TabsContent value="persetujuan">
            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle>Menunggu Persetujuan</CardTitle>
                    <CardDescription>Daftar pengajuan lembur yang memerlukan tindakan.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {mockRequests.map(req => (
                            <div key={req.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border border-slate-100 rounded-lg bg-white hover:bg-slate-50 transition-colors">
                                <div className="flex items-start gap-4 mb-4 md:mb-0">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-full mt-1">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-900">{req.name}</h4>
                                        <div className="flex flex-wrap gap-2 text-sm text-slate-500 mt-1">
                                            <span className="font-medium text-slate-700">{req.date}</span>
                                            <span>•</span>
                                            <span>{req.start} - {req.end}</span>
                                            <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-semibold">{req.duration} Jam</span>
                                        </div>
                                        <p className="text-sm mt-2 text-slate-600 italic">"{req.reason}"</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <Button size="sm" variant="outline" className="flex-1 md:flex-none border-red-200 text-red-700 hover:bg-red-50">
                                        <XCircle className="w-4 h-4 mr-2"/> Tolak
                                    </Button>
                                    <Button size="sm" className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white">
                                        <CheckCircle2 className="w-4 h-4 mr-2"/> Setujui
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="rekap">
          <RekapLemburTable data={mockEmployees} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default ManajemenLembur;
