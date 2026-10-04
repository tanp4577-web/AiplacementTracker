/* Offline question bank for the live mock interview.
   Used when the AI interviewer (/api/interview) is unavailable, so a session can always run.
   `keywords` feed the local feedback: an answer that touches them counts as on-topic. */
const INTERVIEW_BANK = {
  opener: 'Hello, I am Aria, and I will be your interviewer today. To begin, please tell me a little about yourself.',
  closer: 'Last question: do you have any questions for us, or anything you would like to add about why you are a good fit?',
  hr: [
    { q: 'Why do you want to work in this role, and why now?', keywords: ['learn', 'interest', 'grow', 'passion', 'team', 'skill'] },
    { q: 'Tell me about a time you worked in a team and something went wrong. What did you do?', keywords: ['team', 'problem', 'resolved', 'communicat', 'learn', 'result'] },
    { q: 'What is your biggest strength, and can you give an example of it in action?', keywords: ['example', 'project', 'result', 'strength', 'helped'] },
    { q: 'What is a weakness you are actively working on?', keywords: ['improve', 'working', 'learn', 'practice', 'feedback'] },
    { q: 'Describe a situation where you had to learn something new very quickly.', keywords: ['learn', 'deadline', 'resource', 'practice', 'result'] },
    { q: 'Tell me about a disagreement you had with a teammate and how you handled it.', keywords: ['listen', 'agree', 'discuss', 'resolve', 'respect'] },
    { q: 'Where do you see yourself in three years?', keywords: ['grow', 'learn', 'role', 'skill', 'contribute'] },
    { q: 'How do you handle pressure and tight deadlines?', keywords: ['prioritis', 'plan', 'calm', 'break', 'time'] }
  ],
  technical: {
    'SDE': [
      { q: 'What is the difference between an array and a linked list, and when would you choose each?', keywords: ['contiguous', 'pointer', 'insert', 'access', 'memory', 'o('] },
      { q: 'Explain how a hash map works and what happens on a collision.', keywords: ['hash', 'bucket', 'collision', 'chaining', 'o(1)', 'resize'] },
      { q: 'How would you detect a cycle in a linked list?', keywords: ['slow', 'fast', 'two pointer', 'floyd', 'visited', 'o(n)'] },
      { q: 'What is the difference between a process and a thread?', keywords: ['memory', 'share', 'context', 'concurren', 'lightweight'] },
      { q: 'Explain time and space complexity using an example from code you wrote.', keywords: ['o(', 'loop', 'memory', 'nested', 'scale'] },
      { q: 'What are the ACID properties in databases?', keywords: ['atomic', 'consisten', 'isolat', 'durab', 'transaction'] },
      { q: 'How would you design a URL shortener at a high level?', keywords: ['hash', 'database', 'cache', 'redirect', 'scale', 'id'] },
      { q: 'What happens when you type a URL into the browser and press enter?', keywords: ['dns', 'tcp', 'http', 'server', 'render', 'request'] }
    ],
    'Full-Stack Developer': [
      { q: 'Explain how a request travels from the browser to your database and back in a typical web app.', keywords: ['api', 'server', 'database', 'http', 'response', 'route'] },
      { q: 'What is the difference between REST and GraphQL?', keywords: ['endpoint', 'query', 'over-fetch', 'schema', 'rest'] },
      { q: 'How do you keep a web application secure against common attacks like XSS and SQL injection?', keywords: ['sanitiz', 'escape', 'parameter', 'validate', 'csrf', 'xss'] },
      { q: 'Explain how authentication differs from authorisation, and how you would implement login.', keywords: ['token', 'jwt', 'session', 'hash', 'password', 'role'] },
      { q: 'How does the JavaScript event loop work?', keywords: ['call stack', 'queue', 'async', 'callback', 'promise', 'single'] },
      { q: 'When would you choose SQL over NoSQL for a project?', keywords: ['relation', 'schema', 'join', 'scale', 'transaction'] },
      { q: 'Tell me about a project you built end to end and the hardest bug you fixed.', keywords: ['project', 'bug', 'debug', 'deploy', 'learn'] },
      { q: 'How would you improve the performance of a slow web page?', keywords: ['cache', 'lazy', 'bundle', 'image', 'network', 'measure'] }
    ],
    'Frontend Engineer': [
      { q: 'Explain the CSS box model and the difference between flexbox and grid.', keywords: ['margin', 'padding', 'border', 'flex', 'grid', 'layout'] },
      { q: 'What is the virtual DOM and why do frameworks use it?', keywords: ['diff', 'render', 'update', 'dom', 'efficient'] },
      { q: 'How do closures work in JavaScript? Give a practical use.', keywords: ['scope', 'function', 'variable', 'private', 'lexical'] },
      { q: 'How do you make a website accessible?', keywords: ['aria', 'semantic', 'keyboard', 'contrast', 'screen reader', 'alt'] },
      { q: 'What causes a page to feel slow, and how do you measure it?', keywords: ['lighthouse', 'bundle', 'render', 'image', 'core web vitals', 'cache'] },
      { q: 'Explain how you would manage state in a growing application.', keywords: ['state', 'context', 'store', 'props', 'lift', 'redux'] },
      { q: 'What is the difference between var, let and const?', keywords: ['scope', 'hoist', 'reassign', 'block', 'function'] },
      { q: 'How would you make a layout work well on phones?', keywords: ['responsive', 'media query', 'mobile', 'breakpoint', 'viewport'] }
    ],
    'Backend Engineer': [
      { q: 'How would you design a REST API for a library management system?', keywords: ['endpoint', 'resource', 'get', 'post', 'status', 'database'] },
      { q: 'What is database indexing and what are its trade-offs?', keywords: ['index', 'read', 'write', 'b-tree', 'query', 'storage'] },
      { q: 'Explain caching and where you would use it in a backend.', keywords: ['cache', 'redis', 'ttl', 'invalidat', 'latency'] },
      { q: 'How do you handle concurrent requests updating the same record?', keywords: ['lock', 'transaction', 'optimistic', 'isolation', 'race'] },
      { q: 'What is the difference between authentication tokens and sessions?', keywords: ['jwt', 'cookie', 'stateless', 'server', 'expire'] },
      { q: 'How would you make an API scale to ten times the traffic?', keywords: ['load balanc', 'cache', 'horizontal', 'database', 'queue'] },
      { q: 'What is idempotency and why does it matter for APIs?', keywords: ['retry', 'same', 'safe', 'put', 'payment'] },
      { q: 'How do you debug a production issue when you only have logs?', keywords: ['log', 'trace', 'reproduce', 'metric', 'root cause'] }
    ],
    'Data Scientist': [
      { q: 'What is the difference between supervised and unsupervised learning? Give examples.', keywords: ['label', 'classification', 'clustering', 'regression', 'example'] },
      { q: 'Explain overfitting and how you would prevent it.', keywords: ['validation', 'regulari', 'train', 'generali', 'cross'] },
      { q: 'How do you evaluate a classification model, and why is accuracy sometimes misleading?', keywords: ['precision', 'recall', 'imbalance', 'f1', 'confusion'] },
      { q: 'Walk me through how you would clean a messy dataset.', keywords: ['missing', 'outlier', 'duplicate', 'normalis', 'encode'] },
      { q: 'Explain the bias-variance trade-off.', keywords: ['bias', 'variance', 'complex', 'underfit', 'overfit'] },
      { q: 'What is a p-value in simple terms?', keywords: ['hypothesis', 'null', 'probability', 'significan', 'chance'] },
      { q: 'Tell me about a data project and the insight it produced.', keywords: ['data', 'insight', 'model', 'result', 'impact'] },
      { q: 'How would you explain a model result to a non-technical manager?', keywords: ['simple', 'impact', 'visual', 'business', 'example'] }
    ],
    'Data Analyst': [
      { q: 'What is the difference between INNER JOIN and LEFT JOIN? Give an example.', keywords: ['join', 'match', 'null', 'table', 'rows'] },
      { q: 'How would you find the second highest salary in a table?', keywords: ['order', 'limit', 'max', 'subquery', 'rank', 'distinct'] },
      { q: 'How do you handle missing values in a dataset?', keywords: ['drop', 'impute', 'mean', 'median', 'missing'] },
      { q: 'Describe a dashboard you would build to track sales and what metrics it shows.', keywords: ['metric', 'trend', 'filter', 'chart', 'kpi'] },
      { q: 'What makes a good chart, and what makes a misleading one?', keywords: ['axis', 'scale', 'clear', 'label', 'misleading'] },
      { q: 'Explain the difference between correlation and causation.', keywords: ['correlat', 'caus', 'confound', 'example', 'experiment'] },
      { q: 'What is the difference between WHERE and HAVING?', keywords: ['group', 'aggregate', 'filter', 'before', 'after'] },
      { q: 'Tell me about an analysis you did that changed a decision.', keywords: ['data', 'decision', 'result', 'impact', 'recommend'] }
    ],
    'DevOps Engineer': [
      { q: 'What is CI/CD and why does it matter?', keywords: ['pipeline', 'build', 'test', 'deploy', 'automat'] },
      { q: 'Explain the difference between a container and a virtual machine.', keywords: ['kernel', 'isolation', 'lightweight', 'image', 'docker'] },
      { q: 'How would you roll back a bad deployment?', keywords: ['rollback', 'version', 'blue', 'canary', 'monitor'] },
      { q: 'What is infrastructure as code and what tools have you used?', keywords: ['terraform', 'ansible', 'version', 'repeat', 'config'] },
      { q: 'How do you monitor a service and decide what to alert on?', keywords: ['metric', 'log', 'alert', 'latency', 'error rate'] },
      { q: 'Explain how Kubernetes schedules and restarts workloads.', keywords: ['pod', 'node', 'deployment', 'controller', 'replica'] },
      { q: 'What happens when you run git rebase versus git merge?', keywords: ['history', 'commit', 'linear', 'conflict', 'branch'] },
      { q: 'How would you secure secrets in a pipeline?', keywords: ['vault', 'secret', 'env', 'rotate', 'access'] }
    ],
    'Mobile Developer': [
      { q: 'Explain the lifecycle of an app screen on the platform you know best.', keywords: ['create', 'resume', 'pause', 'destroy', 'lifecycle'] },
      { q: 'How do you keep a mobile app responsive while loading data from the network?', keywords: ['async', 'thread', 'loading', 'cache', 'background'] },
      { q: 'How would you store data locally on a phone and keep it in sync?', keywords: ['sqlite', 'storage', 'sync', 'offline', 'conflict'] },
      { q: 'What causes memory leaks in mobile apps and how do you find them?', keywords: ['reference', 'profil', 'leak', 'context', 'listener'] },
      { q: 'How do you handle different screen sizes?', keywords: ['responsive', 'layout', 'density', 'constraint', 'adaptive'] },
      { q: 'Explain how push notifications work.', keywords: ['token', 'server', 'fcm', 'apns', 'device'] },
      { q: 'Tell me about an app you built and a problem you solved in it.', keywords: ['app', 'user', 'problem', 'learn', 'result'] },
      { q: 'How do you test a mobile app?', keywords: ['unit', 'ui test', 'device', 'emulator', 'automat'] }
    ],
    'AI/ML Engineer': [
      { q: 'Explain how gradient descent works.', keywords: ['loss', 'gradient', 'learning rate', 'minimum', 'step'] },
      { q: 'What is the difference between a CNN and an RNN, and where is each used?', keywords: ['image', 'sequence', 'convolution', 'memory', 'time'] },
      { q: 'How would you deploy a trained model so an app can use it?', keywords: ['api', 'serve', 'latency', 'version', 'monitor'] },
      { q: 'What is data leakage and how do you avoid it?', keywords: ['test', 'train', 'split', 'leak', 'future'] },
      { q: 'How do large language models generate text?', keywords: ['token', 'predict', 'transformer', 'probab', 'context'] },
      { q: 'How do you decide between a simple model and a complex one?', keywords: ['baseline', 'interpret', 'data size', 'trade', 'overfit'] },
      { q: 'Explain precision, recall and when you would optimise for each.', keywords: ['false positive', 'false negative', 'precision', 'recall', 'cost'] },
      { q: 'Tell me about an ML project you built and how you evaluated it.', keywords: ['dataset', 'metric', 'model', 'result', 'improve'] }
    ]
  }
};
