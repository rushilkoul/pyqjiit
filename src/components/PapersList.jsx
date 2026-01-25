import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import SUBJECTS_DATA from '../data/subjects.json';

const ALL_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const ALL_BRANCHES = ['ECE', 'CSEIT', 'BT', 'MNC', 'RAI'];

const getAllSubjects = () => {
  const subjects = new Set();
  for (const yearData of Object.values(SUBJECTS_DATA)) {
    for (const branchData of Object.values(yearData)) {
      for (const semesterSubjects of Object.values(branchData)) {
        semesterSubjects.forEach(s => subjects.add(s));
      }
    }
  }
  return [...subjects].sort();
};

const ALL_SUBJECTS = getAllSubjects();

export default function PapersList({ user }) {
  const [papers, setPapers] = useState([]);
  const [filteredPapers, setFilteredPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [studentNames, setStudentNames] = useState({});
  const [pillIndicator, setPillIndicator] = useState({ width: 0, left: 0 });
  const pillRefs = useRef([]);

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

  useEffect(() => {
    let filtered = papers;

    if (selectedYear) {
      filtered = filtered.filter(paper => paper.year === selectedYear);
    }

    if (selectedBranch) {
      filtered = filtered.filter(paper => paper.branch === selectedBranch || paper.branch === '*');
    }

    if (selectedSubject) {
      filtered = filtered.filter(paper => paper.subject === selectedSubject);
    }

    setFilteredPapers(filtered);
  }, [papers, selectedYear, selectedBranch, selectedSubject]);

  useEffect(() => {
    const yearData = selectedYear ? SUBJECTS_DATA[selectedYear] : null;
    
    if (!yearData) {
      setAvailableSubjects(ALL_SUBJECTS);
      return;
    }
    
    const subjectsForFilter = new Set();
    
    if (selectedYear === '1st Year') {
      const branchData = yearData['*'];
      if (branchData) {
        for (const semesterSubjects of Object.values(branchData)) {
          semesterSubjects.forEach(s => subjectsForFilter.add(s));
        }
      }
    } else if (selectedBranch && selectedBranch !== '*') {
      const branchData = yearData[selectedBranch];
      if (branchData) {
        for (const semesterSubjects of Object.values(branchData)) {
          semesterSubjects.forEach(s => subjectsForFilter.add(s));
        }
      }
    } else {
      for (const branchData of Object.values(yearData)) {
        for (const semesterSubjects of Object.values(branchData)) {
          semesterSubjects.forEach(s => subjectsForFilter.add(s));
        }
      }
    }
    
    const subjectsList = [...subjectsForFilter].sort();
    setAvailableSubjects(subjectsList);
    
    if (selectedSubject && !subjectsList.includes(selectedSubject)) {
      setSelectedSubject('');
    }
  }, [selectedYear, selectedBranch, selectedSubject]);

  useEffect(() => {
    if (papers.length > 0) {
      const uniqueEnrollments = [...new Set(papers.map(p => p.uploaded_by).filter(Boolean))];
      
      uniqueEnrollments.forEach(enrollment => {
        getStudentName(enrollment);
      });
    }
  }, [papers]);

  useEffect(() => {
    const updateIndicator = () => {
      const activeIndex = selectedYear === '' ? 0 : ALL_YEARS.indexOf(selectedYear) + 1;
      const activeButton = pillRefs.current[activeIndex];
      
      if (activeButton) {
        setPillIndicator({
          width: activeButton.offsetWidth,
          left: activeButton.offsetLeft
        });
      }
    };

    const timer = setTimeout(updateIndicator, 10);
    window.addEventListener('resize', updateIndicator);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [selectedYear, papers]);

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
      setFilteredPapers(data);
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

  const getStudentName = async (id) => {
    let enrollmentNumber = id.replace("@mail.jiit.ac.in", "");
    
    // this is a private api. only works for AY2025-26 rn
    const response = await fetch(`https://jiitstudent.vercel.app/student/${enrollmentNumber}`);
    const data = await response.json();
    
    let name = data.data.name.toLowerCase().replace(/(^|\s)\w/g, match => match.toUpperCase());
    
    if (data.success) {
      setStudentNames(prev => ({
        ...prev,
        [id]: name
      }));
    } 
  }

  if (loading) return <p>Loading papers...</p>;
  if (error) return <p className="error-message">Error: {error}</p>;

  return (
    <>
    {papers.length > 0 && (
      <div className="filters-container">
        <h3>Filters</h3>
        <div className="filters-row">
          <div className="filter-group">
            <div className="pill-selector">
              <div 
                className="pill-indicator" 
                style={{ 
                  width: `${pillIndicator.width}px`, 
                  transform: `translateX(${pillIndicator.left}px)` 
                }}
              />
              <button
                ref={el => pillRefs.current[0] = el}
                className={`pill ${selectedYear === '' ? 'active' : ''}`}
                onClick={() => setSelectedYear('')}
              >
                All
              </button>
              {ALL_YEARS.map((year, index) => (
                <button
                  key={year}
                  ref={el => pillRefs.current[index + 1] = el}
                  className={`pill ${selectedYear === year ? 'active' : ''}`}
                  onClick={() => setSelectedYear(year)}
                >
                  Year {index + 1}
                </button>
              ))}
            </div>
          </div>
          
          <div className="filter-item">
            <span>Branch:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="filter-select"
            >
              <option value="">All</option>
              {ALL_BRANCHES.map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <span>Subject:</span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="filter-select"
            >
              <option value="">All</option>
              {availableSubjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>

          
          {(selectedYear || selectedSubject || selectedBranch) && (
            <button
              onClick={() => {
                setSelectedYear('');
                setSelectedBranch('');
                setSelectedSubject('');
              }}
              className="clear-filters-btn"
            >
              clear filters
            </button>
          )}
        </div>
      </div>
    )}
    <div className="main-container">
      <h2>Available Papers <span className="filtered-papers-counter">{filteredPapers.length}</span></h2> 
      
      {papers.length === 0 ? (
        <p>No papers uploaded yet.</p>
      ) : filteredPapers.length === 0 ? (
        <p>No papers match the selected filters{selectedYear && ` (Year: ${selectedYear})`}{selectedSubject && ` (Subject: ${selectedSubject})`}.</p>
      ) : (
        <ul className="responses-container">
          {filteredPapers.map((paper) => {
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
              inserted_at,
              branch
            } = paper;
            
            const { data: publicUrlData } = supabase
              .storage
              .from('papers')
              .getPublicUrl(file_key);

            const uploadDate = new Date(inserted_at).toLocaleDateString();
            const displayName = studentNames[uploaded_by] || uploaded_by;

            return (
              <li key={id} className="free-class">
                <div className="paper-info">
                  <div className="paper-header">
                    <h3>{filename}</h3>
                    <div className="paper-badges">
                      {subject && <span className="badge subject">{subject}</span>}
                      {verified && <span className="badge verified">✓ Verified</span>}
                      {flagged && <span className="badge flagged">⚠ Flagged</span>}
                      {branch && <span className="badge branch">{branch === '*' ? 'All Branches' : branch}</span>}
                    </div>
                  </div>
                  
                  <div className="paper-details">
                    {year && semester && <p><strong>{year} - {semester}</strong></p>}
                    {year && !semester && <p><strong>{year}</strong></p>}
                    {batch && <p><strong>Batch(es):</strong> {batch}</p>}
                    <p><strong>Uploaded:</strong> {uploadDate} by {displayName}</p>

                  </div>
                  
                  <div className="paper-actions">
                    <a
                      href={publicUrlData.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="view-button"
                    >
                      Open
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
    </>
  );
}
