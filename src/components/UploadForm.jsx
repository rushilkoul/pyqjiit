import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function UploadForm({ user }) {
  const [file, setFile] = useState(null);
  const [meta, setMeta] = useState({ subject: '', year: '', batch: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [papers, setPapers] = useState([]);

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    const { data } = await supabase.from('papers').select('*');
    setPapers(data || []);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setError('');

    if (!file) return setError('Choose a file');

    // duplicate check
    const duplicate = papers.some(p => p.filename.toLowerCase() === file.name.toLowerCase());
    if (duplicate) return setError('A paper with this filename already exists');

    // MIME type check
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(file.type)) return setError('Only PDF/PNG/JPEG allowed'); // ALTHOUGH, wildcards setup in supabase `image/*`
                                                                                    // ig we will see how this turns out

    // 2 mb size limit
    if (file.size > 2 * 1024 * 1024) return setError('Max file size 2 MB.');

    setLoading(true);
    const fileKey = `${user.id}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from('papers').upload(fileKey, file);
    if (upErr) {
      setError(upErr.message);
      setLoading(false);
      return;
    }

    const { error: insertErr } = await supabase.from('papers').insert([{
      filename: file.name,
      file_key: fileKey,
      subject: meta.subject,
      year: meta.year,
      batch: meta.batch,
      uploaded_by: user.email,
      uploaded_by_id: user.id
    }]);

    if (insertErr) setError(insertErr.message);
    else {
      setFile(null);
      setMeta({ subject: '', year: '', batch: '' });
      fetchPapers();
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleUpload}>
      <input type="file" onChange={e => setFile(e.target.files[0])} required />
      <input type="text" placeholder="Subject" value={meta.subject} onChange={e => setMeta({...meta, subject: e.target.value})} required />
      <input type="text" placeholder="Year" value={meta.year} onChange={e => setMeta({...meta, year: e.target.value})} required />
      <input type="text" placeholder="Batch" value={meta.batch} onChange={e => setMeta({...meta, batch: e.target.value})} required />
      <button type="submit" disabled={loading}>{loading ? 'Uploading...' : 'Upload'}</button>
      <p>{error}</p>
    </form>
  );
}
