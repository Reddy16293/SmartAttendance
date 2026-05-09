import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ImageLightbox from '@/components/ui/ImageLightbox';
import { toast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle } from 'lucide-react';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function SessionDetails(){
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const classId = searchParams.get('classId');
  const navigate = useNavigate();

  const [records, setRecords] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  useEffect(()=>{ if (sessionId) fetchRecords(); }, [sessionId]);

  useEffect(()=>{ if (sessionId) fetchSessionDetails(); }, [sessionId]);

  const fetchSessionDetails = async ()=>{
    if (!sessionId) return;
    try{
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/teachers/attendance/session/${sessionId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      setOriginalImageUrl(data.original_image || data.original_image_url || null);
      setAnnotatedImageUrl(data.annotated_image || data.annotated_image_url || null);
    }catch(e){ console.error('Failed to load session details', e); }
  };

  const fetchRecords = async ()=>{
    if (!sessionId) return;
    setLoading(true);
    try{
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/teachers/attendance/session/${sessionId}/records`, { headers: { Authorization: `Bearer ${token}` } });
      const data = res.ok ? await res.json() : [];
      setRecords(data || []);
    }catch(e){ console.error('Failed to load records', e); }
    setLoading(false);
  };

  const filtered = useMemo(()=>{
    if (!query) return records;
    const q = query.toLowerCase();
    return records.filter(r => (
      (r.student_name || '').toLowerCase().includes(q)
      || (r.student_email || '').toLowerCase().includes(q)
      || (r.roll_number || '').toLowerCase().includes(q)
      || String(r.student_id || '').includes(q)
    ));
  }, [records, query]);

  const paged = useMemo(()=>{
    const start = (page-1)*PAGE_SIZE;
    return filtered.slice(start, start+PAGE_SIZE);
  }, [filtered, page]);

  const handleUploadImage = async (file: File | null) => {
    if (!file || !sessionId) return;
    setUploading(true);
    try{
      const token = localStorage.getItem('auth_token');
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch(`${API_URL}/attendance/session/${sessionId}/upload-image`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (res.ok){
        const data = await res.json();
        toast({ title: 'Image processed', description: `Updated ${data.updated_records} records`, });
        // image_with_boxes expected as base64 string
        if (data.image_with_boxes) setPreviewImage(data.image_with_boxes);
        fetchRecords();
      } else {
        const err = await res.json().catch(()=>({detail: 'Server error'}));
        toast({ title: 'Upload failed', description: err.detail || 'Server error', variant: 'destructive' });
      }
    }catch(e){ console.error(e); toast({ title: 'Upload failed', description: 'Network error', variant: 'destructive'}); }
    setUploading(false);
  };

  function toCSV(items: any[]) {
    const header = ['student_id','student_name','roll_number','student_email','final_status','face_detected','qr_verified'];
    const rows = items.map(it => header.map(h => JSON.stringify(it[h] ?? '')));
    return [header.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  function downloadCSV(csv: string, filename: string) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">Session Details</h1>
            <p className="text-muted-foreground">View attendance records for this session</p>
          </div>
          <div></div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search Students</CardTitle>
            <CardDescription>Filter the list by name, email, roll number, or student id</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <input className="w-full px-3 py-2 border rounded" placeholder="Search students..." value={query} onChange={(e:any)=>setQuery(e.target.value)} />
              <input id="imgUpload" type="file" accept="image/*" style={{display:'none'}} onChange={(e)=>handleUploadImage(e.target.files?.[0]||null)} />
              <label htmlFor="imgUpload">
                <Button>{uploading? 'Uploading...':'Upload Classroom Image'}</Button>
              </label>
              <div className="flex gap-2">
                <Button onClick={() => originalImageUrl ? setPreviewImage(originalImageUrl) : toast({ title: 'No image', description: 'No original image for this session' })} disabled={!originalImageUrl}>View Original Image</Button>
                <Button onClick={() => annotatedImageUrl ? setPreviewImage(annotatedImageUrl) : toast({ title: 'No image', description: 'No annotated image for this session' })} disabled={!annotatedImageUrl}>View Annotated Image</Button>
              </div>
            </div>
            <ImageLightbox open={!!previewImage} onOpenChange={(open) => { if (!open) setPreviewImage(null); }} src={previewImage} alt="Session image" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Records</CardTitle>
            <CardDescription>{records.length} records</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <div>Loading…</div> : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex gap-2">
                    <Button onClick={() => { const csv = toCSV(filtered); downloadCSV(csv, `session-${sessionId}-records.csv`); }}>Export CSV</Button>
                    <div className="text-sm text-muted-foreground">Page {page} / {Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}>Prev</Button>
                    <Button onClick={() => setPage(p => p+1)} disabled={page*PAGE_SIZE >= filtered.length}>Next</Button>
                  </div>
                </div>
                {paged.map(r=> (
                  <div key={r.id} className="p-3 border rounded flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{r.student_name || `Student #${r.student_id}`}</div>
                      <div className="text-sm text-muted-foreground">
                        {r.roll_number ? `Roll No: ${r.roll_number}` : ''}
                        {r.roll_number && r.student_email ? ' • ' : ''}
                        {r.student_email || ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">Status</div>
                      <div className={`font-bold ${r.final_status==='present'?'text-success': r.final_status==='pending_approval'?'text-yellow-600':'text-destructive'}`}>
                        {r.final_status?.toUpperCase()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
