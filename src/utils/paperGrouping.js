export const normalizePaperName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/-/g, '');
};


export const getAcademicYear = (dateInput) => {
  if (!dateInput) return 'Other';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'Other';
  
  const year = d.getFullYear();
  const month = d.getMonth();

  const startYear = month >= 6 ? year : year - 1;
  const endYear = startYear + 1;
  const endYearShort = String(endYear).slice(-2);
  
  return `${startYear}-${endYearShort}`;
};

export const groupPapersByName = (papers) => {
  const groups = {};

  papers.forEach((paper) => {
    const normalizedName = normalizePaperName(paper.filename);
    
    if (!groups[normalizedName]) {
      groups[normalizedName] = {
        normalizedName,
        displayName: paper.filename,
        subject: paper.subject,
        year: paper.year,
        semester: paper.semester,
        branch: paper.branch,
        papers: []
      };
    }
    
    groups[normalizedName].papers.push(paper);
  });

  Object.values(groups).forEach(group => {
    group.papers.sort((a, b) => {
      const dateA = new Date(a.order_at || a.inserted_at).getTime();
      const dateB = new Date(b.order_at || b.inserted_at).getTime();
      return dateB - dateA;
    });
  });

  return Object.values(groups).sort((a, b) => {
    const lastA = new Date(a.papers[0]?.order_at || a.papers[0]?.inserted_at).getTime();
    const lastB = new Date(b.papers[0]?.order_at || b.papers[0]?.inserted_at).getTime();
    return lastB - lastA;
  });
};

export const groupPapersByAcademicYear = (papers) => {
  if (!papers || papers.length === 0) return [];
  
  const ayMap = {};
  
  papers.forEach((paper) => {
    const ay = getAcademicYear(paper.order_at || paper.inserted_at);
    if (!ayMap[ay]) {
      ayMap[ay] = [];
    }
    ayMap[ay].push(paper);
  });

  const sortedAYs = Object.keys(ayMap).sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    const startA = parseInt(a.split('-')[0], 10) || 0;
    const startB = parseInt(b.split('-')[0], 10) || 0;
    return startB - startA;
  });
  
  return sortedAYs.map((academicYear) => ({
    academicYear,
    displayName: academicYear === 'Other' ? 'Other' : `${academicYear}`,
    paperGroups: groupPapersByName(ayMap[academicYear]),
    totalCount: ayMap[academicYear].length,
  }));
};

export const getBatchesFromGroup = (papers) => {
  const batches = [];
  
  papers.forEach((paper) => {
    if (paper.batch) {
      const batchList = paper.batch
        .split(',')
        .map(b => b.trim())
        .filter(b => b && b.toLowerCase() !== 'all');
      batches.push(...batchList);
    }
  });

  return [...new Set(batches)].sort();
};

export const getUploadersFromGroup = (papers, studentNames) => {
  const uploaders = {};
  
  papers.forEach((paper) => {
    if (paper.uploaded_by && !uploaders[paper.uploaded_by]) {
      uploaders[paper.uploaded_by] = {
        enrollmentId: paper.uploaded_by,
        displayName: studentNames[paper.uploaded_by] || paper.uploaded_by,
        uploadedById: paper.uploaded_by_id
      };
    }
  });

  return Object.values(uploaders);
};
