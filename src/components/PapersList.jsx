import React, { useEffect, useState, useRef } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { supabase } from '../supabaseClient';
import SUBJECTS_DATA from '../data/subjects.json';
import { groupPapersByAcademicYear } from '../utils/paperGrouping';
import { isPaperMatchingBranch } from '../utils/subjectHelper';
import GroupedPapersList from './GroupedPapersList';

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

export default function PapersList({ user, preferences, onResetPreferences, canUpload, onUploadClick }) {
  const [papers, setPapers] = useState([]);
  const [filteredPapers, setFilteredPapers] = useState([]);
  const [academicYearGroups, setAcademicYearGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [studentNames, setStudentNames] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [pillIndicator, setPillIndicator] = useState({ width: 0, left: 0 });
  const pillRefs = useRef([]);
  const fetchedEnrollmentsRef = useRef(new Set());

  useEffect(() => {
    if (preferences) {
      setSelectedYear(preferences.year);
      setSelectedSemester(preferences.semester);
      setSelectedBranch(preferences.branch);
    }
  }, [preferences]);

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

    if (selectedSemester !== '') {
      filtered = filtered.filter(paper => paper.semester === `Semester ${selectedSemester}`);
    }

    if (selectedBranch) {
      filtered = filtered.filter(paper => isPaperMatchingBranch(paper, selectedBranch));
    }

    if (selectedSubject) {
      filtered = filtered.filter(paper => paper.subject === selectedSubject);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(paper => {
        const titleMatch = (paper.filename || '').toLowerCase().includes(q);
        const subjectMatch = (paper.subject || '').toLowerCase().includes(q);
        const batchMatch = (paper.batch || '').toLowerCase().includes(q);
        const uploaderName = (studentNames[paper.uploaded_by] || paper.uploaded_by || '').toLowerCase();
        const uploaderMatch = uploaderName.includes(q);
        return titleMatch || subjectMatch || batchMatch || uploaderMatch;
      });
    }

    setFilteredPapers(filtered);
  }, [papers, selectedYear, selectedSemester, selectedBranch, selectedSubject, searchQuery, studentNames]);

  useEffect(() => {
    const yearData = selectedYear ? SUBJECTS_DATA[selectedYear] : null;
    
    if (!yearData) {
      setAvailableSubjects(ALL_SUBJECTS);
      return;
    }

    const semesterKey = selectedSemester !== '' ? `Semester ${selectedSemester}` : null;
    const subjectsForFilter = new Set();
    
    if (selectedYear === '1st Year') {
      const branchData = yearData['*'];
      if (branchData && semesterKey) {
        const semesterSubjects = branchData[semesterKey];
        if (semesterSubjects) {
          semesterSubjects.forEach(s => subjectsForFilter.add(s));
        }
      }
    } else if (selectedBranch && selectedBranch !== '*') {
      const branchData = yearData[selectedBranch];
      if (branchData && semesterKey) {
        const semesterSubjects = branchData[semesterKey];
        if (semesterSubjects) {
          semesterSubjects.forEach(s => subjectsForFilter.add(s));
        }
      }
    } else if (semesterKey) {
      for (const branchData of Object.values(yearData)) {
        const semesterSubjects = branchData[semesterKey];
        if (semesterSubjects) {
          semesterSubjects.forEach(s => subjectsForFilter.add(s));
        }
      }
    }
    
    const subjectsList = [...subjectsForFilter].sort();
    setAvailableSubjects(subjectsList);
    
    if (selectedSubject && !subjectsList.includes(selectedSubject)) {
      setSelectedSubject('');
    }
  }, [selectedYear, selectedSemester, selectedBranch, selectedSubject]);

  useEffect(() => {
    const ayGroups = groupPapersByAcademicYear(filteredPapers);
    setAcademicYearGroups(ayGroups);
  }, [filteredPapers]);

  useEffect(() => {
    if (papers.length > 0) {
      const uniqueEnrollments = [...new Set(papers.map(p => p.uploaded_by).filter(Boolean))];
      
      uniqueEnrollments.forEach(enrollment => {
        if (!fetchedEnrollmentsRef.current.has(enrollment)) {
          fetchedEnrollmentsRef.current.add(enrollment);
          getStudentName(enrollment);
        }
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
      
      const sortedData = (data || []).sort((a, b) => {
        const timeA = new Date(a.order_at || a.inserted_at).getTime();
        const timeB = new Date(b.order_at || b.inserted_at).getTime();
        return timeB - timeA;
      });

      setPapers(sortedData);
      setFilteredPapers(sortedData);
    } catch (err) {
      console.error('Error fetching papers:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStudentName = async (id) => {
    let enrollmentNumber = id.replace("@mail.jiit.ac.in", "");
    
    // this is a private api. only works for AY2025-26 rn
    const response = await fetch(`https://jiitstudent.vercel.app/student/${enrollmentNumber}`);
    const data = await response.json();
    let name;
    data.success ? name = data.data.name.toLowerCase().replace(/(^|\s)\w/g, match => match.toUpperCase()) : '';
    
    if (data.success) {
      setStudentNames(prev => ({
        ...prev,
        [id]: name
      }));
    } 
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedSubject('');
  };

  if (loading) return <p>Loading papers...</p>;
  if (error) return <p className="error-message">Error: {error}</p>;

  return (
    <>
    {papers.length > 0 && (
      <>
        {preferences && (
          <div className="preferences-banner">
            <div className="preferences-info">
              <p>Showing papers for <strong>{preferences.year}</strong> {preferences.semester && `• Semester ${preferences.semester}`} {preferences.branch !== '*' && `• ${preferences.branch}`}</p>
            </div>
            <button 
              onClick={onResetPreferences}
              className="change-preferences-btn"
            >
              Change
            </button>
          </div>
        )}
      </>
    )}

    <div className="search-filter-section">
      <div className="search-bar-container">
        <FaSearch className="search-icon" />
        <input 
          type="text"
          className="search-input"
          placeholder="Search by subject, title, batch, uploader..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button 
            type="button"
            className="clear-search-btn" 
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
          >
            <FaTimes size={12} />
          </button>
        )}
      </div>

      {onUploadClick && (
        <button 
          onClick={onUploadClick}
          className="desktop-upload-btn"
        >
          {canUpload ? 'Upload Paper' : 'Sign In to Upload'}
        </button>
      )}
    </div>

    <div className="main-container">
      <h2>Available Papers <span className="filtered-papers-counter">{filteredPapers.length}</span></h2> 
      
      {papers.length === 0 ? (
        <p>No papers uploaded yet.</p>
      ) : filteredPapers.length === 0 ? (
        <div className="empty-results-box">
          <p>No papers match your search.</p>
          {(searchQuery || selectedSubject) && (
            <button
              type="button"
              className="clear-filters-btn"
              onClick={handleClearFilters}
            >
              clear search
            </button>
          )}
        </div>
      ) : (
        <GroupedPapersList 
          academicYearGroups={academicYearGroups}
          user={user}
          studentNames={studentNames}
          onDelete={fetchPapers}
        />
      )}
    </div>
    </>
  );
}
