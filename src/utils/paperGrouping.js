export const normalizePaperName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/-/g, '');
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

  return Object.values(groups).sort((a, b) => {
    const lastA = new Date(a.papers[0].inserted_at).getTime();
    const lastB = new Date(b.papers[0].inserted_at).getTime();
    return lastB - lastA;
  });
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
