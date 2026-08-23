// Role -> Required Skill Matrix (used by Skill Gap Analysis)
const ROLE_SKILLS = {
  "Full-Stack Developer": {
    icon: "svg-fullstack",
    skills: [
      { name: "JavaScript", level: 90 },
      { name: "HTML/CSS", level: 85 },
      { name: "React", level: 80 },
      { name: "Node.js", level: 75 },
      { name: "Databases/SQL", level: 70 },
      { name: "DSA", level: 75 },
      { name: "REST APIs", level: 80 },
      { name: "Git/GitHub", level: 75 }
    ],
    resources: [
      { title: "JavaScript — The Odin Project", desc: "Free full-stack JS path covering HTML, CSS, JS, Node, React.", url: "https://www.theodinproject.com" },
      { title: "SQL — W3Schools", desc: "Quick interactive SQL tutorial for database fundamentals.", url: "https://www.w3schools.com/sql" },
      { title: "DSA — NeetCode", desc: "Curated DSA roadmap with patterns for coding interviews.", url: "https://neetcode.io" }
    ]
  },
  "Data Scientist": {
    icon: "svg-data",
    skills: [
      { name: "Python", level: 90 },
      { name: "Statistics", level: 80 },
      { name: "Machine Learning", level: 80 },
      { name: "Pandas/Numpy", level: 75 },
      { name: "Data Visualization", level: 70 },
      { name: "SQL", level: 75 },
      { name: "Probability", level: 75 },
      { name: "Deep Learning", level: 65 }
    ],
    resources: [
      { title: "Python — Kaggle Learn", desc: "Hands-on micro-courses for Python, ML, and data science.", url: "https://www.kaggle.com/learn" },
      { title: "Statistics — Khan Academy", desc: "Foundational stats & probability course, free.", url: "https://www.khanacademy.org/math/statistics-probability" },
      { title: "ML — Andrew Ng Coursera", desc: "The classic Machine Learning specialization.", url: "https://www.coursera.org/specializations/machine-learning-introduction" }
    ]
  },
  "DevOps Engineer": {
    icon: "svg-devops",
    skills: [
      { name: "Linux", level: 85 },
      { name: "Docker", level: 80 },
      { name: "Kubernetes", level: 70 },
      { name: "CI/CD", level: 75 },
      { name: "Cloud (AWS/Azure)", level: 70 },
      { name: "Scripting (Bash/Python)", level: 75 },
      { name: "Monitoring", level: 65 },
      { name: "Networking", level: 70 }
    ],
    resources: [
      { title: "Linux — Linux Journey", desc: "Free interactive guide from basics to advanced sysadmin.", url: "https://linuxjourney.com" },
      { title: "Docker — Official Docs", desc: "Get started with containers and Dockerfiles.", url: "https://docs.docker.com/get-started" },
      { title: "K8s — KodeKloud Free", desc: "Free Kubernetes learning path with hands-on labs.", url: "https://kodekloud.com" }
    ]
  },
  "Mobile Developer": {
    icon: "svg-mobile",
    skills: [
      { name: "Flutter/Dart", level: 80 },
      { name: "React Native", level: 75 },
      { name: "UI/UX Basics", level: 70 },
      { name: "REST APIs", level: 75 },
      { name: "State Management", level: 70 },
      { name: "Firebase", level: 70 },
      { name: "Git/GitHub", level: 70 },
      { name: "DSA", level: 65 }
    ],
    resources: [
      { title: "Flutter — Official Docs", desc: "Flutter's codelabs for building cross-platform apps.", url: "https://docs.flutter.dev" },
      { title: "React Native — Docs", desc: "Learn RN from Meta's official docs.", url: "https://reactnative.dev" },
      { title: "Firebase — Google", desc: "Backend as a service for mobile apps.", url: "https://firebase.google.com/docs" }
    ]
  },
  "Backend Engineer": {
    icon: "svg-backend",
    skills: [
      { name: "Java/Spring", level: 80 },
      { name: "Python/Django", level: 75 },
      { name: "Node.js", level: 75 },
      { name: "Databases/SQL", level: 80 },
      { name: "System Design", level: 65 },
      { name: "REST APIs", level: 80 },
      { name: "Message Queues", level: 60 },
      { name: "Docker", level: 70 }
    ],
    resources: [
      { title: "System Design Primer", desc: "The GitHub repo for learning large-scale system design.", url: "https://github.com/donnemartin/system-design-primer" },
      { title: "Spring Boot — Docs", desc: "Official Spring Boot quickstart guides.", url: "https://spring.io/quickstart" },
      { title: "SQL — SQLZoo", desc: "Interactive SQL exercises for database mastery.", url: "https://sqlzoo.net" }
    ]
  },
  "Frontend Engineer": {
    icon: "svg-frontend",
    skills: [
      { name: "HTML/CSS", level: 90 },
      { name: "JavaScript", level: 85 },
      { name: "React/Vue", level: 80 },
      { name: "TypeScript", level: 70 },
      { name: "Web Performance", level: 65 },
      { name: "Testing (Jest)", level: 65 },
      { name: "Accessibility", level: 60 },
      { name: "Build Tools", level: 65 }
    ],
    resources: [
      { title: "Frontend Mentor", desc: "Real-world challenges to level up HTML/CSS/JS.", url: "https://www.frontendmentor.io" },
      { title: "TypeScript Handbook", desc: "The official TS learning guide.", url: "https://www.typescriptlang.org/docs" },
      { title: "JavaScript30", desc: "30 vanilla JS projects in 30 days — free.", url: "https://javascript30.com" }
    ]
  },
  "AI/ML Engineer": {
    icon: "svg-ai",
    skills: [
      { name: "Python", level: 90 },
      { name: "Deep Learning", level: 80 },
      { name: "TensorFlow/PyTorch", level: 75 },
      { name: "NLP", level: 70 },
      { name: "Computer Vision", level: 70 },
      { name: "MLOps", level: 60 },
      { name: "Statistics", level: 75 },
      { name: "Big Data Tools", level: 60 }
    ],
    resources: [
      { title: "Fast.ai", desc: "Practical deep learning for coders — free.", url: "https://www.fast.ai" },
      { title: "Hugging Face Learn", desc: "NLP and transformers courses, free.", url: "https://huggingface.co/learn" },
      { title: "PyTorch Tutorials", desc: "Official interactive PyTorch deep learning tutorials.", url: "https://pytorch.org/tutorials" }
    ]
  },
  "SDE": {
    icon: "svg-sde",
    skills: [
      { name: "Data Structures & Algorithms", level: 95 },
      { name: "Problem Solving", level: 90 },
      { name: "Java/C++/Python", level: 85 },
      { name: "Operating Systems", level: 80 },
      { name: "DBMS/SQL", level: 80 },
      { name: "Computer Networks", level: 75 },
      { name: "System Design", level: 75 },
      { name: "Git/GitHub", level: 70 }
    ],
    resources: [
      { title: "NeetCode", desc: "Curated DSA roadmap with patterns for coding interviews.", url: "https://neetcode.io" },
      { title: "Striver's DSA Sheet", desc: "The most popular DSA sheet for campus placements.", url: "https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/" },
      { title: "System Design Primer", desc: "Free GitHub repo for large-scale system design.", url: "https://github.com/donnemartin/system-design-primer" }
    ]
  },
  "Data Analyst": {
    icon: "svg-data-analyst",
    skills: [
      { name: "SQL", level: 90 },
      { name: "Excel", level: 85 },
      { name: "Statistics", level: 80 },
      { name: "Data Cleaning", level: 80 },
      { name: "Python", level: 75 },
      { name: "Data Visualization", level: 75 },
      { name: "Power BI/Tableau", level: 70 },
      { name: "Business Communication", level: 70 }
    ],
    resources: [
      { title: "SQL — SQLZoo", desc: "Interactive SQL exercises for database mastery.", url: "https://sqlzoo.net" },
      { title: "Excel — ExcelJet", desc: "500+ Excel formula examples and shortcuts.", url: "https://exceljet.net" },
      { title: "Data Analysis — Kaggle Learn", desc: "Hands-on courses for pandas, SQL, and visualization.", url: "https://www.kaggle.com/learn" }
    ]
  }
};

