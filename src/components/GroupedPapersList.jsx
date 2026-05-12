import React from 'react';
import { supabase } from '../supabaseClient';

export default function GroupedPapersList({ paperGroups, user, studentNames, onDelete }) {
  const handleDelete = async (paperId, ownerId) => {
    if (!user) return alert('You must be logged in to delete papers.');
    if (user.id !== ownerId) return alert('You can only delete your own papers.');
    if (!window.confirm('Are you sure you want to delete this paper?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('papers')
        .delete()
        .eq('id', paperId);
      if (deleteError) throw deleteError;
      onDelete();
    } catch (err) {
      console.error('Error deleting paper:', err.message);
      alert('Error deleting paper: ' + err.message);
    }
  };

  return (
    <ul className="responses-container">
      {paperGroups.map((group) => {
        return (
          <li key={group.normalizedName} className="free-class grouped-paper-container">
            <div className="paper-info">
              <div className="paper-header">
                <h3>{group.displayName}</h3>
                <div className="paper-badges">
                  {group.subject && <span className="badge subject">{group.subject}</span>}
                  {group.branch && <span className="badge branch">{group.branch === '*' ? 'All Branches' : group.branch}</span>}
                </div>
              </div>

              {/* <div className="paper-details">
                {group.year && group.semester && <p><strong>{group.year} - {group.semester}</strong></p>}
                {group.year && !group.semester && <p><strong>{group.year}</strong></p>}
              </div> */}

              <div className="grouped-papers-tiles">
                {group.papers.map((paper) => {
                  const { data: publicUrlData } = supabase
                    .storage
                    .from('papers')
                    .getPublicUrl(paper.file_key);
                    

                  const displayName = studentNames[paper.uploaded_by] || paper.uploaded_by;

                  return (
                    <div key={paper.id} className="paper-tile">
                      <div className="tile-content">
                        {paper.batch && paper.batch.toLowerCase() == "all" && (
                          <p><strong>Batches:</strong> {paper.batch}</p>
                        )}
                        {paper.batch && paper.batch.toLowerCase() !== "all" && (
                          <p><strong>Batch:</strong> {paper.batch}</p>
                        )}
                        <p><strong>On:</strong> {new Date(paper.inserted_at).toLocaleDateString()}</p>
                        <p style={{ fontWeight: '200', opacity: '0.6', fontSize: '11px' }}>uploaded by {displayName}</p>
                      </div>
                      <div className="tile-actions">
                        {paper.verified && <span className="badge verified">✓ Verified</span>}
                        {paper.flagged && (<span className="badge flagged">⚠ Flagged</span>)}
                        <a
                          href={publicUrlData.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="view-button"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-arrow-up-right" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M14 2.5a.5.5 0 0 0-.5-.5h-6a.5.5 0 0 0 0 1h4.793L2.146 13.146a.5.5 0 0 0 .708.708L13 3.707V8.5a.5.5 0 0 0 1 0z"/>
                            </svg>
                        </a>
                        {user && user.id === paper.uploaded_by_id && (
                          <button 
                            onClick={() => handleDelete(paper.id, paper.uploaded_by_id)}
                            className="delete-button"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
