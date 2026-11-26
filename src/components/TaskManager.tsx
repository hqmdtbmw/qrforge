import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, Filter, MoreVertical, Trash2, 
  CheckCircle2, Circle, Clock, AlertCircle,
  GripVertical, ChevronDown, ChevronUp,
  Calendar, Tag, Flag, Loader2, X, Check,
  MessageSquare, Paperclip, User, ListTodo, CheckSquare,
  Columns, List, Layout, ArrowRight, Star, ChevronLeft,
  FileText, Folder
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useAuth } from '../AuthContext';
import { 
  subscribeToUserTasks, 
  subscribeToOrgTasks, 
  createTask, 
  updateTask, 
  deleteTask, 
  reorderTasks,
  subscribeToOrgMembers,
  logActivity,
  createProject,
  subscribeToUserProjects,
  subscribeToOrgProjects,
  updateProject,
  deleteProject
} from '../services/db';
import { useToast } from './Toast';
import { cn } from '../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';
import { format } from 'date-fns';
import { nanoid } from 'nanoid';

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface Comment {
  id: string;
  userId: string;
  text: string;
  createdAt: any;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  order: number;
  orgId?: string;
  ownerId: string;
  assigneeId?: string;
  projectId?: string;
  startDate?: string;
  dueDate?: string;
  dependencies?: string[];
  subtasks?: Subtask[];
  comments?: Comment[];
  tags?: string[];
  estimatedHours?: number;
  spentHours?: number;
  attachments?: string[];
  createdAt: any;
}

