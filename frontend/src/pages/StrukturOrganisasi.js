import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { Loader2, Users, ChevronDown, ChevronRight, User, ZoomIn, Search, Building2, Network } from 'lucide-react';
import { Input } from '../components/ui/input';
import { cn } from '../lib/utils';

export default function StrukturOrganisasi() {
    const [units, setUnits] = useState([]);
    const [pegawai, setPegawai] = useState([]);
    const [loading, setLoading] = useState(true);
    const [treeData, setTreeData] = useState([]);
    const [viewMode, setViewMode] = useState('tree'); // 'tree' or 'list'
    
    // Modal State
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Expand/Collapse State
    const [expandedNodes, setExpandedNodes] = useState(new Set());

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [unitRes, pegRes] = await Promise.all([
                api.get('/api/settings/unit-kerja'),
                api.get('/api/pegawai', { params: { limit: 1000, status: 'AKTIF' } })
            ]);
            
            const rawUnits = unitRes.data;
            const rawPegawai = pegRes.data.data || [];

            setUnits(rawUnits);
            setPegawai(rawPegawai);
            
            // Build Tree
            const hierarchy = buildHierarchy(rawUnits, rawPegawai);
            setTreeData(hierarchy);
            
            // Expand first level by default
            const rootIds = new Set(hierarchy.map(h => h.id));
            setExpandedNodes(rootIds);
            
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
        employees.forEach(emp => {
            const unitName = emp.eselon4 || emp.eselon3 || emp.eselon2 || emp.eselon1;
            
            const unitId = Object.keys(unitMap).find(key => 
                unitMap[key].nama_unit.toLowerCase() === (unitName || "").toLowerCase()
            );

            if (unitId) {
                const u = unitMap[unitId];
                u.members.push(emp);
                
                const status = (emp.status_kepegawaian || 'NON-ASN').toUpperCase();
                if (status.includes('PNS')) u.stats.PNS++;
                else if (status.includes('PPPK')) u.stats.PPPK++;
                else u.stats.NONASN++;
                u.stats.Total++;

                if (emp.is_pimpinan_tertinggi || (emp.jabatan || "").toLowerCase().includes("kepala")) {
                    if (!u.leader) {
                        u.leader = emp;
                    }
                }
            }
        });

        // 3. Build Tree Structure
        const roots = [];
        units.forEach(u => {
            // Skip units without valid name
            if (!u.nama_unit || u.nama_unit.trim() === '') return;
            
            if (u.parent_id && unitMap[u.parent_id]) {
                unitMap[u.parent_id].children.push(unitMap[u.id]);
            } else if (!u.parent_id) {
                roots.push(unitMap[u.id]);
            }
        });

        // Filter out empty children
        const filterEmptyChildren = (node) => {
            if (node.children && node.children.length > 0) {
                node.children = node.children.filter(c => c.nama_unit && c.nama_unit.trim() !== '');
                node.children.forEach(filterEmptyChildren);
            }
        };
        roots.forEach(filterEmptyChildren);

        // Sort children alphabetically
        const sortChildren = (node) => {
            if (node.children && node.children.length > 0) {
                node.children.sort((a, b) => a.nama_unit.localeCompare(b.nama_unit));
                node.children.forEach(sortChildren);
            }
        };
        
        // Filter roots with valid names and sort
        const validRoots = roots.filter(r => r.nama_unit && r.nama_unit.trim() !== '');
        validRoots.forEach(sortChildren);

        return validRoots;
    };

    const handleNodeClick = (node) => {
        setSelectedUnit(node);
        setIsModalOpen(true);
    };

    const toggleExpand = (nodeId) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            return newSet;
        });
    };

    const expandAll = () => {
        const allIds = new Set();
        const collectIds = (nodes) => {
            nodes.forEach(n => {
                allIds.add(n.id);
                if (n.children) collectIds(n.children);
            });
        };
        collectIds(treeData);
        setExpandedNodes(allIds);
    };

    const collapseAll = () => {
        setExpandedNodes(new Set());
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="animate-spin mr-2 h-6 w-6 text-blue-600"/> 
                <span className="text-slate-600">Memuat Struktur Organisasi...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Network className="h-6 w-6 text-blue-600" />
                        Struktur Organisasi
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Klik pada unit kerja untuk melihat detail anggota (PNS/PPPK/Non-ASN)
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={expandAll}>
                        <ChevronDown className="h-4 w-4 mr-1" /> Expand All
                    </Button>
                    <Button variant="outline" size="sm" onClick={collapseAll}>
                        <ChevronRight className="h-4 w-4 mr-1" /> Collapse All
                    </Button>
                </div>
            </div>

            {/* Tree View */}
            <Card className="border-slate-200">
                <CardContent className="p-6">
                    {treeData.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <Building2 className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                            <p>Belum ada data struktur organisasi.</p>
                            <p className="text-sm">Silakan tambahkan unit kerja di menu Pengaturan → Unit Kerja.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {treeData.map(root => (
                                <TreeNode 
                                    key={root.id} 
                                    node={root} 
                                    level={0}
                                    expanded={expandedNodes.has(root.id)}
                                    expandedNodes={expandedNodes}
                                    onToggle={toggleExpand}
                                    onClick={handleNodeClick}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Detail Modal */}
            <UnitDetailModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                unit={selectedUnit} 
            />
        </div>
    );
}

// --- Tree Node Component ---
function TreeNode({ node, level, expanded, expandedNodes, onToggle, onClick }) {
    if (!node) return null;
    
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    
    // Colors based on eselon level
    const levelColors = {
        '1': 'bg-blue-600 text-white border-blue-700',
        '2': 'bg-blue-500 text-white border-blue-600',
        '3': 'bg-sky-500 text-white border-sky-600',
        '4': 'bg-cyan-500 text-white border-cyan-600',
        '5': 'bg-teal-500 text-white border-teal-600',
    };
    
    const levelBadgeColors = {
        '1': 'bg-blue-100 text-blue-800',
        '2': 'bg-blue-50 text-blue-700',
        '3': 'bg-sky-50 text-sky-700',
        '4': 'bg-cyan-50 text-cyan-700',
        '5': 'bg-teal-50 text-teal-700',
    };

    const eselonLevel = node.eselon || '1';

    return (
        <div className="select-none">
            {/* Node Row */}
            <div 
                className={cn(
                    "flex items-center gap-2 p-3 rounded-lg border transition-all cursor-pointer",
                    "hover:shadow-md hover:border-blue-300",
                    level === 0 ? levelColors[eselonLevel] : "bg-white border-slate-200 hover:bg-slate-50"
                )}
                style={{ marginLeft: `${level * 24}px` }}
            >
                {/* Expand/Collapse Button */}
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
                    className={cn(
                        "flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors",
                        !hasChildren && "invisible"
                    )}
                >
                    {isExpanded ? (
                        <ChevronDown className={cn("h-4 w-4", level === 0 ? "text-white" : "text-slate-500")} />
                    ) : (
                        <ChevronRight className={cn("h-4 w-4", level === 0 ? "text-white" : "text-slate-500")} />
                    )}
                </button>

                {/* Unit Info */}
                <div 
                    className="flex-1 flex items-center gap-3 min-w-0"
                    onClick={() => onClick(node)}
                >
                    {/* Avatar */}
                    <Avatar className={cn("h-10 w-10 border-2 flex-shrink-0", level === 0 ? "border-white/50" : "border-slate-200")}>
                        <AvatarImage src={node.leader?.foto_thumbnail_url} className="object-cover" />
                        <AvatarFallback className={cn(level === 0 ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400")}>
                            <User size={18}/>
                        </AvatarFallback>
                    </Avatar>

                    {/* Name & Leader */}
                    <div className="flex-1 min-w-0">
                        <div className={cn("font-semibold truncate", level === 0 ? "text-white" : "text-slate-900")}>
                            {node.nama_unit}
                        </div>
                        <div className={cn("text-xs truncate", level === 0 ? "text-white/80" : "text-slate-500")}>
                            {node.leader ? node.leader.nama_lengkap : "Belum ada pimpinan"}
                        </div>
                    </div>

                    {/* Eselon Badge */}
                    <Badge className={cn("flex-shrink-0 text-[10px]", levelBadgeColors[eselonLevel])}>
                        Eselon {eselonLevel}
                    </Badge>

                    {/* Stats Badges */}
                    <div className="flex gap-1 flex-shrink-0">
                        {node.stats.PNS > 0 && (
                            <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 h-5">
                                PNS: {node.stats.PNS}
                            </Badge>
                        )}
                        {node.stats.PPPK > 0 && (
                            <Badge variant="secondary" className="text-[10px] bg-orange-50 text-orange-700 h-5">
                                PPPK: {node.stats.PPPK}
                            </Badge>
                        )}
                        {node.stats.NONASN > 0 && (
                            <Badge variant="secondary" className="text-[10px] bg-green-50 text-green-700 h-5">
                                Non-ASN: {node.stats.NONASN}
                            </Badge>
                        )}
                        {node.stats.Total === 0 && (
                            <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-500 h-5">
                                0 pegawai
                            </Badge>
                        )}
                    </div>

                    {/* View Detail Icon */}
                    <ZoomIn className={cn("h-4 w-4 flex-shrink-0 opacity-50 hover:opacity-100", level === 0 ? "text-white" : "text-blue-500")} />
                </div>
            </div>

            {/* Children */}
            {hasChildren && isExpanded && (
                <div className="mt-1 space-y-1 border-l-2 border-slate-200 ml-6">
                    {node.children.map(child => (
                        <TreeNode 
                            key={child.id}
                            node={child}
                            level={level + 1}
                            expanded={expandedNodes.has(child.id)}
                            expandedNodes={expandedNodes}
                            onToggle={onToggle}
                            onClick={onClick}
                        />
                    ))}
                </div>
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
                !status.includes('PNS') && !status.includes('PPPK');
            
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
                        placeholder="Cari nama pegawai..." 
                        className="pl-9 bg-slate-50" 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                
                <ScrollArea className="h-[350px] pr-4">
                    {members.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            <User className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                            Tidak ada data pegawai kategori ini.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {members.map(m => (
                                <div key={m.id || m._id} className="flex items-center gap-3 p-3 bg-white border rounded-lg hover:bg-slate-50 transition-colors">
                                    <Avatar className="h-10 w-10 border shadow-sm">
                                        <AvatarImage src={m.foto_thumbnail_url} className="object-cover"/>
                                        <AvatarFallback className="bg-slate-100"><User size={16}/></AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm text-slate-900 truncate">{m.nama_lengkap}</div>
                                        <div className="text-xs text-slate-500 font-mono">{m.nip || '-'}</div>
                                        <div className="text-[11px] text-blue-600 font-medium mt-0.5 truncate">{m.jabatan || '-'}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
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
                        <Building2 className="h-5 w-5 text-blue-600"/>
                        {unit.nama_unit}
                    </DialogTitle>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Badge variant="outline">Eselon {unit.eselon || '1'}</Badge>
                        <span>•</span>
                        <span>Total: {unit.stats.Total} pegawai</span>
                    </div>
                </DialogHeader>

                {/* Leader Info */}
                {unit.leader && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <Avatar className="h-12 w-12 border-2 border-blue-300">
                            <AvatarImage src={unit.leader.foto_thumbnail_url} className="object-cover"/>
                            <AvatarFallback className="bg-blue-100 text-blue-600"><User size={20}/></AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="text-xs text-blue-600 font-medium">Pimpinan Unit</div>
                            <div className="font-bold text-slate-900">{unit.leader.nama_lengkap}</div>
                            <div className="text-xs text-slate-600">{unit.leader.jabatan}</div>
                        </div>
                    </div>
                )}

                <Tabs defaultValue="pns" onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-slate-100">
                        <TabsTrigger value="pns" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                            PNS ({unit.stats.PNS})
                        </TabsTrigger>
                        <TabsTrigger value="pppk" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                            PPPK ({unit.stats.PPPK})
                        </TabsTrigger>
                        <TabsTrigger value="nonasn" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
                            Non-ASN ({unit.stats.NONASN})
                        </TabsTrigger>
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
