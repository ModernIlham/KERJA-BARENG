import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { 
  Bell, AlertTriangle, AlertCircle, Clock, CheckCircle, XCircle,
  User, Package, FileText, Calendar, ChevronRight, Search,
  Filter, RefreshCw, Eye, ArrowRight, Printer, Download,
  TrendingUp, Users, Warehouse, RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PRIORITY_STYLES = {
  KRITIS: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', icon: '🔴' },
  TINGGI: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', icon: '🟠' },
  SEDANG: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', icon: '🟡' },
  RENDAH: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', icon: '🔵' },
  PERSIAPAN: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', icon: '⚪' },
  INFO: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', icon: '⚫' }
};

const ALERT_TYPE_ICONS = {
  PENSIUN: '🎖️',
  HABIS_KONTRAK: '📄',
  HABIS_PENUGASAN: '🔄',
  MUTASI: '🚀',
  MENINGGAL: '🕊️',
  KELUAR: '🚪',
  PERUBAHAN_JABATAN: '📊'
};

export default function NotificationList() {
  const navigate = useNavigate();
  
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  
  // Filters
  const [priority, setPriority] = useState('');
  const [alertType, setAlertType] = useState('');
  const [daysAhead, setDaysAhead] = useState(60);
  const [search, setSearch] = useState('');
  
  // Modals
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isActionOpen, setIsActionOpen] = useState(false);
  
  // Action form
  const [actionType, setActionType] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [docType, setDocType] = useState('');
  
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        days_ahead: daysAhead,
        include_overdue: true,
        page: 1,
        limit: 100
      };
      if (priority) params.priority = priority;
      if (alertType) params.alert_type = alertType;
      
      const res = await api.get('/api/notifications/alerts', { params });
      let data = res.data.data || [];
      
      // Apply search filter on frontend
      if (search) {
        const searchLower = search.toLowerCase();
        data = data.filter(a => 
          a.pegawai_nama?.toLowerCase().includes(searchLower) ||
          a.pegawai_nip?.toLowerCase().includes(searchLower) ||
          a.pegawai_unit?.toLowerCase().includes(searchLower)
        );
      }
      
      setAlerts(data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      toast.error('Gagal memuat notifikasi');
    } finally {
      setLoading(false);
    }
  }, [priority, alertType, daysAhead, search]);
  
  const fetchSummary = async () => {
    try {
      const res = await api.get('/api/notifications/alerts/summary', { 
        params: { days_ahead: daysAhead } 
      });
      setSummary(res.data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchAlerts();
      fetchSummary();
    }, 300);
    return () => clearTimeout(timeout);
  }, [fetchAlerts, daysAhead]);
  
  const openDetail = async (alert) => {
    try {
      const res = await api.get(`/api/notifications/alerts/${alert.id}`);
      setSelectedAlert(res.data);
      setIsDetailOpen(true);
    } catch (e) {
      // Use local data if detail fetch fails
      setSelectedAlert(alert);
      setIsDetailOpen(true);
    }
  };
  
  const openAction = (alert) => {
    setSelectedAlert(alert);
    setActionType('');
    setActionNotes('');
    setDocType('');
    setIsActionOpen(true);
  };
  
  const handleAction = async () => {
    if (!actionType) {
      toast.error('Pilih tindakan');
      return;
    }
    
    try {
      await api.post(`/api/notifications/alerts/${selectedAlert.id}/action`, {
        action: actionType,
        notes: actionNotes,
        doc_type: docType || null
      });
      toast.success('Tindakan berhasil diproses');
      setIsActionOpen(false);
      fetchAlerts();
    } catch (e) {
      toast.error('Gagal memproses tindakan');
    }
  };
  
  const goToAsetPegawai = (pegawaiId) => {
    navigate(`/aset-pegawai?pegawai_id=${pegawaiId}`);
  };
  
  const goToGudang = () => {
    navigate('/gudang');
  };
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  };
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };
  
  const getDaysLabel = (days) => {
    if (days < 0) {
      return <span className="text-red-600 font-bold">Terlambat {Math.abs(days)} hari</span>;
    } else if (days === 0) {
      return <span className="text-red-600 font-bold">Hari Ini!</span>;
    } else if (days === 1) {
      return <span className="text-orange-600 font-bold">Besok!</span>;
    } else if (days <= 7) {
      return <span className="text-orange-600 font-semibold">{days} hari lagi</span>;
    } else if (days <= 14) {
      return <span className="text-yellow-600">{days} hari lagi</span>;
    } else {
      return <span className="text-slate-600">{days} hari lagi</span>;
    }
  };
  
  const getPriorityStyle = (priority) => {
    return PRIORITY_STYLES[priority] || PRIORITY_STYLES.INFO;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6 text-amber-500" />
            Notifikasi Pengembalian Aset
          </h1>
          <p className="text-sm text-slate-500">
            Peringatan untuk aset yang perlu dikembalikan (pensiun, kontrak habis, dll.)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={goToGudang}>
            <Warehouse className="mr-2 h-4 w-4" />
            Ke Gudang
          </Button>
          <Button variant="outline" onClick={() => { fetchAlerts(); fetchSummary(); }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className={`${summary.by_priority?.kritis > 0 ? 'bg-red-50 border-red-200 animate-pulse' : 'bg-slate-50'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-medium">Kritis</p>
                  <p className={`text-2xl font-bold ${summary.by_priority?.kritis > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                    {summary.by_priority?.kritis || 0}
                  </p>
                </div>
                <AlertTriangle className={`h-8 w-8 ${summary.by_priority?.kritis > 0 ? 'text-red-400' : 'text-slate-300'}`} />
              </div>
            </CardContent>
          </Card>
          
          <Card className={`${summary.by_priority?.tinggi > 0 ? 'bg-orange-50 border-orange-200' : 'bg-slate-50'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-medium">Tinggi</p>
                  <p className={`text-2xl font-bold ${summary.by_priority?.tinggi > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                    {summary.by_priority?.tinggi || 0}
                  </p>
                </div>
                <AlertCircle className={`h-8 w-8 ${summary.by_priority?.tinggi > 0 ? 'text-orange-400' : 'text-slate-300'}`} />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-medium">Sedang + Rendah</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {(summary.by_priority?.sedang || 0) + (summary.by_priority?.rendah || 0)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-medium">Total Aset Berisiko</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {summary.total_assets_at_risk || 0}
                  </p>
                </div>
                <Package className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-medium">Nilai Aset</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {formatCurrency(summary.total_value_at_risk).replace('Rp', '')}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Alert Type Summary */}
      {summary?.by_type && Object.keys(summary.by_type).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(summary.by_type).map(([type, data]) => (
            <Badge 
              key={type} 
              variant="outline" 
              className="cursor-pointer hover:bg-slate-100"
              onClick={() => setAlertType(alertType === type ? '' : type)}
            >
              <span className="mr-1">{data.icon}</span>
              {data.label}: {data.count}
            </Badge>
          ))}
        </div>
      )}
      
      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-slate-500">Cari Pegawai</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input 
                  placeholder="Nama, NIP, Unit..." 
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="w-[150px]">
              <Label className="text-xs text-slate-500">Prioritas</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v === 'ALL' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Prioritas</SelectItem>
                  <SelectItem value="KRITIS">🔴 Kritis</SelectItem>
                  <SelectItem value="TINGGI">🟠 Tinggi</SelectItem>
                  <SelectItem value="SEDANG">🟡 Sedang</SelectItem>
                  <SelectItem value="RENDAH">🔵 Rendah</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-[180px]">
              <Label className="text-xs text-slate-500">Jenis Alert</Label>
              <Select value={alertType} onValueChange={(v) => setAlertType(v === 'ALL' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Jenis</SelectItem>
                  <SelectItem value="PENSIUN">🎖️ Pensiun</SelectItem>
                  <SelectItem value="HABIS_KONTRAK">📄 Habis Kontrak</SelectItem>
                  <SelectItem value="HABIS_PENUGASAN">🔄 Habis Penugasan</SelectItem>
                  <SelectItem value="MUTASI">🚀 Mutasi</SelectItem>
                  <SelectItem value="MENINGGAL">🕊️ Meninggal</SelectItem>
                  <SelectItem value="KELUAR">🚪 Keluar/Resign</SelectItem>
                  <SelectItem value="PERUBAHAN_JABATAN">📊 Perubahan Jabatan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-[140px]">
              <Label className="text-xs text-slate-500">Rentang Waktu</Label>
              <Select value={daysAhead.toString()} onValueChange={(v) => setDaysAhead(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 hari</SelectItem>
                  <SelectItem value="14">14 hari</SelectItem>
                  <SelectItem value="30">30 hari</SelectItem>
                  <SelectItem value="60">60 hari</SelectItem>
                  <SelectItem value="90">90 hari</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {(priority || alertType || search) && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => { setPriority(''); setAlertType(''); setSearch(''); }}
              >
                <XCircle className="mr-1 h-4 w-4" /> Reset Filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Alerts Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Daftar Notifikasi ({alerts.length})</span>
            {summary?.overdue_count > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {summary.overdue_count} Terlambat!
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[80px]">Prioritas</TableHead>
                  <TableHead>Pegawai</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Tanggal Target</TableHead>
                  <TableHead className="text-center">Aset</TableHead>
                  <TableHead>Dokumen</TableHead>
                  <TableHead className="text-center w-[120px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2 text-slate-500">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Memuat notifikasi...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : alerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-slate-500">
                        <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-400" />
                        <p>Tidak ada notifikasi dalam rentang waktu ini</p>
                        <p className="text-xs mt-1">Semua aset dalam kondisi aman</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  alerts.map((alert) => {
                    const style = getPriorityStyle(alert.priority);
                    return (
                      <TableRow 
                        key={alert.id} 
                        className={`hover:bg-slate-50 ${alert.is_overdue ? 'bg-red-50' : ''} ${alert.is_incident ? 'border-l-4 border-l-red-500' : ''}`}
                      >
                        <TableCell>
                          <Badge className={`${style.bg} ${style.text} ${style.border} border`}>
                            {style.icon} {alert.priority_label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-900 flex items-center gap-1">
                              <User className="h-3 w-3 text-slate-400" />
                              {alert.pegawai_nama}
                            </div>
                            <div className="text-xs text-slate-500">{alert.pegawai_nip || '-'}</div>
                            <div className="text-xs text-slate-400">{alert.pegawai_unit}</div>
                            {alert.pegawai_jabatan && (
                              <div className="text-xs text-blue-600">{alert.pegawai_jabatan}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-lg">{ALERT_TYPE_ICONS[alert.alert_type] || '⚠️'}</span>
                            <div>
                              <div className="font-medium text-sm">{alert.alert_label}</div>
                              <div className="text-xs text-slate-500">{alert.alert_description}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="font-medium text-sm flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              {formatDate(alert.target_date)}
                            </div>
                            <div className="text-xs">
                              {getDaysLabel(alert.days_remaining)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="space-y-0.5">
                            <Badge variant="outline" className="font-bold">
                              <Package className="h-3 w-3 mr-1" />
                              {alert.asset_count}
                            </Badge>
                            <div className="text-xs text-slate-500">
                              {formatCurrency(alert.total_asset_value)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {alert.dokumen_required?.map((doc) => (
                              <Badge key={doc} variant="outline" className="text-xs">
                                <FileText className="h-2 w-2 mr-0.5" />
                                {doc}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => openDetail(alert)}
                              className="h-8 w-8 p-0"
                              title="Lihat Detail"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => openAction(alert)}
                              className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                              title="Tindak Lanjut"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{ALERT_TYPE_ICONS[selectedAlert?.alert_type] || '⚠️'}</span>
              Detail Notifikasi
            </DialogTitle>
            <DialogDescription>
              {selectedAlert?.alert_label} - {selectedAlert?.pegawai_nama}
            </DialogDescription>
          </DialogHeader>
          
          {selectedAlert && (
            <div className="space-y-6">
              {/* Priority Banner */}
              <div className={`p-4 rounded-lg ${getPriorityStyle(selectedAlert.priority).bg} ${getPriorityStyle(selectedAlert.priority).border} border`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getPriorityStyle(selectedAlert.priority).icon}</span>
                    <div>
                      <div className={`font-bold text-lg ${getPriorityStyle(selectedAlert.priority).text}`}>
                        Prioritas {selectedAlert.priority_label}
                      </div>
                      <div className="text-sm">
                        {getDaysLabel(selectedAlert.days_remaining)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-600">Target: {formatDate(selectedAlert.target_date)}</div>
                  </div>
                </div>
              </div>
              
              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" /> Informasi Pegawai
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><span className="text-slate-500">Nama:</span> <strong>{selectedAlert.pegawai_nama}</strong></div>
                    <div><span className="text-slate-500">NIP:</span> {selectedAlert.pegawai_nip || '-'}</div>
                    <div><span className="text-slate-500">Jabatan:</span> {selectedAlert.pegawai_jabatan || '-'}</div>
                    <div><span className="text-slate-500">Unit:</span> {selectedAlert.pegawai_unit || '-'}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="h-4 w-4" /> Ringkasan Aset
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><span className="text-slate-500">Jumlah Aset:</span> <strong>{selectedAlert.asset_count}</strong> unit</div>
                    <div><span className="text-slate-500">Total Nilai:</span> <strong>{formatCurrency(selectedAlert.total_asset_value)}</strong></div>
                    <div className="pt-2">
                      <span className="text-slate-500">Dokumen Diperlukan:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedAlert.dokumen_required?.map((doc) => (
                          <Badge key={doc} variant="secondary">{doc}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Assets List */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Daftar Aset yang Dipegang</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode Aset</TableHead>
                        <TableHead>Nama Aset</TableHead>
                        <TableHead>Kondisi</TableHead>
                        <TableHead className="text-right">Nilai</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedAlert.assets?.map((asset, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{asset.kode_aset}</TableCell>
                          <TableCell>{asset.nama_aset}</TableCell>
                          <TableCell>
                            <Badge variant={asset.kondisi === 'Baik' ? 'default' : 'destructive'}>
                              {asset.kondisi || 'Baik'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(asset.nilai_perolehan)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Tutup</Button>
            <Button onClick={() => goToAsetPegawai(selectedAlert?.pegawai_id)}>
              <ArrowRight className="mr-2 h-4 w-4" /> Ke Aset Pegawai
            </Button>
            <Button onClick={() => { setIsDetailOpen(false); openAction(selectedAlert); }} className="bg-amber-600 hover:bg-amber-700">
              <RotateCcw className="mr-2 h-4 w-4" /> Proses Pengembalian
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Action Modal */}
      <Dialog open={isActionOpen} onOpenChange={setIsActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tindak Lanjut Notifikasi</DialogTitle>
            <DialogDescription>
              {selectedAlert?.pegawai_nama} - {selectedAlert?.alert_label}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pilih Tindakan *</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tindakan..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress">📋 Tandai Sedang Diproses</SelectItem>
                  <SelectItem value="generate_doc">📄 Buat Dokumen</SelectItem>
                  <SelectItem value="complete">✅ Tandai Selesai</SelectItem>
                  <SelectItem value="dismiss">❌ Abaikan (Dismiss)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {actionType === 'generate_doc' && (
              <div className="space-y-2">
                <Label>Jenis Dokumen</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis dokumen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BAST">BAST (Berita Acara Serah Terima)</SelectItem>
                    <SelectItem value="SIP">SIP (Surat Izin Pemakaian)</SelectItem>
                    <SelectItem value="BASTO">BASTO (Berita Acara Serah Terima Operasional)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea 
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Tambahkan catatan..."
                rows={3}
              />
            </div>
            
            {/* Quick Actions */}
            <div className="pt-2 border-t">
              <Label className="text-xs text-slate-500 mb-2 block">Aksi Cepat:</Label>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => goToAsetPegawai(selectedAlert?.pegawai_id)}
                >
                  <Package className="mr-1 h-3 w-3" /> Lihat Aset Pegawai
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={goToGudang}
                >
                  <Warehouse className="mr-1 h-3 w-3" /> Ke Gudang
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActionOpen(false)}>Batal</Button>
            <Button onClick={handleAction} disabled={!actionType}>
              Proses Tindakan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
