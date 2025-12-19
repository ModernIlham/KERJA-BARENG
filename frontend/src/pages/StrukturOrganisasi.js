import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { Loader2, Users, ChevronDown, ChevronRight, User, ZoomIn, Search } from 'lucide-react';
import { Input } from '../components/ui/input';

export default function StrukturOrganisasi() {
    const [units, setUnits] = useState([]);
    const [pegawai, setPegawai] = useState([]);
    const [loading, setLoading] = useState(true);
    const [treeData, setTreeData] = useState(null);
    
    // Modal State
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [unitRes, pegRes] = await Promise.all([
                api.get('/api/settings/unit-kerja'),
                api.get('/api/pegawai', { params: { limit: 1000, status: 'AKTIF' } }) // Fetch all active
            ]);
            
            const rawUnits = unitRes.data;
            const rawPegawai = pegRes.data.data;

            setUnits(rawUnits);
            setPegawai(rawPegawai);
            
            // Build Tree
            const hierarchy = buildHierarchy(rawUnits, rawPegawai);
            setTreeData(hierarchy);
            
        } catch (e) {
            console.error("Failed to load org data", e);
        } finally {
            setLoading(false);
        }
    };

    const buildHierarchy = (units, employees) => {
        const unitMap = {};
        
        // 1. Initialize Map & Buckets
        units.forEach(u => {
            unitMap[u.id] = { 
                ...u, 
                children: [], 
                members: [], 
                stats: { PNS: 0, PPPK: 0, NONASN: 0, Total: 0 },
                leader: null 
            };
        });

        // 2. Assign Employees to Units
        // Logic: Match Employee Unit Name string to Unit Name
        // Note: Ideally backend should link via ID, but here we match by string flexible
        employees.forEach(emp => {
            // Find which unit this employee belongs to
            // Priority: Eselon 4 -> 3 -> 2 -> 1
            const unitName = emp.eselon4 || emp.eselon3 || emp.eselon2 || emp.eselon1;
            
            // Find unit ID by name (Case insensitive)
            const unitId = Object.keys(unitMap).find(key => 
                unitMap[key].nama_unit.toLowerCase() === (unitName || "").toLowerCase()
            );

            if (unitId) {
                const u = unitMap[unitId];
                u.members.push(emp);
                
                // Update Stats
                const status = (emp.status_kepegawaian || 'NON-ASN').toUpperCase();
                if (status.includes('PNS')) u.stats.PNS++;
                else if (status.includes('PPPK')) u.stats.PPPK++;
                else u.stats.NONASN++;
                u.stats.Total++;

                // Identify Leader (Simple logic: If Jabatan contains "Kepala" and Unit Name)
                // Or if flag is_pimpinan_tertinggi
                if (emp.is_pimpinan_tertinggi || (emp.jabatan || "").toLowerCase().includes("kepala " + u.nama_unit.toLowerCase())) {
                    if (!u.leader || emp.eselon_level < u.leader.eselon_level) { // Needs eselon level logic, simplified here
                        u.leader = emp;
                    }
                }
            }
        });

        // 3. Build Tree Structure
        const roots = [];
        units.forEach(u => {
            if (u.parent_id && unitMap[u.parent_id]) {
                unitMap[u.parent_id].children.push(unitMap[u.id]);
            } else {
                roots.push(unitMap[u.id]);
            }
        });

        return roots; // Should typically be one root (Sekretariat/Kepala Dinas)
    };

    const handleNodeClick = (node) => {
        setSelectedUnit(node);
        setIsModalOpen(true);
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin mr-2"/> Memuat Struktur...</div>;

    return (
        <div className="h-[calc(100vh-100px)] overflow-hidden flex flex-col">
            <div className="mb-4">
                <h1 className="text-2xl font-bold text-slate-900">Struktur Organisasi Interaktif</h1>
                <p className="text-sm text-slate-500">Klik pada kotak unit kerja untuk melihat detail anggota (PNS/PPPK/Non-ASN).</p>
            </div>
            
            <ScrollArea className="flex-1 border rounded-lg bg-slate-50/50 p-8">
                <div className="min-w-fit flex justify-center pb-20">
                    {treeData && treeData.map(root => (
                        <OrgNode key={root.id} node={root} onClick={handleNodeClick} />
                    ))}
                </div>
            </ScrollArea>

            <UnitDetailModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                unit={selectedUnit} 
            />
        </div>
    );
}