const SortableTaskItem = ({ 
  task, 
  onToggle, 
  onDelete, 
  onEdit,
  members
}: { 
  task: Task; 
  onToggle: (task: Task) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  members: any[];
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityConfig = {
    low: { color: 'text-blue-500 bg-blue-500/10', icon: <Flag className="w-2 h-2" /> },
    medium: { color: 'text-brand-500 bg-brand-500/10', icon: <Flag className="w-2 h-2" /> },
    high: { color: 'text-brand-500 bg-brand-500/10', icon: <Flag className="w-2 h-2" /> },
    urgent: { color: 'text-rose-500 bg-rose-500/10', icon: <AlertCircle className="w-2 h-2" /> }
  };

  const statusIcons = {
    todo: <Circle />,
    'in-progress': <Clock className="animate-pulse" />,
    review: <Layout />,
    completed: <CheckCircle2 />,
    blocked: <AlertCircle />
  };

  const assignee = members.find(m => m.uid === task.assigneeId || m.id === task.assigneeId);
  const subtasksCount = task.subtasks?.length || 0;
  const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-center gap-3 p-3 bg-card border border-border rounded-2xl transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5",
        task.status === 'completed' && "opacity-60 grayscale-[0.5]",
        task.status === 'blocked' && "border-rose-500/20 bg-rose-500/5"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <button
        onClick={() => onToggle(task)}
        className="flex-shrink-0 transition-transform hover:scale-110 active:scale-90"
      >
        {React.cloneElement(statusIcons[task.status] as React.ReactElement<any>, { 
          className: cn(
            "w-5 h-5",
            task.status === 'todo' && "text-muted-foreground",
            task.status === 'in-progress' && "text-brand-500",
            task.status === 'review' && "text-indigo-500",
            task.status === 'completed' && "text-emerald-500",
            task.status === 'blocked' && "text-rose-500"
          )
        })}
      </button>

      <div className="flex-grow min-w-0 cursor-pointer" onClick={() => onEdit(task)}>
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className={cn(
            "text-[10px] font-black uppercase tracking-tight truncate",
            task.status === 'completed' && "line-through text-muted-foreground"
          )}>
            {task.title}
          </h4>
          {task.priority === 'urgent' && <Star className="w-3 h-3 text-rose-500 fill-rose-500 animate-pulse" />}
        </div>
        
        <div className="flex items-center gap-3">
          {task.description && (
            <p className="text-[8px] text-muted-foreground line-clamp-1 font-medium">
              {task.description}
            </p>
          )}
          <div className="flex items-center gap-2">
            {subtasksCount > 0 && (
              <div className="flex items-center gap-1 text-[7px] font-black text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded-md">
                <ListTodo className="w-2 h-2" />
                {completedSubtasks}/{subtasksCount}
              </div>
            )}
            {task.dueDate && (
              <div className={cn(
                "flex items-center gap-1 text-[7px] font-black px-1.5 py-0.5 rounded-md",
                new Date(task.dueDate) < new Date() && task.status !== 'completed' 
                  ? "text-rose-500 bg-rose-500/10" 
                  : "text-muted-foreground bg-secondary/50"
              )}>
                <Calendar className="w-2 h-2" />
                {format(new Date(task.dueDate), 'MMM d')}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {assignee && (
            <div 
              className="w-6 h-6 rounded-full border-2 border-card bg-primary/10 flex items-center justify-center text-[8px] font-black text-brand-700 overflow-hidden"
              title={`Assigned to ${assignee.email}`}
            >
              {assignee.email?.[0].toUpperCase()}
            </div>
          )}
        </div>

        <span className={cn(
          "px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest flex items-center gap-1",
          priorityConfig[task.priority].color
        )}>
          {priorityConfig[task.priority].icon}
          {task.priority}
        </span>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const TaskManager: React.FC<{ orgId?: string }> = ({ orgId }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar' | 'gantt' | 'projects'>('list');
  
  // Project Management State
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [projectFormData, setProjectFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    color: '#f97316'
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Task['status']>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Task['priority']>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    status: 'todo' as Task['status'],
    assigneeId: '',
    projectId: '',
    dueDate: '',
    startDate: '',
    dependencies: [] as string[],
    subtasks: [] as Subtask[],
    estimatedHours: 0,
    spentHours: 0,
    attachments: [] as string[]
  });
  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'details' | 'subtasks' | 'comments' | 'meta'>('details');

  useEffect(() => {
    if (!user) return;
    
    const callback = (data: Task[]) => {
      setTasks(data);
      setIsLoading(false);
    };

    const unsubscribe = orgId 
      ? subscribeToOrgTasks(orgId, callback)
      : subscribeToUserTasks(user.uid, callback);

    const projectUnsubscribe = orgId
      ? subscribeToOrgProjects(orgId, setProjects)
      : subscribeToUserProjects(user.uid, setProjects);

    if (orgId) {
      subscribeToOrgMembers(orgId, setMembers);
    }

    return () => {
      unsubscribe();
      projectUnsubscribe();
    };
  }, [user, orgId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);

    const newTasks = arrayMove(tasks, oldIndex, newIndex).map((task, index) => ({
      ...task,
      order: index
    }));

    setTasks(newTasks);
    try {
      await reorderTasks(newTasks);
    } catch (error) {
      toast('Failed to save order', 'error');
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectFormData.name.trim()) {
      toast('Project name is required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingProject) {
        await updateProject(editingProject.id, projectFormData);
        toast('Project updated', 'success');
      } else {
        const payload = {
          ...projectFormData,
          ownerId: user?.uid,
          orgId: orgId || null
        };
        await createProject(payload);
        toast('Project created', 'success');
      }
      setIsAddingProject(false);
      setEditingProject(null);
      setProjectFormData({ name: '', description: '', status: 'active', color: '#f97316' });
    } catch (error) {
      toast('Failed to save project', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast('Title is required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTask) {
        await updateTask(editingTask.id, formData);
        toast('Task updated', 'success');
      } else {
        const taskPayload: any = {
          ...formData,
          ownerId: user?.uid,
          order: tasks.length,
          projectId: formData.projectId || selectedProjectId !== 'all' ? selectedProjectId : null
        };
        
        if (orgId) {
          taskPayload.orgId = orgId;
          await logActivity(user!.uid, orgId, 'TASK_CREATED', `Created task: ${formData.title}`);
        }

        await createTask(taskPayload);
        toast('Task forged successfully', 'success');
      }
      setIsAdding(false);
      setEditingTask(null);
      setFormData({ 
        title: '', 
        description: '', 
        priority: 'medium', 
        status: 'todo', 
        assigneeId: '', 
        projectId: '',
        dueDate: '', 
        startDate: '',
        dependencies: [],
        subtasks: [],
        estimatedHours: 0,
        spentHours: 0,
        attachments: []
      });
    } catch (error) {
      toast('Failed to save task', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (task: Task) => {
    const statuses: Task['status'][] = ['todo', 'in-progress', 'review', 'completed'];
    const currentIndex = statuses.indexOf(task.status);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    
    try {
      await updateTask(task.id, { status: nextStatus });
      if (orgId) {
        await logActivity(user!.uid, orgId, 'TASK_UPDATED', `Changed status of "${task.title}" to ${nextStatus.toUpperCase()}`);
      }
    } catch (error) {
      toast('Failed to update status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id);
      setDeletingId(null);
      toast('Task removed', 'success');
    } catch (error) {
      toast('Failed to delete task', 'error');
    }
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    setFormData(prev => ({
      ...prev,
      subtasks: [...prev.subtasks, { id: nanoid(6), title: newSubtask, completed: false }]
    }));
    setNewSubtask('');
  };

  const filteredTasks = useMemo(() => tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesProject = selectedProjectId === 'all' || task.projectId === selectedProjectId;
    return matchesSearch && matchesStatus && matchesPriority && matchesProject;
  }), [tasks, searchQuery, statusFilter, priorityFilter, selectedProjectId]);

  const boardColumns = ['todo', 'in-progress', 'review', 'completed', 'blocked'] as const;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest">Project Forge</h2>
          <p className="text-[8px] text-muted-foreground font-black uppercase tracking-[0.2em]">Zoho & ClickUp Standard Workflow</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-secondary/30 rounded-xl border border-border/50 overflow-x-auto no-scrollbar">
            {[
              { id: 'list', icon: List, label: 'List' },
              { id: 'board', icon: Columns, label: 'Board' },
              { id: 'calendar', icon: Calendar, label: 'Calendar' },
              { id: 'gantt', icon: Layout, label: 'Timeline' },
              { id: 'projects', icon: Folder, label: 'Projects' }
            ].map(v => (
              <button 
                key={v.id}
                onClick={() => setViewMode(v.id as any)}
                className={cn(
                  "p-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap",
                  viewMode === v.id ? "bg-background text-brand-700 shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
                title={v.label}
              >
                <v.icon className="w-4 h-4" />
                <span className="text-[8px] font-black uppercase tracking-widest hidden lg:block">{v.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Forge Task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks, descriptions, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-2xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all shadow-sm"
          />
        </div>
        
        <Select value={selectedProjectId} onValueChange={(val: any) => setSelectedProjectId(val)}>
          <SelectTrigger className="h-12 bg-card border-border text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-sm">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
          <SelectTrigger className="h-12 bg-card border-border text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={(val: any) => setPriorityFilter(val)}>
          <SelectTrigger className="h-12 bg-card border-border text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-sm">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task Views */}
      {viewMode === 'list' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext
            items={filteredTasks.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <SortableTaskItem
                      task={task}
                      onToggle={handleToggleStatus}
                      onDelete={setDeletingId}
                      members={members}
                      onEdit={(t) => {
                        setEditingTask(t);
                        setFormData({
                          title: t.title,
                          description: t.description,
                          priority: t.priority,
                          status: t.status,
                          assigneeId: t.assigneeId || '',
                          projectId: t.projectId || '',
                          dueDate: t.dueDate || '',
                          startDate: t.startDate || '',
                          dependencies: t.dependencies || [],
                          subtasks: t.subtasks || [],
                          estimatedHours: t.estimatedHours || 0,
                          spentHours: t.spentHours || 0,
                          attachments: t.attachments || []
                        });
                        setIsAdding(true);
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {filteredTasks.length === 0 && (
                <div className="text-center py-20 bg-secondary/10 rounded-[2.5rem] border border-dashed border-border">
                  <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-tight">No tasks in the forge</h3>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-2">Try adjusting your filters or forge a new task</p>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      ) : viewMode === 'board' ? (
        <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar min-h-[500px]">
          {boardColumns.map(col => (
            <div key={col} className="flex-shrink-0 w-[280px] space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    col === 'todo' && "bg-muted-foreground",
                    col === 'in-progress' && "bg-brand-500",
                    col === 'review' && "bg-indigo-500",
                    col === 'completed' && "bg-emerald-500",
                    col === 'blocked' && "bg-rose-500"
                  )} />
                  {col.replace('-', ' ')}
                  <span className="opacity-30 ml-1">{filteredTasks.filter(t => t.status === col).length}</span>
                </h3>
              </div>
              
              <div className="space-y-3">
                {filteredTasks.filter(t => t.status === col).map(task => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-card border border-border rounded-2xl shadow-sm hover:border-primary/30 transition-all cursor-pointer group"
                    onClick={() => {
                      setEditingTask(task);
                      setFormData({
                        title: task.title,
                        description: task.description,
                        priority: task.priority,
                        status: task.status,
                        assigneeId: task.assigneeId || '',
                        projectId: task.projectId || '',
                        dueDate: task.dueDate || '',
                        startDate: task.startDate || '',
                        dependencies: task.dependencies || [],
                        subtasks: task.subtasks || [],
                        estimatedHours: task.estimatedHours || 0,
                        spentHours: task.spentHours || 0,
                        attachments: task.attachments || []
                      });
                      setIsAdding(true);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h4 className="text-[10px] font-black uppercase tracking-tight leading-tight">{task.title}</h4>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-md text-[6px] font-black uppercase tracking-widest",
                        task.priority === 'urgent' ? 'bg-rose-500 text-white' : 'bg-secondary text-muted-foreground'
                      )}>
                        {task.priority}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-[7px] font-black text-muted-foreground">
                            <Calendar className="w-2.5 h-2.5" />
                            {format(new Date(task.dueDate), 'MMM d')}
                          </div>
                        )}
                        {task.subtasks && task.subtasks.length > 0 && (
                          <div className="flex items-center gap-1 text-[7px] font-black text-muted-foreground">
                            <ListTodo className="w-2.5 h-2.5" />
                            {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                          </div>
                        )}
                      </div>
                      
                      {task.assigneeId && (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-black text-brand-700 border border-primary/20">
                          {members.find(m => m.uid === task.assigneeId || m.id === task.assigneeId)?.email?.[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'calendar' ? (
        <CalendarView tasks={filteredTasks} onEditTask={(t) => {
          setEditingTask(t);
          setFormData({
            title: t.title,
            description: t.description,
            priority: t.priority,
            status: t.status,
            assigneeId: t.assigneeId || '',
            projectId: t.projectId || '',
            dueDate: t.dueDate || '',
            startDate: t.startDate || '',
            dependencies: t.dependencies || [],
            subtasks: t.subtasks || [],
            estimatedHours: t.estimatedHours || 0,
            spentHours: t.spentHours || 0,
            attachments: t.attachments || []
          });
          setIsAdding(true);
        }} />
      ) : viewMode === 'gantt' ? (
        <GanttView tasks={filteredTasks} onEditTask={(t) => {
          setEditingTask(t);
          setFormData({
            title: t.title,
            description: t.description,
            priority: t.priority,
            status: t.status,
            assigneeId: t.assigneeId || '',
            projectId: t.projectId || '',
            dueDate: t.dueDate || '',
            startDate: t.startDate || '',
            dependencies: t.dependencies || [],
            subtasks: t.subtasks || [],
            estimatedHours: t.estimatedHours || 0,
            spentHours: t.spentHours || 0,
            attachments: t.attachments || []
          });
          setIsAdding(true);
        }} />
      ) : (
        <ProjectsView 
          projects={projects} 
          onAddProject={() => setIsAddingProject(true)}
          onEditProject={(p) => {
            setEditingProject(p);
            setProjectFormData({
              name: p.name,
              description: p.description || '',
              status: p.status,
              color: p.color || '#f97316'
            });
            setIsAddingProject(true);
          }}
          onDeleteProject={async (id) => {
            if (confirm('Are you sure you want to delete this project?')) {
              await deleteProject(id);
              toast('Project deleted', 'success');
            }
          }}
        />
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-card border border-border rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 text-brand-700 rounded-xl flex items-center justify-center">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest">
                      {editingTask ? 'Refine Task' : 'Forge New Task'}
                    </h3>
                    <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Workspace Workflow</p>
                  </div>
                </div>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-secondary rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-0 flex flex-col h-[70vh] max-h-[600px]">
                {/* Modal Tabs */}
                <div className="flex items-center gap-1 p-2 bg-secondary/5 border-b border-border overflow-x-auto no-scrollbar">
                  {[
                    { id: 'details', label: 'Details', icon: FileText },
                    { id: 'subtasks', label: 'Checklist', icon: ListTodo },
                    { id: 'comments', label: 'Activity', icon: MessageSquare },
                    { id: 'meta', label: 'Meta', icon: Tag },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveModalTab(tab.id as any)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                        activeModalTab === tab.id 
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      <tab.icon className="w-3 h-3" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {activeModalTab === 'details' && (
                    <motion.div 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <div className="space-y-1.5">
                        <label className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Task Title</label>
                        <input
                          type="text"
                          required
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="e.g., Design new QR template system"
                          className="w-full px-3 py-2.5 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all text-[10px] font-black uppercase tracking-tight"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Description</label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Detailed instructions for the forge..."
                          rows={4}
                          className="w-full px-3 py-2.5 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all resize-none text-[9px] font-medium leading-relaxed"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Priority</label>
                          <Select value={formData.priority} onValueChange={(val: any) => setFormData({ ...formData, priority: val })}>
                            <SelectTrigger className="h-10 bg-secondary/30 border-border text-[9px] font-black uppercase tracking-widest rounded-xl">
                              <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Status</label>
                          <Select value={formData.status} onValueChange={(val: any) => setFormData({ ...formData, status: val })}>
                            <SelectTrigger className="h-10 bg-secondary/30 border-border text-[9px] font-black uppercase tracking-widest rounded-xl">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todo">To Do</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="review">Review</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="blocked">Blocked</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Project</label>
                          <Select value={formData.projectId} onValueChange={(val: any) => setFormData({ ...formData, projectId: val })}>
                            <SelectTrigger className="h-10 bg-secondary/30 border-border text-[9px] font-black uppercase tracking-widest rounded-xl">
                              <SelectValue placeholder="No Project" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Project</SelectItem>
                              {projects.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Assignee</label>
                          <Select value={formData.assigneeId} onValueChange={(val: any) => setFormData({ ...formData, assigneeId: val })}>
                            <SelectTrigger className="h-10 bg-secondary/30 border-border text-[9px] font-black uppercase tracking-widest rounded-xl">
                              <SelectValue placeholder="Assignee" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {members.map(m => (
                                <SelectItem key={m.uid || m.id} value={(m.uid || m.id) || 'unknown'}>{m.email}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Due Date</label>
                          <input
                            type="date"
                            value={formData.dueDate}
                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                            className="w-full h-10 px-3 bg-secondary/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all text-[9px] font-black uppercase tracking-widest"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeModalTab === 'subtasks' && (
                    <motion.div 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <h4 className="text-[9px] font-black uppercase tracking-widest">Checklist Items</h4>
                          <span className="text-[7px] font-black text-brand-700 uppercase tracking-widest">
                            {formData.subtasks.filter(s => s.completed).length}/{formData.subtasks.length} Done
                          </span>
                        </div>
                        
                        <div className="space-y-1.5">
                          {formData.subtasks.map((sub, idx) => (
                            <div key={sub.id} className="flex items-center gap-2.5 p-2.5 bg-secondary/20 rounded-xl border border-border/50 group">
                              <button 
                                type="button"
                                onClick={() => {
                                  const newSubs = [...formData.subtasks];
                                  newSubs[idx].completed = !newSubs[idx].completed;
                                  setFormData({ ...formData, subtasks: newSubs });
                                }}
                                className={cn(
                                  "w-4 h-4 rounded-md border flex items-center justify-center transition-all",
                                  sub.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-border bg-card"
                                )}
                              >
                                {sub.completed && <Check className="w-3 h-3" />}
                              </button>
                              <span className={cn("text-[9px] font-black uppercase tracking-tight flex-1", sub.completed && "line-through opacity-40")}>
                                {sub.title}
                              </span>
                              <button 
                                type="button"
                                onClick={() => setFormData({ ...formData, subtasks: formData.subtasks.filter((_, i) => i !== idx) })}
                                className="p-1.5 text-muted-foreground hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2 mt-2">
                          <input 
                            type="text"
                            value={newSubtask}
                            onChange={(e) => setNewSubtask(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                            placeholder="Add item to checklist..."
                            className="flex-1 px-3 py-2 bg-secondary/30 border border-border rounded-xl text-[9px] font-black uppercase tracking-tight focus:outline-none focus:ring-1 focus:ring-primary/20"
                          />
                          <button 
                            type="button"
                            onClick={handleAddSubtask}
                            className="px-3 py-2 bg-primary text-primary-foreground rounded-xl text-[8px] font-black uppercase tracking-widest"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeModalTab === 'comments' && (
                    <motion.div 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                    >
                      <div className="space-y-4">
                        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                          {editingTask?.comments?.map((comment) => (
                            <div key={comment.id} className="flex gap-3 p-3 bg-secondary/10 rounded-2xl border border-border/50">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-brand-700">
                                {comment.userId[0].toUpperCase()}
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[8px] font-black uppercase tracking-widest text-brand-700">User</span>
                                  <span className="text-[7px] text-muted-foreground font-mono">Just now</span>
                                </div>
                                <p className="text-[10px] font-medium leading-relaxed">{comment.text}</p>
                              </div>
                            </div>
                          ))}
                          {(!editingTask?.comments || editingTask.comments.length === 0) && (
                            <div className="text-center py-10 opacity-40">
                              <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                              <p className="text-[8px] font-black uppercase tracking-widest">No activity yet</p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 mt-4">
                          <input 
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Write a comment..."
                            className="flex-1 px-4 py-3 bg-secondary/30 border border-border rounded-xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-primary transition-all"
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              if (!newComment.trim()) return;
                              toast('Comment functionality coming soon', 'info');
                              setNewComment('');
                            }}
                            className="px-4 bg-primary text-primary-foreground rounded-xl font-black uppercase tracking-widest text-[9px] hover:scale-105 transition-all"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeModalTab === 'meta' && (
                    <motion.div 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Assignee</label>
                          <Select value={formData.assigneeId} onValueChange={(val: any) => setFormData({ ...formData, assigneeId: val })}>
                            <SelectTrigger className="h-11 bg-secondary/30 border-border text-[10px] font-black uppercase tracking-widest rounded-xl">
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {members.map(m => (
                                <SelectItem key={m.uid || m.id} value={(m.uid || m.id) || 'unknown'}>{m.email}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Due Date</label>
                          <input 
                            type="date"
                            value={formData.dueDate}
                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                            className="w-full h-11 px-4 bg-secondary/30 border border-border rounded-xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Estimated Hours</label>
                          <input 
                            type="number"
                            value={formData.estimatedHours}
                            onChange={(e) => setFormData({ ...formData, estimatedHours: parseFloat(e.target.value) })}
                            className="w-full h-11 px-4 bg-secondary/30 border border-border rounded-xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Time Spent (Hrs)</label>
                          <input 
                            type="number"
                            value={formData.spentHours}
                            onChange={(e) => setFormData({ ...formData, spentHours: parseFloat(e.target.value) })}
                            className="w-full h-11 px-4 bg-secondary/30 border border-border rounded-xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Attachments</label>
                        <div className="p-4 border border-dashed border-border rounded-2xl text-center space-y-2 bg-secondary/10">
                          <Paperclip className="w-6 h-6 mx-auto text-muted-foreground" />
                          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Drop assets here or click to upload</p>
                          <button type="button" className="text-[7px] font-black uppercase tracking-widest text-brand-700 hover:underline">Browse Files</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="p-6 border-t border-border flex gap-3 bg-secondary/5">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-4 bg-secondary text-foreground rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-muted transition-all"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-primary/20"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {editingTask ? 'Update Task' : 'Forge Task'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-card border border-border rounded-[2.5rem] p-8 text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-rose-500" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight mb-2">Destroy Task?</h3>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-8">
                This action is irreversible. The task will be purged from the forge forever.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingId(null)}
                  className="flex-1 px-6 py-4 bg-secondary text-foreground rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-muted transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deletingId)}
                  className="flex-1 px-6 py-4 bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20"
                >
                  Confirm Purge
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Project Modal */}
      <AnimatePresence>
        {isAddingProject && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-card border border-border rounded-[2rem] overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/10">
                <h3 className="text-sm font-black uppercase tracking-widest">
                  {editingProject ? 'Refine Project' : 'Forge New Project'}
                </h3>
                <button onClick={() => setIsAddingProject(false)} className="p-2 hover:bg-secondary rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleProjectSubmit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Project Name</label>
                  <input
                    type="text"
                    required
                    value={projectFormData.name}
                    onChange={(e) => setProjectFormData({ ...projectFormData, name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-secondary/30 border border-border rounded-xl focus:outline-none text-[10px] font-black uppercase tracking-tight"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Description</label>
                  <textarea
                    value={projectFormData.description}
                    onChange={(e) => setProjectFormData({ ...projectFormData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2.5 bg-secondary/30 border border-border rounded-xl focus:outline-none text-[9px] font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Status</label>
                    <Select value={projectFormData.status} onValueChange={(val: any) => setProjectFormData({ ...projectFormData, status: val })}>
                      <SelectTrigger className="h-10 bg-secondary/30 border-border text-[9px] font-black uppercase tracking-widest rounded-xl">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Color</label>
                    <input
                      type="color"
                      value={projectFormData.color}
                      onChange={(e) => setProjectFormData({ ...projectFormData, color: e.target.value })}
                      className="w-full h-10 p-1 bg-secondary/30 border border-border rounded-xl cursor-pointer"
                    />
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddingProject(false)}
                    className="flex-1 py-4 bg-secondary text-foreground rounded-2xl font-black uppercase tracking-widest text-[10px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20"
                  >
                    {editingProject ? 'Update' : 'Forge'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProjectsView = ({ projects, onAddProject, onEditProject, onDeleteProject }: any) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <button
        onClick={onAddProject}
        className="h-[160px] border-2 border-dashed border-border rounded-[2rem] flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary hover:text-brand-700 transition-all group bg-secondary/5"
      >
        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-all">
          <Plus className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest">Forge New Project</span>
      </button>

      {projects.map((project: any) => (
        <motion.div
          key={project.id}
          layout
          className="p-6 bg-card border border-border rounded-[2rem] shadow-sm hover:shadow-xl hover:border-primary/20 transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: project.color }} />
          
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${project.color}15`, color: project.color }}>
              <Folder className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => onEditProject(project)}
                className="p-2 text-muted-foreground hover:text-brand-700 hover:bg-primary/10 rounded-lg transition-all"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onDeleteProject(project.id)}
                className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <h3 className="text-xs font-black uppercase tracking-tight mb-1">{project.name}</h3>
          <p className="text-[9px] text-muted-foreground font-medium line-clamp-2 mb-4">{project.description || 'No description provided.'}</p>
          
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <span className="text-[8px] font-black uppercase tracking-widest opacity-40">{project.status}</span>
            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-brand-700">
              View Tasks
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

const CalendarView = ({ tasks, onEditTask }: any) => {
  // Simplified Calendar View
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const calendarDays = [];
  for (let i = 0; i < startOfMonth.getDay(); i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= endOfMonth.getDate(); i++) {
    calendarDays.push(new Date(today.getFullYear(), today.getMonth(), i));
  }

  return (
    <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
      <div className="p-6 border-b border-border bg-secondary/10 flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest">{format(today, 'MMMM yyyy')}</h3>
        <div className="flex gap-2">
          <button className="p-2 hover:bg-secondary rounded-xl"><ChevronLeft className="w-4 h-4" /></button>
          <button className="p-2 hover:bg-secondary rounded-xl"><ArrowRight className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-border">
        {days.map(d => (
          <div key={d} className="py-3 text-center text-[8px] font-black uppercase tracking-widest text-muted-foreground border-r border-border last:border-0">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-[120px]">
        {calendarDays.map((date, i) => (
          <div key={i} className={cn(
            "p-2 border-r border-b border-border last:border-r-0 relative group transition-colors hover:bg-secondary/5",
            !date && "bg-secondary/10"
          )}>
            {date && (
              <>
                <span className={cn(
                  "text-[10px] font-black",
                  date.toDateString() === today.toDateString() ? "text-brand-700" : "text-muted-foreground"
                )}>
                  {date.getDate()}
                </span>
                <div className="mt-1 space-y-1 overflow-y-auto max-h-[80px] no-scrollbar">
                  {tasks.filter((t: any) => t.dueDate && new Date(t.dueDate).toDateString() === date.toDateString()).map((task: any) => (
                    <div 
                      key={task.id}
                      onClick={() => onEditTask(task)}
                      className="px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded text-[7px] font-black uppercase tracking-tight truncate cursor-pointer hover:bg-primary/20 transition-all"
                    >
                      {task.title}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const GanttView = ({ tasks, onEditTask }: any) => {
  // Simplified Timeline/Gantt View
  const sortedTasks = [...tasks].sort((a: any, b: any) => {
    const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
    const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
    return dateA - dateB;
  });

  const calculatePosition = (task: any) => {
    if (!task.startDate || !task.dueDate) return { left: '10%', width: '80%' };
    
    const start = new Date(task.startDate).getTime();
    const end = new Date(task.dueDate).getTime();
    
    // Use a 30-day window around the current month
    const today = new Date();
    const windowStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    const windowEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).getTime();
    const totalDuration = windowEnd - windowStart;
    
    const left = ((start - windowStart) / totalDuration) * 100;
    const width = ((end - start) / totalDuration) * 100;
    
    return { 
      left: `${Math.max(0, Math.min(90, left))}%`, 
      width: `${Math.max(10, Math.min(100 - left, width))}%` 
    };
  };

  return (
    <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
      <div className="p-6 border-b border-border bg-secondary/10 flex justify-between items-center">
        <h3 className="text-xs font-black uppercase tracking-widest">Project Timeline</h3>
        <p className="text-[8px] font-black uppercase tracking-widest opacity-40">{format(new Date(), 'MMMM yyyy')}</p>
      </div>
      <div className="p-6 overflow-x-auto no-scrollbar">
        <div className="min-w-[800px] space-y-4">
          {sortedTasks.map((task: any) => {
            const pos = calculatePosition(task);
            return (
              <div key={task.id} className="flex items-center gap-4 group">
                <div className="w-40 flex-shrink-0">
                  <h4 className="text-[9px] font-black uppercase tracking-tight truncate group-hover:text-brand-700 transition-colors cursor-pointer" onClick={() => onEditTask(task)}>
                    {task.title}
                  </h4>
                  <span className="text-[7px] text-muted-foreground uppercase font-black">{task.status}</span>
                </div>
                <div className="flex-1 h-8 bg-secondary/20 rounded-xl relative overflow-hidden">
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: pos.width, left: pos.left, opacity: 1 }}
                    className={cn(
                      "absolute h-full rounded-xl flex items-center px-3",
                      task.status === 'completed' ? "bg-emerald-500/20 border border-emerald-500/30" : "bg-primary/20 border border-primary/30"
                    )}
                  >
                    <div className={cn(
                      "h-1.5 rounded-full",
                      task.status === 'completed' ? "bg-emerald-500" : "bg-primary"
                    )} style={{ width: '100%' }} />
                  </motion.div>
                </div>
              </div>
            );
          })}
          {sortedTasks.length === 0 && (
            <div className="text-center py-20 opacity-40">
              <Clock className="w-10 h-10 mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">No timeline data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