// Global skill pool (used by Resume Analyzer & Skill Gap)
const SKILL_POOL = {
  // Languages
  "javascript": ["javascript", "js", "ecmascript", "node.js", "nodejs", "node"],
  "python": ["python", "django", "flask", "pandas", "numpy"],
  "java": ["java", "spring", "spring boot", "hibernate", "core java"],
  "cpp": ["c++", "cpp", "c plus plus"],
  "c": ["c language", "c programming"],
  "typescript": ["typescript", "ts"],
  "go": ["golang", "go language"],
  "rust": ["rust programming"],
  "html/css": ["html", "css", "html5", "css3", "bootstrap", "tailwind", "sass", "scss"],
  "sql": ["sql", "mysql", "postgresql", "postgres", "oracle sql", "sqlite", "mongodb"],
  "php": ["php", "laravel", "codeigniter"],
  "swift": ["swift", "ios"],
  "kotlin": ["kotlin", "android"],
  "dart": ["dart", "flutter"],
  "r": ["r programming"],
  "bash": ["bash", "shell", "shell scripting", "powershell"],
  // Frontend
  "react": ["react", "reactjs", "react.js", "next.js", "nextjs"],
  "vue": ["vue", "vuejs", "nuxt"],
  "angular": ["angular", "angularjs"],
  "jquery": ["jquery"],
  "redux": ["redux", "redux toolkit"],
  // Backend
  "node.js": ["node.js", "nodejs", "express", "express.js", "expressjs", "nestjs"],
  "spring": ["spring", "spring boot", "springboot"],
  "django": ["django", "drf", "django rest"],
  "flask": ["flask"],
  "graphql": ["graphql", "apollo"],
  "rest api": ["rest api", "restful", "rest apis", "api development"],
  // Databases
  "mysql": ["mysql"],
  "postgresql": ["postgresql", "postgres"],
  "mongodb": ["mongodb", "mongo"],
  "redis": ["redis", "redis cache"],
  "firebase": ["firebase"],
  // Cloud & DevOps
  "aws": ["aws", "amazon web services", "s3", "ec2", "lambda", "iam"],
  "azure": ["azure", "microsoft azure"],
  "gcp": ["gcp", "google cloud", "google cloud platform"],
  "docker": ["docker", "container", "containers"],
  "kubernetes": ["kubernetes", "k8s"],
  "ci/cd": ["ci/cd", "jenkins", "github actions", "gitlab ci", "pipeline"],
  "terraform": ["terraform", "iac", "infrastructure as code"],
  "linux": ["linux", "ubuntu", "unix"],
  "nginx": ["nginx"],
  // Data & AI
  "machine learning": ["machine learning", "ml", "sklearn", "scikit"],
  "deep learning": ["deep learning", "dl", "tensorflow", "keras", "pytorch", "neural network"],
  "nlp": ["nlp", "natural language", "nltk", "spacy", "llm", "transformers"],
  "computer vision": ["computer vision", "cv", "opencv", "yolo", "image processing"],
  "pandas": ["pandas"],
  "numpy": ["numpy", "numpys"],
  "matplotlib": ["matplotlib", "seaborn", "plotly"],
  "data analysis": ["data analysis", "data analytics", "eda", "exploratory data"],
  "statistics": ["statistics", "statistical", "probability", "regression", "hypothesis"],
  "tableau": ["tableau", "power bi", "looker"],
  "hadoop": ["hadoop", "spark", "kafka", "big data", "pyspark"],
  // DSA & Concepts
  "data structures": ["data structures", "dsa", "algorithm", "algorithms", "leetcode"],
  "system design": ["system design", "distributed systems", "microservices", "architecture"],
  "oops": ["oops", "object oriented", "object-oriented"],
  "dbms": ["dbms", "database management", "rdbms", "normalization"],
  "os": ["operating system", "os concepts", "process scheduling", "deadlock"],
  "computer networks": ["computer networks", "networking", "tcp/ip", "http", "dns", "osi model"],
  // Testing & Tools
  "git": ["git", "github", "gitlab", "bitbucket", "version control"],
  "jest": ["jest", "mocha", "chai", "jasmine", "unit test", "testing"],
  "selenium": ["selenium", "playwright", "cypress", "automation testing"],
  "postman": ["postman", "insomnia"],
  "figma": ["figma", "adobe xd", "sketch", "ui/ux", "ux design"],
  // Soft skills
  "communication": ["communication", "presentation", "public speaking"],
  "leadership": ["leadership", "team lead", "team management", "mentoring"],
  "project management": ["project management", "agile", "scrum", "kanban", "jira"],
  "excel": ["excel", "spreadsheet", "spreadsheets", "vba", "pivot", "pivot table", "google sheets"]
};

