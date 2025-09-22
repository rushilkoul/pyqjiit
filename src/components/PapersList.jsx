import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function PapersList() {
  const [papers, setPapers] = useState([]);

  useEffect(() => {
    const fetchPapers = async () => {
      const { data } = await supabase.from('papers').select('*');
      setPapers(data || []);
    };
    fetchPapers();
  }, []);

  const getPublicUrl = (fileKey) => {
    const { data } = supabase.storage.from('papers').getPublicUrl(fileKey);
    return data.publicUrl;
  };

  return (
    <div>
      <h2>Uploaded Papers</h2>
      <ul>
        {papers.map(p => (
          <li key={p.id}>
            <a href={getPublicUrl(p.file_key)} target="_blank">{p.filename}</a>
            <span> — {p.subject} | {p.year} | {p.batch}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
