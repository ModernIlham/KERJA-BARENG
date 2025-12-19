import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import RekapLemburTable from '../components/RekapLemburTable';
import { toast } from 'sonner';

// Mock Data
const mockRequests = [
  { id: 1, name: 'Budi Santoso', date: '2023-10-01', start: '17:00', end: '21:00', duration: 4, reason: 'Deadline Laporan', status: 'pending' },
  { id: 2, name: 'Siti Aminah', date: '2023-10-02', start: '17:00', end: '19:00', duration: 2, reason: 'Rapat Koordinasi', status: 'approved' },
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manajemen Lembur</h1>
        <p className="text-muted-foreground">Kelola pengajuan dan rekapitulasi lembur pegawai</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pengajuan">Form Pengajuan</TabsTrigger>
          <TabsTrigger value="persetujuan">Persetujuan (Admin)</TabsTrigger>
          <TabsTrigger value="rekap">Laporan & Rekap</TabsTrigger>
        </TabsList>

        <TabsContent value="pengajuan">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Ajukan Lembur</CardTitle>
              <CardDescription>Silahkan isi form di bawah ini untuk mengajukan lembur.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Tanggal</Label>
                        <Input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label>Durasi (Estimasi)</Label>
                        <Input disabled value="Auto-calculated" />
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
                    <Label>Keterangan Pekerjaan</Label>
                    <Textarea placeholder="Jelaskan pekerjaan yang dilakukan..." required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                <Button type="submit" className="w-full">Kirim Pengajuan</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="persetujuan">
            <Card>
                <CardHeader>
                    <CardTitle>Daftar Pengajuan Menunggu Persetujuan</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {mockRequests.map(req => (
                            <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                                <div>
                                    <h4 className="font-semibold">{req.name}</h4>
                                    <p className="text-sm text-muted-foreground">{req.date} • {req.start} - {req.end} ({req.duration} jam)</p>
                                    <p className="text-sm mt-1">"{req.reason}"</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="destructive">Tolak</Button>
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700">Setujui</Button>
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
    </div>
  );
};

export default ManajemenLembur;