// --- Recursive Node Component ---
function OrgNode({ node, onClick }) {
    if (!node) return null;

    return (
        <div className="flex flex-col items-center">
            {/* The Node Card */}
            <div 
                className="relative flex flex-col items-center p-4 bg-white border-2 border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-400 cursor-pointer transition-all w-[280px] group z-10"
                onClick={() => onClick(node)}
            >
                {/* Connector Line Top (if not root, handled by parent's children loop CSS) */}
                
                {/* Leader Info */}
                <div className="flex flex-col items-center text-center mb-3">
                    <Avatar className="h-16 w-16 border-2 border-white shadow-sm mb-2">
                        <AvatarImage src={node.leader?.foto_thumbnail_url} className="object-cover" />
                        <AvatarFallback className="bg-slate-100 text-slate-400"><User size={24}/></AvatarFallback>
                    </Avatar>
                    <div className="font-bold text-sm text-slate-900 leading-tight">{node.leader ? node.leader.nama_lengkap : "Belum Ada Pimpinan"}</div>
                    <div className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">{node.leader ? node.leader.jabatan : "-"}</div>
                </div>

                {/* Unit Name */}
                <div className="w-full bg-slate-50 py-1.5 px-2 rounded border border-slate-100 text-center mb-3">
                    <div className="text-xs font-bold text-blue-700 uppercase tracking-tight">{node.nama_unit}</div>
                </div>

                {/* Badges Count */}
                <div className="flex gap-1 w-full justify-center">
                    <Badge variant="secondary" className="text-[9px] h-5 bg-blue-50 text-blue-700 hover:bg-blue-100">
                        PNS: {node.stats.PNS}
                    </Badge>
                    <Badge variant="secondary" className="text-[9px] h-5 bg-orange-50 text-orange-700 hover:bg-orange-100">
                        PPPK: {node.stats.PPPK}
                    </Badge>
                    <Badge variant="secondary" className="text-[9px] h-5 bg-green-50 text-green-700 hover:bg-green-100">
                        Non-ASN: {node.stats.NONASN}
                    </Badge>
                </div>
                
                {/* Hint */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="text-blue-400 h-4 w-4"/>
                </div>
            </div>

            {/* Children Lines & Rendering */}
            {node.children && node.children.length > 0 && (
                <>
                    {/* Vertical Line Down from Parent */}
                    <div className="w-px h-8 bg-slate-300"></div>
                    
                    {/* Horizontal Connector */}
                    <div className="relative flex justify-center gap-8 pt-4 border-t border-slate-300">
                        {/* We use a trick for the horizontal line: 
                            The parent div has border-top. 
                            We need to hide the excess border for the first and last child to make it look like a tree fork. 
                        */}
                        {node.children.map((child, idx) => (
                            <div key={child.id} className="relative flex flex-col items-center">
                                {/* Vertical Line Up to Connector */}
                                <div className="absolute -top-4 w-px h-4 bg-slate-300"></div>
                                <OrgNode node={child} onClick={onClick} />
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// --- Detail Modal ---
function UnitDetailModal({ isOpen, onClose, unit }) {
    const [activeTab, setActiveTab] = useState("pns");
    const [search, setSearch] = useState("");

    if (!unit) return null;

    const filterMembers = (type) => {
        return unit.members.filter(m => {
            const status = (m.status_kepegawaian || 'NON-ASN').toUpperCase();
            const matchesType = 
                type === 'pns' ? status.includes('PNS') :
                type === 'pppk' ? status.includes('PPPK') :
                !status.includes('PNS') && !status.includes('PPPK'); // Non-ASN
            
            const matchesSearch = m.nama_lengkap.toLowerCase().includes(search.toLowerCase());
            
            return matchesType && matchesSearch;
        });
    };

    const MemberList = ({ type }) => {
        const members = filterMembers(type);
        return (
            <div className="space-y-3 mt-4">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400"/>
                    <Input 
                        placeholder="Cari nama..." 
                        className="pl-9 bg-slate-50" 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                
                <ScrollArea className="h-[400px] pr-4">
                    {members.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">Tidak ada data pegawai kategori ini.</div>
                    ) : (
                        members.map(m => (
                            <div key={m._id} className="flex items-center gap-3 p-3 bg-white border rounded-lg mb-2 hover:bg-slate-50 transition-colors">
                                <Avatar className="h-10 w-10 border shadow-sm">
                                    <AvatarImage src={m.foto_thumbnail_url} className="object-cover"/>
                                    <AvatarFallback><User size={16}/></AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-bold text-sm text-slate-900">{m.nama_lengkap}</div>
                                    <div className="text-xs text-slate-500 font-mono">{m.nip}</div>
                                    <div className="text-[10px] text-blue-600 font-medium mt-0.5">{m.jabatan}</div>
                                </div>
                            </div>
                        ))
                    )}
                </ScrollArea>
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600"/>
                        {unit.nama_unit}
                    </DialogTitle>
                    <div className="text-sm text-slate-500">
                        Detail anggota dan komposisi pegawai pada unit ini.
                    </div>
                </DialogHeader>

                <Tabs defaultValue="pns" onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-slate-100">
                        <TabsTrigger value="pns">PNS ({unit.stats.PNS})</TabsTrigger>
                        <TabsTrigger value="pppk">PPPK ({unit.stats.PPPK})</TabsTrigger>
                        <TabsTrigger value="nonasn">Non-ASN ({unit.stats.NONASN})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pns">
                        <MemberList type="pns" />
                    </TabsContent>
                    <TabsContent value="pppk">
                        <MemberList type="pppk" />
                    </TabsContent>
                    <TabsContent value="nonasn">
                        <MemberList type="nonasn" />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}