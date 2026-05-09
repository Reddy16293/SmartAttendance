import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Hash, QrCode, Camera } from 'lucide-react';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Sessions() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<any[]>([]);
  const [subjectsMap, setSubjectsMap] = useState<Record<number,string>>({});
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => { fetchClasses(); }, []);

  useEffect(() => { if (selectedClass) fetchSessions(); else setSessions([]); }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const [cRes, sRes] = await Promise.all([
        fetch(`${API_URL}/teachers/classes`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/teachers/subjects`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const classes = cRes.ok ? await cRes.json() : [];
      const subs = sRes.ok ? await sRes.json() : [];
      const map: Record<number,string> = {};
      subs.forEach((s:any)=> map[s.id]=s.name);
      setSubjectsMap(map);
      setClasses(classes.map((c:any)=>({ ...c, subject_name: c.subject?.name || map[c.subject_id] || c.subject_name })));
      if (classes.length>0) setSelectedClass(classes[0].id);
    } catch (e) { console.error('Failed to load classes', e); }
  };

  const fetchSessions = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/teachers/classes/${selectedClass}/sessions`, { headers: { Authorization: `Bearer ${token}` } });
      const data = res.ok ? await res.json() : [];
      setSessions(data || []);
    } catch (e) { console.error('Failed to load sessions', e); }
    setLoading(false);
  };

  const paged = useMemo(()=>{
    const start = (page-1)*PAGE_SIZE;
    return sessions.slice(start, start+PAGE_SIZE);
  }, [sessions, page]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">Attendance Sessions</h1>
          <p className="text-muted-foreground text-sm md:text-base mt-1">Review and manage class attendance</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Select Class</CardTitle>
            <CardDescription>Choose class to view recent sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
              {classes.map(c=> (
                <Button key={c.id} variant={c.id===selectedClass? 'default':'outline'} onClick={()=>setSelectedClass(c.id)} size="sm" className="text-xs md:text-sm">
                  {c.subject_name || 'Unknown'} • Y{c.year}S{c.section}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Session History</CardTitle>
            <CardDescription>Recent sessions for the selected class</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <div>Loading…</div> : (
              <div className="space-y-3">
                {sessions.length===0 ? <p className="text-muted-foreground">No sessions yet.</p> : paged.map((s:any)=> (
                  <div key={s.id} className="p-3 md:p-4 border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm md:text-base">{new Date(s.date).toLocaleDateString()}</div>
                      <div className="text-xs md:text-sm text-muted-foreground">{new Date(s.date).toLocaleTimeString()} • {s.status?.toUpperCase()}</div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                      {s.attendance_code && <Hash className="h-4 w-4 md:h-5 md:w-5 text-primary" />}
                      {s.qr_enabled && <QrCode className="h-4 w-4 md:h-5 md:w-5 text-primary" />}
                      {s.face_recognition_enabled && <Camera className="text-primary" />}
                      <Button onClick={()=>navigate(`/professor/session/${s.id}?classId=${selectedClass}`)}>View Details</Button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">Page {page} / {Math.max(1, Math.ceil(sessions.length / PAGE_SIZE))}</div>
                  <div className="flex gap-2">
                    <Button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>Prev</Button>
                    <Button onClick={()=>setPage(p=>p+1)} disabled={page*PAGE_SIZE >= sessions.length}>Next</Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
