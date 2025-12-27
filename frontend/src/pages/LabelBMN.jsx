
/**
 * LabelBMN.jsx - Halaman Manajemen Pelabelan Stiker BMN
 * Refactored: Components moved to ./components/
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../api/axios';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Printer, LayoutGrid, Settings2, History, QrCode, Tag,
  RefreshCw, CheckCircle2, XCircle, Package, Trash2
} from 'lucide-react';
import { toast } from 'sonner';

// Import Refactored Components
import StickerCanvasEditor from './LabelBMN/components/StickerCanvasEditor';
import { PencilRuler } from 'lucide-react';

import AssetTable from './LabelBMN/components/AssetTable';
import PrintPage from './LabelBMN/components/PrintPage';
import PrintHistoryTab from './LabelBMN/components/PrintHistoryTab';
import QRCustomizationPanel from './LabelBMN/components/QRCustomizationPanel';
import StickerDesignTab from './LabelBMN/components/StickerDesignTab';
import ChildAssetModal from './LabelBMN/components/ChildAssetModal';

// ==================== CONSTANTS ====================
const STICKER_SIZES = {
  kecil: { width: 23.8, height: 39.8, label: 'Kecil (2.38x3.98cm)', desc: 'Aksesori' },
  sedang: { width: 69.8, height: 22.1, label: 'Sedang (6.98x2.21cm)', desc: 'Standar' },
  besar: { width: 94.9, height: 32.2, label: 'Besar (9.49x3.22cm)', desc: 'Mesin Besar' }
};

const CANVAS_SIZES = {
  A4: { width: 210, height: 297, label: 'A4 (210x297mm)' },
  A3: { width: 297, height: 420, label: 'A3 (297x420mm)' }
};

const DEFAULT_QR_SETTINGS = {
  size: 200,
  margin: 0,
  dotsColor: '#000000',
  dotsStyle: 'square',
  cornerSquareColor: '#000000',
  cornerSquareStyle: 'square',
  cornerDotColor: '#000000',
  cornerDotStyle: 'square',
  backgroundColor: '#ffffff',
  logoEnabled: true,
  logoSize: 25,
  logoBackgroundEnabled: true,
  logoBackgroundColor: '#ffffff',
  errorCorrectionLevel: 'M'
};

export default function LabelBMN() {
  // State: Assets & Selection
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectingAll, setSelectingAll] = useState(false);
  
  // State: Filters
  const [filters, setFilters] = useState({
    search: '',
    status: 'semua',
    nup: '',
    tahun: '',
    nilaiMin: '',
    nilaiMax: '',
    sortField: 'kode_barang',
    sortOrder: 'asc'
  });

  // State: UI & Tabs
  const [activeTab, setActiveTab] = useState('daftar');
  const [showPrintPage, setShowPrintPage] = useState(false);
  const [showChildModal, setShowChildModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  
  // State: Printing & Design
  const [canvasSize, setCanvasSize] = useState('A4');
  const [selectedSize, setSelectedSize] = useState('sedang'); // Default size for quick select
  const [qrSettings, setQrSettings] = useState(DEFAULT_QR_SETTINGS);
  const [instansi, setInstansi] = useState(null);
  const [qrTemplates, setQrTemplates] = useState([]);
  const [stats, setStats] = useState(null);
  
  // State: Active Designs
  const [activeDesigns, setActiveDesigns] = useState(null);
  
  // State: PDF Generation
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfJobs, setPdfJobs] = useState([]);

  // ==================== EFFECTS ====================
  
  // Initial load
  useEffect(() => {
    loadInstansi();
    loadQrTemplates();
    loadStats();
    loadActiveDesigns();
  }, []); // Run only once on mount

  // Load assets when page or filters change
  useEffect(() => {
    loadAssets();
  }, [page, filters.search, filters.status, filters.nup, filters.tahun, filters.nilaiMin, filters.nilaiMax, filters.sortField, filters.sortOrder]); // Specific dependencies

  // Poll for PDF status
  useEffect(() => {
    if (pdfJobs.length === 0) return;
    
    const interval = setInterval(() => {
      pdfJobs.forEach(job => {
        if (job.status === 'processing' || job.status === 'pending') {
          checkPdfStatus(job.id);
        }
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, [pdfJobs]);

  // ==================== DATA LOADING ====================

  const loadAssets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/label-bmn/assets', {
        params: {
          page,
          limit: 20,
          search: filters.search || '',
          status_cetak: filters.status || 'semua',
          nup: filters.nup || '',
          tahun: filters.tahun || '',
          nilai_min: filters.nilaiMin || '',
          nilai_max: filters.nilaiMax || '',
          sort_by: filters.sortField || 'kode_barang',
          sort_order: filters.sortOrder || 'asc'
        }
      });
      console.log('Asset API Response:', res.data);
      if (res.data && res.data.data) {
        setAssets(res.data.data);
        setTotalPages(res.data.total_pages || res.data.meta?.total_pages || 1);
      } else {
        console.error('Invalid API response structure:', res.data);
        setAssets([]);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Error loading assets:', err);
      toast.error('Gagal memuat data aset');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const loadInstansi = async () => {
    try {
      const res = await api.get('/api/label-bmn/instansi-info');
      setInstansi(res.data);
    } catch {
      // Try fallback to settings instansi
      try {
        const res = await api.get('/api/settings/instansi');
        setInstansi(res.data);
      } catch {
        // Ignore error if instansi not set
      }
    }
  };

  const loadQrTemplates = async () => {
    try {
      const res = await api.get('/api/label-bmn/qr-templates');
      setQrTemplates(res.data);
      
      // Load active template
      const activeRes = await api.get('/api/label-bmn/qr-template/active').catch(() => ({ data: null }));
      if (activeRes.data && !activeRes.data.id?.startsWith('default')) {
        const { id, name, created_at, updated_at, created_by, ...settings } = activeRes.data;
        setQrSettings(prev => ({ ...prev, ...settings }));
      }
    } catch {
      // Ignore
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get('/api/label-bmn/print-stats');
      setStats(res.data);
    } catch {
      // Ignore
    }
  };
  
  const loadActiveDesigns = async () => {
    try {
      const [kecilRes, sedangRes, besarRes] = await Promise.all([
        api.get('/api/label-bmn/sticker-design/active/kecil').catch(() => ({ data: null })),
        api.get('/api/label-bmn/sticker-design/active/sedang').catch(() => ({ data: null })),
        api.get('/api/label-bmn/sticker-design/active/besar').catch(() => ({ data: null }))
      ]);
      
      const designs = {
        kecil: kecilRes.data,
        sedang: sedangRes.data,
        besar: besarRes.data
      };
      setActiveDesigns(designs);
    } catch {
      // Ignore
    }
  };

  // ==================== HANDLERS ====================

  const toggleSelect = (asset) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === asset.id);
      if (exists) return prev.filter(i => i.id !== asset.id);
      return [...prev, { ...asset, ukuran: selectedSize }];
    });
  };

  const selectAll = (checked) => {
    if (checked) {
      const newItems = assets.map(a => ({ ...a, ukuran: selectedSize }));
      // Merge with existing selection to avoid duplicates
      setSelectedItems(prev => {
        const existingIds = new Set(prev.map(i => i.id));
        const itemsToAdd = newItems.filter(i => !existingIds.has(i.id));
        return [...prev, ...itemsToAdd];
      });
    } else {
      // Deselect only items on current page
      const pageIds = new Set(assets.map(a => a.id));
      setSelectedItems(prev => prev.filter(i => !pageIds.has(i.id)));
    }
  };

  const selectAllPages = async () => {
    if (selectedItems.length > 0 && !selectingAll) {
      // Clear selection
      setSelectedItems([]);
      return;
    }

    setSelectingAll(true);
    try {
      // Fetch ALL IDs matching current filter
      const res = await api.post('/api/label-bmn/assets/all-ids', {
        search: filters.search,
        status_cetak: filters.status,
        nup: filters.nup,
        tahun: filters.tahun,
        nilai_min: filters.nilaiMin,
        nilai_max: filters.nilaiMax
      });
      
      const allIds = res.data.ids; // Array of {id, kode_barang, ...}
      
      // Transform to selection format
      const allItems = allIds.map(item => ({
        ...item,
        ukuran: selectedSize
      }));
      
      setSelectedItems(allItems);
      toast.success(`${allItems.length} aset dipilih dari semua halaman`);
    } catch (err) {
      toast.error('Gagal memilih semua data');
    } finally {
      setSelectingAll(false);
    }
  };

  const handlePrint = () => {
    if (selectedItems.length === 0) return toast.error('Pilih minimal 1 aset');
    setShowPrintPage(true);
  };

  const handlePrintComplete = async () => {
    try {
      // Log print activity
      await api.post('/api/label-bmn/print-batch', { 
        items: selectedItems.map(i => ({ 
          barang_id: i.id, 
          ukuran: i.ukuran 
        })), 
        canvas_size: canvasSize 
      });
      toast.success('Pencetakan berhasil dicatat');
      loadAssets(); // Refresh status
      loadStats();
      setSelectedItems([]);
    } catch (err) {
      toast.error('Gagal mencatat riwayat cetak');
    }
    setShowPrintPage(false);
  };

  const handleGeneratePdf = async (htmlContent) => {
    if (selectedItems.length === 0) {
      toast.error('Pilih minimal 1 aset');
      return;
    }
    
    setGeneratingPdf(true);
    try {
      const res = await api.post('/api/label-bmn/generate-pdf', {
        items: selectedItems.map(i => ({
          id: i.id,
          kode_barang: i.kode_barang,
          kode_register: i.kode_register,
          nama_barang: i.nama_barang,
          merk: i.merk,
          tipe: i.tipe,
          nup: i.nup,
          ukuran: i.ukuran,
          is_child: i.is_child,
          child_id: i.child_id
        })),
        canvas_size: canvasSize,
        qr_settings: qrSettings,
        html_content: htmlContent // Send HTML for 1:1 fidelity
      });
      
      const jobId = res.data.job_id;
      toast.success(`Proses cetak PDF dimulai (${selectedItems.length} stiker)`, {
        description: 'Anda akan diberitahu saat PDF siap diunduh'
      });
      
      setPdfJobs(prev => [...prev, { id: jobId, status: 'processing', progress: 0, total: selectedItems.length }]);
      setShowPrintPage(false);
      setSelectedItems([]); // Clear selection after starting job
      
    } catch (err) {
      toast.error('Gagal memulai proses cetak PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const checkPdfStatus = async (jobId) => {
    try {
      const res = await api.get(`/api/label-bmn/pdf-status/${jobId}`);
      const job = res.data;
      
      setPdfJobs(prev => prev.map(j => j.id === jobId ? job : j));
      
      if (job.status === 'completed') {
        toast.success('PDF Siap Diunduh!', {
          action: {
            label: 'Unduh',
            onClick: () => downloadPdf(jobId)
          }
        });
      } else if (job.status === 'failed') {
        toast.error(`Gagal membuat PDF: ${job.error}`);
      }
    } catch {
      // Ignore poll error
    }
  };

  const downloadPdf = async (jobId) => {
    try {
      window.open(`${process.env.REACT_APP_BACKEND_URL}/api/label-bmn/pdf/${jobId}`, '_blank');
    } catch {
      toast.error('Gagal mengunduh PDF');
    }
  };

  // Child Asset Handlers
  const handlePrintChildAssets = (children, parent) => {
    // Add child assets to print queue
    const itemsForPrint = children.map(child => ({
      id: child.id, // Use child ID
      kode_barang: parent?.kode_barang || '', // Kode barang induk
      kode_register: child.kode_register_anak,
      nama_barang: child.nama_aksesori,
      merk: parent?.merk || '',
      tipe: parent?.tipe || '',
      nup: '1',
      tahun: new Date().getFullYear().toString(),
      ukuran: 'kecil', // Aksesori selalu ukuran kecil
      is_child: true,
      child_id: child.id,
      parent_id: parent?.id
    }));
    
    setSelectedItems(itemsForPrint);
    setShowPrintPage(true);
  };

  const handleSaveCanvasDesign = async (designData) => {
    try {
      // Use a prompt to get name, or default
      const name = prompt("Nama Design:", "Canvas Design " + new Date().toLocaleDateString());
      if (!name) return;

      await api.post('/api/label-bmn/sticker-design', {
        name: name,
        size_type: "custom",
        layout: "custom",
        ...designData
      });
      toast.success("Design canvas berhasil disimpan");
      loadActiveDesigns(); // Reload designs
    } catch (err) {
      toast.error("Gagal menyimpan design");
    }
  };

  // ==================== RENDER ====================

  return (
    <div className="space-y-6 print:hidden">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Tag className="w-6 h-6" />Manajemen Label BMN</h1>
          <p className="text-slate-500 mt-1">Cetak stiker identitas aset dengan QR Code</p>
        </div>
        {stats && (
          <div className="flex gap-3">
            <Card className="px-4 py-2"><div className="text-xs text-gray-500">Total</div><div className="text-xl font-bold">{stats.total_assets}</div></Card>
            <Card className="px-4 py-2 bg-green-50 border-green-200"><div className="text-xs text-green-600">Cetak</div><div className="text-xl font-bold text-green-700">{stats.assets_printed}</div></Card>
            <Card className="px-4 py-2 bg-amber-50 border-amber-200"><div className="text-xs text-amber-600">Belum</div><div className="text-xl font-bold text-amber-700">{stats.assets_not_printed}</div></Card>
          </div>
        )}
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="daftar" className="flex items-center gap-1"><LayoutGrid className="w-4 h-4" />Daftar Aset</TabsTrigger>
          <TabsTrigger value="cetak" className="flex items-center gap-1"><Printer className="w-4 h-4" />Antrian ({selectedItems.length})</TabsTrigger>
          <TabsTrigger value="riwayat" className="flex items-center gap-1"><History className="w-4 h-4" />Riwayat</TabsTrigger>
          <TabsTrigger value="qr-custom" className="flex items-center gap-1"><QrCode className="w-4 h-4" />Kustomisasi QR</TabsTrigger>
          <TabsTrigger value="design" className="flex items-center gap-1"><Settings2 className="w-4 h-4" />Pengaturan Design</TabsTrigger>
          <TabsTrigger value="canvas" className="flex items-center gap-1"><PencilRuler className="w-4 h-4" />Canvas Editor (Beta)</TabsTrigger>
        </TabsList>
        
        <TabsContent value="daftar">
          <AssetTable 
            assets={assets}
            loading={loading}
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            selectedItems={selectedItems}
            toggleSelect={toggleSelect}
            selectAll={selectAll}
            selectAllPages={selectAllPages}
            selectingAll={selectingAll}
            onPrint={handlePrint}
            onManageChildren={(asset) => { setSelectedParent(asset); setShowChildModal(true); }}
            onPreview={(item) => { setSelectedItems([item]); setShowPrintPage(true); }}
            filters={filters}
            setFilters={setFilters}
            loadAssets={loadAssets}
          />
        </TabsContent>
        
        <TabsContent value="cetak" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Antrian Cetak ({selectedItems.length})</h3>
                <div className="flex gap-2">
                  <Select value={canvasSize} onValueChange={setCanvasSize}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(CANVAS_SIZES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button onClick={handlePrint} disabled={selectedItems.length === 0}><Printer className="w-4 h-4 mr-2" />Cetak Sekarang</Button>
                </div>
              </div>
              
              {selectedItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-slate-50 rounded-lg">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Antrian kosong. Pilih aset dari tab Daftar Aset</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-white border rounded hover:bg-slate-50">
                      <span className="text-sm text-gray-400 w-6">{idx + 1}.</span>
                      <div className="flex-1">
                        <div className="font-medium">{item.nama_barang}</div>
                        <div className="text-xs text-gray-500">#{item.kode_register || item.kode_barang}</div>
                      </div>
                      <Select 
                        value={item.ukuran || 'sedang'} 
                        onValueChange={val => setSelectedItems(prev => prev.map((i, iIdx) => iIdx === idx ? { ...i, ukuran: val } : i))}
                      >
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(STICKER_SIZES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedItems(prev => prev.filter((_, iIdx) => iIdx !== idx))}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="riwayat">
          <PrintHistoryTab api={api} />
        </TabsContent>
        
        <TabsContent value="qr-custom">
          <QRCustomizationPanel 
            qrSettings={qrSettings} 
            onSettingsChange={setQrSettings} 
            instansi={instansi} 
            qrTemplates={qrTemplates} 
            onQrTemplatesChange={loadQrTemplates} 
            activeDesigns={activeDesigns}
            api={api}
          />
        </TabsContent>
        
        <TabsContent value="design">
          <StickerDesignTab 
            instansi={instansi} 
            qrSettings={qrSettings} 
            onQrSettingsChange={setQrSettings} 
            qrTemplates={qrTemplates} 
            onQrTemplatesChange={loadQrTemplates} 
            api={api}
          />
        </TabsContent>
        
        <TabsContent value="canvas">
          <Card>
            <CardContent className="p-0">
              <StickerCanvasEditor 
                onSave={handleSaveCanvasDesign}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* PDF Jobs Notification */}
      {pdfJobs.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40 space-y-2">
          {pdfJobs.map(job => (
            <Card key={job.id} className="p-3 shadow-lg bg-white border-l-4 border-l-blue-500 min-w-[280px]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {job.status === 'processing' && <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />}
                    {job.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {job.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                    <span className="font-medium text-sm">
                      {job.status === 'processing' && 'Membuat PDF...'}
                      {job.status === 'completed' && 'PDF Siap!'}
                      {job.status === 'failed' && 'Gagal'}
                    </span>
                  </div>
                  {job.status === 'processing' && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-300" 
                          style={{ width: `${(job.progress / job.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{job.progress}/{job.total} stiker</span>
                    </div>
                  )}
                </div>
                {job.status === 'completed' && (
                  <Button size="sm" onClick={() => downloadPdf(job.id)} className="bg-green-600 hover:bg-green-700">
                    Unduh
                  </Button>
                )}
                {job.status === 'failed' && (
                  <Button size="sm" variant="ghost" onClick={() => setPdfJobs(prev => prev.filter(j => j.id !== job.id))}>
                    <XCircle className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {/* Modals */}
      {showPrintPage && (
        <PrintPage 
          items={selectedItems}
          canvasSize={canvasSize}
          instansi={instansi}
          qrSettings={qrSettings}
          onClose={() => setShowPrintPage(false)}
          onPrintComplete={handlePrintComplete}
          activeDesigns={activeDesigns}
          onGeneratePdf={handleGeneratePdf}
          generatingPdf={generatingPdf}
        />
      )}
      
      {showChildModal && (
        <ChildAssetModal 
          open={showChildModal}
          onClose={() => setShowChildModal(false)}
          parentAsset={selectedParent}
          onSuccess={loadAssets}
          onPrintChild={handlePrintChildAssets}
          api={api}
        />
      )}
    </div>
  );
}
