import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MoreHorizontal, Calendar, User, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import api from '../../../api/axios';
import { toast } from 'sonner';

const KanbanColumn = ({ title, tasks, status, color, onStatusChange, onTaskClick, onAddClick }) => (
  <div className="flex-1 min-w-[280px] bg-slate-50/50 rounded-lg p-3 border border-slate-200">
    <div className={`flex items-center justify-between mb-3 px-1 border-l-4 ${color} pl-2`}>
      <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-700">{title}</h3>
      <Badge variant="secondary" className="bg-white">{tasks.length}</Badge>
    </div>
    <ScrollArea className="h-[500px]">
      <div className="space-y-3 pr-2 pb-2">
        {tasks.map(task => (
          <Card key={task.id} className="cursor-pointer hover:shadow-md transition-all border-slate-200" onClick={() => onTaskClick(task)}>
            <CardContent className="p-3">
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  task.priority === 'high' || task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {task.priority.toUpperCase()}
                </span>
                {/* Simple Move Actions */}
                <div className="flex gap-1">
                    {status !== 'todo' && (
                        <button onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'prev'); }} className="text-xs text-gray-400 hover:text-blue-600">←</button>
                    )}
                    {status !== 'done' && (
                        <button onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'next'); }} className="text-xs text-gray-400 hover:text-blue-600">→</button>
                    )}
                </div>
              </div>
              <p className="font-medium text-sm mb-2 line-clamp-2">{task.title}</p>
              
              {task.related_asset_name && (
                  <div className="text-xs text-slate-500 mb-2 bg-slate-100 p-1 rounded truncate">
                      📦 {task.related_asset_name}
                  </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1">
                    <User size={12}/> {task.assignee_name ? task.assignee_name.split(' ')[0] : 'Unassigned'}
                </div>
                {task.due_date && (
                    <div className="flex items-center gap-1 text-orange-600">
                        <Calendar size={12}/> {format(new Date(task.due_date), 'd MMM', {locale: id})}
                    </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        <Button variant="ghost" onClick={() => onAddClick(status)} className="w-full text-gray-500 text-sm border-2 border-dashed border-gray-200 hover:border-blue-300 hover:text-blue-600">
            <Plus className="w-4 h-4 mr-2" /> Tambah Tugas
        </Button>
      </div>
    </ScrollArea>
  </div>
);

const KanbanBoard = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [initialStatus, setInitialStatus] = useState('todo');
  
  // Form Data
  const [formData, setFormData] = useState({
      title: '', description: '', priority: 'medium', due_date: '', assignee_id: '', related_asset_id: ''
  });
  
  // Data for Dropdowns
  const [employees, setEmployees] = useState([]);
  const [assets, setAssets] = useState([]); // Simplified for now

  useEffect(() => {
      fetchTasks();
      fetchEmployees();
  }, []);

  const fetchTasks = async () => {
      try {
          const res = await api.get('/api/tasks/');
          setTasks(res.data);
      } catch (e) {
          console.error("Fetch tasks failed", e);
      } finally {
          setLoading(false);
      }
  };
  
  const fetchEmployees = async () => {
      try {
          // Assuming we have an endpoint or reusing existing list logic
          // For now, let's try fetching from pegawai list if available or users
          // We'll mock if API not ready, but we have /api/pegawai
          const res = await api.get('/api/pegawai/'); 
          if(res.data.data) setEmployees(res.data.data);
      } catch (e) {
          console.error("Fetch employees failed", e);
      }
  };

  const handleStatusChange = async (taskId, direction) => {
      const task = tasks.find(t => t.id === taskId);
      const statuses = ['todo', 'in-progress', 'review', 'done'];
      const currentIndex = statuses.indexOf(task.status);
      let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
      
      if (newIndex >= 0 && newIndex < statuses.length) {
          const newStatus = statuses[newIndex];
          // Optimistic update
          setTasks(prev => prev.map(t => t.id === taskId ? {...t, status: newStatus} : t));
          
          try {
              await api.patch(`/api/tasks/${taskId}`, { status: newStatus });
          } catch (e) {
              toast.error("Gagal update status");
              fetchTasks(); // Revert
          }
      }
  };

  const handleAddSubmit = async (e) => {
      e.preventDefault();
      try {
          await api.post('/api/tasks/', { ...formData, status: initialStatus });
          toast.success("Tugas dibuat");
          setIsAddOpen(false);
          setFormData({ title: '', description: '', priority: 'medium', due_date: '', assignee_id: '', related_asset_id: '' });
          fetchTasks();
      } catch (e) {
          toast.error("Gagal membuat tugas");
      }
  };

  const openAddModal = (status) => {
      setInitialStatus(status);
      setIsAddOpen(true);
  };

  const openDetailModal = (task) => {
      setSelectedTask(task);
      setIsDetailOpen(true);
  };

  return (
    <>
        <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        <KanbanColumn 
            title="To Do" 
            tasks={tasks.filter(t => t.status === 'todo')} 
            status="todo" 
            color="border-blue-500"
            onStatusChange={handleStatusChange}
            onTaskClick={openDetailModal}
            onAddClick={openAddModal}
        />
        <KanbanColumn 
            title="In Progress" 
            tasks={tasks.filter(t => t.status === 'in-progress')} 
            status="in-progress" 
            color="border-yellow-500"
            onStatusChange={handleStatusChange}
            onTaskClick={openDetailModal}
            onAddClick={openAddModal}
        />
        <KanbanColumn 
            title="Review" 
            tasks={tasks.filter(t => t.status === 'review')} 
            status="review" 
            color="border-purple-500"
            onStatusChange={handleStatusChange}
            onTaskClick={openDetailModal}
            onAddClick={openAddModal}
        />
        <KanbanColumn 
            title="Done" 
            tasks={tasks.filter(t => t.status === 'done')} 
            status="done" 
            color="border-green-500"
            onStatusChange={handleStatusChange}
            onTaskClick={openDetailModal}
            onAddClick={openAddModal}
        />
        </div>

        {/* Add Task Modal */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Tambah Tugas Baru</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Judul Tugas</Label>
                        <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Contoh: Perbaikan AC Ruang Server" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Prioritas</Label>
                            <Select value={formData.priority} onValueChange={v => setFormData({...formData, priority: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Due Date</Label>
                            <Input type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Assignee (Pegawai)</Label>
                        <Select value={formData.assignee_id} onValueChange={v => setFormData({...formData, assignee_id: v})}>
                            <SelectTrigger><SelectValue placeholder="Pilih Pegawai" /></SelectTrigger>
                            <SelectContent>
                                {employees.map(emp => (
                                    <SelectItem key={emp.id} value={emp.id}>{emp.nama_lengkap}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Deskripsi</Label>
                        <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    </div>
                    <Button type="submit" className="w-full">Simpan</Button>
                </form>
            </DialogContent>
        </Dialog>

        {/* Task Detail Modal */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {selectedTask?.title}
                        <Badge>{selectedTask?.status}</Badge>
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md">
                        {selectedTask?.description || "Tidak ada deskripsi"}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="font-semibold block">Assignee</span>
                            {selectedTask?.assignee_name || "-"}
                        </div>
                        <div>
                            <span className="font-semibold block">Due Date</span>
                            {selectedTask?.due_date ? format(new Date(selectedTask.due_date), 'dd MMM yyyy') : "-"}
                        </div>
                        {selectedTask?.related_asset_name && (
                            <div className="col-span-2">
                                <span className="font-semibold block">Aset Terkait</span>
                                {selectedTask.related_asset_name} ({selectedTask.related_asset_kode})
                            </div>
                        )}
                    </div>
                    
                    {/* Comments Section (Simplified) */}
                    <div className="border-t pt-4">
                        <h4 className="font-semibold text-sm mb-2">Komentar</h4>
                        <div className="max-h-[150px] overflow-y-auto space-y-2 mb-2">
                            {selectedTask?.comments?.map((c, i) => (
                                <div key={i} className="text-xs bg-gray-50 p-2 rounded">
                                    <span className="font-bold">{c.user_name}:</span> {c.text}
                                </div>
                            ))}
                            {(!selectedTask?.comments || selectedTask.comments.length === 0) && (
                                <p className="text-xs text-gray-400">Belum ada komentar.</p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Input placeholder="Tulis komentar..." className="h-8 text-xs" id="commentInput" />
                            <Button size="sm" onClick={async () => {
                                const input = document.getElementById('commentInput');
                                if(!input.value) return;
                                try {
                                    await api.post(`/api/tasks/${selectedTask.id}/comments`, { text: input.value });
                                    toast.success("Komentar ditambahkan");
                                    input.value = '';
                                    fetchTasks(); // Refresh to show comment
                                    setIsDetailOpen(false); // Close for now, simple implementation
                                } catch(e) {
                                    toast.error("Gagal");
                                }
                            }}>Kirim</Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    </>
  );
};

export default KanbanBoard;
