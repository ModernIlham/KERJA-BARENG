import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

const initialTasks = [
  { id: 1, title: 'Laporan Bulanan', status: 'todo', assignee: 'Budi', priority: 'high' },
  { id: 2, title: 'Rekap Absensi', status: 'in-progress', assignee: 'Ani', priority: 'medium' },
  { id: 3, title: 'Update Data Aset', status: 'done', assignee: 'Budi', priority: 'low' },
  { id: 4, title: 'Meeting Evaluasi', status: 'todo', assignee: 'Citra', priority: 'medium' },
];

const KanbanColumn = ({ title, tasks, status, color }) => (
  <div className="flex-1 min-w-[280px] bg-slate-50 rounded-lg p-3">
    <div className={`flex items-center justify-between mb-3 px-1 border-l-4 ${color}`}>
      <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-700">{title}</h3>
      <Badge variant="secondary">{tasks.length}</Badge>
    </div>
    <ScrollArea className="h-[400px]">
      <div className="space-y-3 pr-2">
        {tasks.map(task => (
          <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex justify-between items-start mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  task.priority === 'high' ? 'bg-red-100 text-red-700' :
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {task.priority}
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
              <p className="font-medium text-sm mb-2">{task.title}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{task.assignee}</span>
                <span>ID: #{task.id}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        <Button variant="ghost" className="w-full text-gray-500 text-sm border-2 border-dashed border-gray-200">
            <Plus className="w-4 h-4 mr-2" /> Tambah
        </Button>
      </div>
    </ScrollArea>
  </div>
);

const KanbanBoard = () => {
  const [tasks, setTasks] = useState(initialTasks);

  const getTasksByStatus = (status) => tasks.filter(t => t.status === status);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      <KanbanColumn 
        title="To Do" 
        tasks={getTasksByStatus('todo')} 
        status="todo" 
        color="border-blue-500"
      />
      <KanbanColumn 
        title="In Progress" 
        tasks={getTasksByStatus('in-progress')} 
        status="in-progress" 
        color="border-yellow-500"
      />
      <KanbanColumn 
        title="Done" 
        tasks={getTasksByStatus('done')} 
        status="done" 
        color="border-green-500"
      />
    </div>
  );
};

export default KanbanBoard;