// Map role skills to pool keys for matching
const ROLE_POOL_KEYS = {
  "Full-Stack Developer": ["javascript", "html/css", "react", "node.js", "sql", "data structures", "rest api", "git"],
  "Data Scientist": ["python", "statistics", "machine learning", "pandas", "data analysis", "sql", "deep learning", "computer vision"],
  "DevOps Engineer": ["linux", "docker", "kubernetes", "ci/cd", "aws", "bash", "monitoring", "networking"],
  "Mobile Developer": ["dart", "react", "html/css", "rest api", "firebase", "git", "data structures"],
  "Backend Engineer": ["java", "django", "node.js", "sql", "system design", "rest api", "docker"],
  "Frontend Engineer": ["html/css", "javascript", "react", "typescript", "jest", "git", "figma"],
  "AI/ML Engineer": ["python", "deep learning", "machine learning", "nlp", "computer vision", "statistics", "pandas"],
  "SDE": ["data structures", "os", "sql", "computer networks", "system design", "java", "python", "cpp", "git"],
  "Data Analyst": ["sql", "excel", "python", "statistics", "data analysis", "tableau", "matplotlib", "communication"]
};

// Role names for dropdowns
const ROLE_NAMES = Object.keys(ROLE_SKILLS);

/* ============ SVG Icon Library (no emojis) ============ */
const ICONS = {
  _roles: {
    'svg-fullstack': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.4em;height:1.4em"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    'svg-data': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.4em;height:1.4em"><line x1="6" y1="20" x2="6" y2="12"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="8"/></svg>',
    'svg-devops': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.4em;height:1.4em"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    'svg-mobile': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.4em;height:1.4em"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
    'svg-backend': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.4em;height:1.4em"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
    'svg-frontend': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.4em;height:1.4em"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    'svg-ai': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.4em;height:1.4em"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="2" x2="9" y2="6"/><line x1="15" y1="2" x2="15" y2="6"/><line x1="9" y1="18" x2="9" y2="22"/><line x1="15" y1="18" x2="15" y2="22"/><line x1="2" y1="9" x2="6" y2="9"/><line x1="2" y1="15" x2="6" y2="15"/><line x1="18" y1="9" x2="22" y2="9"/><line x1="18" y1="15" x2="22" y2="15"/></svg>',
    'svg-sde': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.4em;height:1.4em"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/><circle cx="12" cy="12" r="2.2"/></svg>',
    'svg-data-analyst': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.4em;height:1.4em"><line x1="6" y1="20" x2="6" y2="14"/><line x1="12" y1="20" x2="12" y2="8"/><line x1="18" y1="20" x2="18" y2="4"/><path d="M3 4h18"/></svg>'
  },
  _logos: {
    'logo-amazon': { label: 'A', color: '#FF9900' },
    'logo-google': { label: 'G', color: '#4285F4' },
    'logo-microsoft': { label: 'MS', color: '#00A4EF' },
    'logo-tcs': { label: 'TCS', color: '#145DA0' },
    'logo-infosys': { label: 'I', color: '#007CC3' },
    'logo-wipro': { label: 'W', color: '#8B0B58' },
    'logo-meta': { label: 'M', color: '#1877F2' },
    'logo-cognizant': { label: 'CTS', color: '#333333' },
    'logo-accenture': { label: 'A', color: '#A100FF' }
  },
  _patterns: {
    'svg-window': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.5em;height:1.5em"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="5" x2="8" y2="10"/></svg>',
    'svg-pointers': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.5em;height:1.5em"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="12 5 19 5 19 12"/><line x1="19" y1="19" x2="5" y2="5"/><polyline points="12 19 5 19 5 12"/></svg>',
    'svg-stack': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.5em;height:1.5em"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    'svg-graph': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.5em;height:1.5em"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="19" cy="12" r="2"/><line x1="7" y1="11" x2="10" y2="6"/><line x1="7" y1="13" x2="10" y2="18"/><line x1="14" y1="6" x2="17" y2="11"/><line x1="14" y1="18" x2="17" y2="13"/></svg>',
    'svg-search': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.5em;height:1.5em"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    'svg-heap': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.5em;height:1.5em"><path d="M12 3L3 20h18z"/><line x1="12" y1="9" x2="12" y2="20"/><line x1="7.5" y1="13" x2="16.5" y2="13"/></svg>',
    'svg-dp': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.5em;height:1.5em"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
    'svg-backtrack': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.5em;height:1.5em"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
    'svg-greedy': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.5em;height:1.5em"><circle cx="12" cy="12" r="9"/><path d="M12 7v10"/><path d="M15 9.5c0-1-1.5-2-3-2s-3 1-3 2 1.5 1.5 3 2 3 1 3 2-1.5 2-3 2-3-1-3-2"/></svg>',
    'svg-trie': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.5em;height:1.5em"><circle cx="12" cy="4" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="9" cy="20" r="2"/><circle cx="15" cy="20" r="2"/><line x1="11" y1="6" x2="7" y2="10"/><line x1="13" y1="6" x2="17" y2="10"/><line x1="12" y1="14" x2="10" y2="18"/><line x1="12" y1="14" x2="14" y2="18"/></svg>'
  },
  role(key) {
    return this._roles[key] || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>';
  },
  pattern(key) {
    return this._patterns[key] || '';
  },
  logo(key) {
    const l = this._logos[key];
    if (!l) return '';
return `<svg viewBox="0 0 24 24" style="width:38px;height:38px;flex-shrink:0"><circle cx="12" cy="12" r="11" fill="${l.color}"/><text x="12" y="15.5" text-anchor="middle" font-size="${l.label.length > 1 ? 6 : 9}" font-weight="bold" fill="#241705" font-family="'IBM Plex Sans', Arial, sans-serif">${l.label}</text></svg>`;
  }
};

