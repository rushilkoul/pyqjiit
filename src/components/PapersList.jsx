import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function PapersList({ user }) {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPapers();

    const channel = supabase
      .channel('papers_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'papers' },
        () => fetchPapers()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchPapers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('papers')
        .select('*')
        .order('inserted_at', { ascending: false });
      if (fetchError) throw fetchError;
      setPapers(data);
    } catch (err) {
      console.error('Error fetching papers:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, ownerId) => {
    if (!user) return alert('You must be logged in to delete papers.');
    if (user.id !== ownerId) return alert('You can only delete your own papers.');
    if (!window.confirm('Are you sure you want to delete this paper?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('papers')
        .delete()
        .eq('id', id);
      if (deleteError) throw deleteError;
      fetchPapers();
    } catch (err) {
      console.error('Error deleting paper:', err.message);
      alert('Error deleting paper: ' + err.message);
    }
  };

  if (loading) return <p>Loading papers...</p>;
  if (error) return <p className="error-message">Error: {error}</p>;

  return (
    <div className="main-container">
      <h2>Available Papers</h2>
      {papers.length === 0 ? (
        <p>No papers uploaded yet.</p>
      ) : (
        <ul className="responses-container">
          {papers.map((paper) => {
            const { 
              id, 
              filename, 
              file_key, 
              subject,
              year,
              semester,
              batch,
              uploaded_by, 
              uploaded_by_id,
              verified,
              flagged,
              inserted_at
            } = paper;
            
            const { data: publicUrlData } = supabase
              .storage
              .from('papers')
              .getPublicUrl(file_key);

            const uploadDate = new Date(inserted_at).toLocaleDateString();

            return (
              <li key={id} className="free-class">
                <div className="paper-info">
                  <div className="paper-header">
                    <h3>{filename}</h3>
                    <div className="paper-badges">
                      {subject && <span className="badge subject">{subject}</span>}
                      {verified && <span className="badge verified">✓ Verified</span>}
                      {flagged && <span className="badge flagged">⚠ Flagged</span>}
                    </div>
                  </div>
                  
                  <div className="paper-details">
                    {year && semester && <p><strong>{year} - {semester}</strong></p>}
                    {year && !semester && <p><strong>{year}</strong></p>}
                    {batch && <p><strong>Batch(es):</strong> {batch}</p>}
                    <p><strong>Uploaded:</strong> {uploadDate} by {uploaded_by || uploaded_by_id}</p>
                  </div>
                  
                  <div className="paper-actions">
                    <a
                      href={publicUrlData.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="view-button"
                    >
                      View Paper
                    </a>
                    {user && user.id === uploaded_by_id && (
                      <button 
                        onClick={() => handleDelete(id, uploaded_by_id)}
                        className="delete-button"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
