/* More interview types for the live mock interview (loaded after interview-bank.js).
   Original wording; each question lists key terms a good answer usually touches, which the offline
   feedback uses. Company lines come on top of COMPANY_QUESTIONS in js/data/company-patterns.js. */

INTERVIEW_BANK.fundamentals = [
  { q: 'What is the difference between a process and a thread, and what is a context switch?', keywords: ['memory', 'share', 'context', 'scheduler', 'cpu'] },
  { q: 'Explain deadlock. What four conditions must hold, and how can you prevent it?', keywords: ['mutual', 'hold and wait', 'preempt', 'circular', 'order'] },
  { q: 'What is virtual memory and why do operating systems use paging?', keywords: ['page', 'ram', 'disk', 'fault', 'address'] },
  { q: 'Explain the difference between a mutex and a semaphore.', keywords: ['lock', 'count', 'signal', 'ownership', 'thread'] },
  { q: 'What are the ACID properties, and why do transactions need them?', keywords: ['atomic', 'consisten', 'isolat', 'durab', 'commit'] },
  { q: 'What is normalisation? Explain first, second and third normal form with an example.', keywords: ['redundan', 'dependency', 'key', 'table', 'anomal'] },
  { q: 'What is the difference between a primary key, a foreign key and a unique key?', keywords: ['null', 'reference', 'unique', 'identif', 'table'] },
  { q: 'Explain indexing in a database. When can an index hurt performance?', keywords: ['read', 'write', 'b-tree', 'storage', 'query'] },
  { q: 'What is the difference between TCP and UDP, and when would you pick each?', keywords: ['reliable', 'handshake', 'order', 'stream', 'latency'] },
  { q: 'Walk me through what happens on the network when you open a website.', keywords: ['dns', 'tcp', 'tls', 'http', 'ip'] },
  { q: 'What is the difference between HTTP and HTTPS, and how does TLS work at a high level?', keywords: ['encrypt', 'certificate', 'key', 'handshake', 'secure'] },
  { q: 'Explain the four pillars of object-oriented programming with a real example.', keywords: ['encapsulat', 'inherit', 'polymorph', 'abstract', 'class'] },
  { q: 'What is the difference between an abstract class and an interface?', keywords: ['method', 'implement', 'multiple', 'inherit', 'default'] },
  { q: 'What is method overloading versus overriding?', keywords: ['same name', 'parameter', 'runtime', 'compile', 'subclass'] },
  { q: 'Explain stack versus heap memory.', keywords: ['allocat', 'scope', 'dynamic', 'free', 'local'] },
  { q: 'What is a SQL join? Explain inner, left and full joins.', keywords: ['match', 'null', 'rows', 'table', 'key'] },
  { q: 'What is the difference between DELETE, TRUNCATE and DROP?', keywords: ['rollback', 'rows', 'structure', 'where', 'table'] },
  { q: 'Explain how a compiler differs from an interpreter.', keywords: ['machine code', 'line', 'translate', 'speed', 'execute'] },
  { q: 'What is the difference between a stack and a queue, and where is each used?', keywords: ['lifo', 'fifo', 'undo', 'schedul', 'order'] },
  { q: 'What is recursion, and what are its risks?', keywords: ['base case', 'stack', 'overflow', 'call', 'memo'] }
];

INTERVIEW_BANK.coding = [
  { q: 'How would you reverse a linked list? Explain your approach and its complexity.', keywords: ['pointer', 'prev', 'next', 'o(n)', 'iterat'] },
  { q: 'Given an array, how would you find two numbers that add up to a target, and why is a hash map better than nested loops?', keywords: ['hash', 'o(n)', 'complement', 'lookup', 'brute'] },
  { q: 'How do you check whether a string is a palindrome? What edge cases do you test?', keywords: ['two pointer', 'empty', 'case', 'o(n)', 'punctuation'] },
  { q: 'Explain binary search and the conditions it needs. What goes wrong with off-by-one mistakes?', keywords: ['sorted', 'mid', 'o(log', 'low', 'high'] },
  { q: 'How would you detect a cycle in a graph?', keywords: ['visited', 'dfs', 'recursion stack', 'union', 'back edge'] },
  { q: 'Explain the difference between BFS and DFS and when each is the better choice.', keywords: ['queue', 'stack', 'shortest', 'level', 'depth'] },
  { q: 'What is dynamic programming? Explain it with the climbing stairs or Fibonacci problem.', keywords: ['overlap', 'subproblem', 'memo', 'table', 'optimal'] },
  { q: 'How would you find the k-th largest element in an array, and what are the trade-offs between approaches?', keywords: ['heap', 'sort', 'quickselect', 'o(n', 'k'] },
  { q: 'Tell me how quicksort works and when it performs badly.', keywords: ['pivot', 'partition', 'worst', 'o(n log', 'sorted'] },
  { q: 'How would you design an LRU cache?', keywords: ['hash', 'linked list', 'o(1)', 'evict', 'recent'] },
  { q: 'How do you approach a coding problem you have never seen before?', keywords: ['clarif', 'example', 'brute', 'optimi', 'test'] },
  { q: 'How would you find the longest substring without repeating characters?', keywords: ['window', 'set', 'map', 'o(n)', 'left'] },
  { q: 'What is the difference between a min heap and a max heap, and where would you use a priority queue?', keywords: ['root', 'smallest', 'largest', 'schedul', 'o(log'] },
  { q: 'Explain how you would merge two sorted lists.', keywords: ['pointer', 'compare', 'o(n', 'dummy', 'sorted'] }
];

INTERVIEW_BANK.systemDesign = [
  { q: 'How would you design a URL shortener like bit.ly? Start with the requirements.', keywords: ['hash', 'database', 'cache', 'redirect', 'scale', 'collision'] },
  { q: 'Design a chat application for a few million users. What are the main components?', keywords: ['websocket', 'queue', 'database', 'delivery', 'scale', 'presence'] },
  { q: 'How would you design a rate limiter for an API?', keywords: ['token bucket', 'window', 'redis', 'limit', 'user'] },
  { q: 'How would you design a news feed like Instagram or LinkedIn?', keywords: ['fan-out', 'cache', 'rank', 'follow', 'timeline'] },
  { q: 'How would you design the backend for a ride-sharing app at a high level?', keywords: ['location', 'match', 'geo', 'real-time', 'queue'] },
  { q: 'Your site is slow under load. How do you find the bottleneck and fix it?', keywords: ['measure', 'cache', 'database', 'profil', 'scale'] },
  { q: 'Explain horizontal versus vertical scaling and when you would use each.', keywords: ['load balanc', 'machine', 'cost', 'limit', 'stateless'] },
  { q: 'What is caching, and what are the risks of cache invalidation?', keywords: ['stale', 'ttl', 'consisten', 'evict', 'redis'] },
  { q: 'How would you design a notification system that sends email and push messages?', keywords: ['queue', 'retry', 'template', 'priority', 'async'] },
  { q: 'SQL or NoSQL for a social media app? Justify your choice.', keywords: ['schema', 'scale', 'relation', 'join', 'trade'] }
];

INTERVIEW_BANK.situational = [
  { q: 'Your teammate is not delivering their part and the deadline is in two days. What do you do?', keywords: ['talk', 'help', 'communicat', 'escalat', 'deadline'] },
  { q: 'You are given a task with unclear requirements. How do you proceed?', keywords: ['clarif', 'ask', 'assum', 'document', 'stakeholder'] },
  { q: 'You discover a serious bug in code you shipped yesterday. What are your first steps?', keywords: ['inform', 'fix', 'rollback', 'root cause', 'prevent'] },
  { q: 'Your manager asks for a feature you believe is a bad idea. How do you respond?', keywords: ['listen', 'data', 'explain', 'alternative', 'respect'] },
  { q: 'You have three urgent tasks and time for only one. How do you decide?', keywords: ['prioritis', 'impact', 'urgent', 'communicat', 'deadline'] },
  { q: 'A client is angry about a delay. How do you handle the call?', keywords: ['listen', 'apolog', 'plan', 'honest', 'update'] },
  { q: 'You are asked to learn a technology you have never used, with one week to deliver. How do you approach it?', keywords: ['docs', 'small', 'practice', 'ask', 'plan'] },
  { q: 'How would you give feedback to a teammate whose code keeps breaking the build?', keywords: ['private', 'specific', 'kind', 'example', 'support'] },
  { q: 'You made a mistake that cost the team a day. What do you do?', keywords: ['own', 'inform', 'fix', 'learn', 'prevent'] },
  { q: 'How do you stay motivated on a repetitive task?', keywords: ['goal', 'break', 'automat', 'purpose', 'routine'] }
];

INTERVIEW_BANK.puzzles = [
  { q: 'You have two ropes that each take exactly one hour to burn, unevenly. How do you measure forty-five minutes?', keywords: ['both ends', 'one end', 'light', 'thirty', 'fifteen'] },
  { q: 'You have eight identical-looking balls and one is heavier. Using a balance scale, what is the fewest weighings to find it?', keywords: ['three', 'two', 'group', 'balance', 'compare'] },
  { q: 'A train leaves at 60 km/h and another follows an hour later at 90 km/h. When does the second catch up? Explain your reasoning.', keywords: ['relative', 'distance', 'speed', 'hours', '180'] },
  { q: 'If it takes five machines five minutes to make five widgets, how long do 100 machines take to make 100?', keywords: ['five minutes', 'rate', 'per machine', 'same', 'parallel'] },
  { q: 'How would you estimate the number of petrol stations in your city?', keywords: ['population', 'assum', 'per', 'estimate', 'divide'] },
  { q: 'Three switches are outside a closed room with one bulb inside. You can enter once. How do you find which switch is which?', keywords: ['warm', 'heat', 'on', 'off', 'wait'] },
  { q: 'What is the probability of getting at least one head when you flip a fair coin three times?', keywords: ['7/8', '1/8', 'complement', 'all tails', '0.875'] },
  { q: 'A bat and a ball cost 110 rupees together, and the bat costs 100 more than the ball. How much is the ball?', keywords: ['5', 'five', 'equation', 'bat', 'difference'] }
];

/* Sharp follow-ups used in the pressure round when an answer is thin (offline mode). */
INTERVIEW_BANK.pressure = [
  'That was vague. Give me one concrete example, quickly.',
  'I am not convinced. Why should I believe that?',
  'Be more specific: numbers, names, results.',
  'Stay on the question. What is the single most important point?'
];

INTERVIEW_BANK.company = {
  'Amazon': { style: 'leadership principles (ownership, customer obsession, bias for action) plus data structures and algorithms', extra: [
    { q: 'Tell me about a time you went beyond your job description to solve a customer problem.', keywords: ['customer', 'own', 'result', 'action', 'learn'] },
    { q: 'Describe a time you had to make a decision with incomplete data.', keywords: ['data', 'assum', 'risk', 'decision', 'result'] },
    { q: 'How would you find the top K most frequent words in a large file?', keywords: ['hash', 'heap', 'count', 'o(n', 'memory'] },
    { q: 'Tell me about your most significant failure and what changed afterwards.', keywords: ['fail', 'own', 'learn', 'change', 'result'] }
  ] },
  'Google': { style: 'problem solving, algorithmic thinking and clear communication of trade-offs', extra: [
    { q: 'Walk me through how you would design autocomplete for a search box.', keywords: ['trie', 'prefix', 'rank', 'cache', 'latency'] },
    { q: 'How would you find duplicate files on a disk with millions of files?', keywords: ['hash', 'size', 'group', 'compare', 'o('] },
    { q: 'Explain how you would test a function that sorts numbers.', keywords: ['empty', 'duplicate', 'negative', 'large', 'edge'] },
    { q: 'Tell me about a technical problem where your first idea was wrong.', keywords: ['assum', 'learn', 'change', 'test', 'result'] }
  ] },
  'Microsoft': { style: 'data structures, design thinking and collaboration', extra: [
    { q: 'How would you design a parking lot system using object-oriented principles?', keywords: ['class', 'vehicle', 'slot', 'interface', 'object'] },
    { q: 'Tell me about a time you helped a teammate succeed.', keywords: ['team', 'help', 'listen', 'result', 'support'] },
    { q: 'How would you reverse the words in a sentence in place?', keywords: ['reverse', 'two pointer', 'o(n)', 'space', 'word'] },
    { q: 'What would you improve about a product you use every day?', keywords: ['user', 'problem', 'metric', 'priorit', 'feedback'] }
  ] },
  'Meta': { style: 'fast coding, product sense and impact', extra: [
    { q: 'Tell me about the biggest impact you had on a project in a short time.', keywords: ['impact', 'metric', 'result', 'ship', 'team'] },
    { q: 'How would you find the shortest path between two users in a friends network?', keywords: ['bfs', 'graph', 'queue', 'level', 'shortest'] },
    { q: 'How do you decide what to build first when everything seems important?', keywords: ['priorit', 'impact', 'user', 'data', 'effort'] },
    { q: 'Describe how you handle direct feedback that you disagree with.', keywords: ['listen', 'understand', 'data', 'respect', 'improve'] }
  ] },
  'TCS': { style: 'aptitude, core computer science and communication', extra: [
    { q: 'Explain the difference between C and C++, or between Java and Python, whichever you know best.', keywords: ['object', 'memory', 'compile', 'syntax', 'type'] },
    { q: 'Describe in words how you would find the largest of three numbers.', keywords: ['compare', 'if', 'max', 'variable', 'step'] },
    { q: 'Are you comfortable working in shifts or at any location, and why?', keywords: ['flexible', 'learn', 'willing', 'team', 'adapt'] },
    { q: 'Tell me about your final year project and your role in it.', keywords: ['project', 'role', 'team', 'technology', 'result'] }
  ] },
  'Infosys': { style: 'logical reasoning, puzzles and communication', extra: [
    { q: 'What is the difference between a database and a data warehouse?', keywords: ['transaction', 'analysis', 'history', 'query', 'store'] },
    { q: 'Explain what happens when you compile and run a simple program.', keywords: ['compile', 'machine', 'memory', 'execute', 'output'] },
    { q: 'How do you adapt when your plan changes at the last minute?', keywords: ['flexible', 'prioritis', 'communicat', 'plan', 'calm'] },
    { q: 'Tell me what you know about our company and its services.', keywords: ['consult', 'digital', 'client', 'service', 'technology'] }
  ] },
  'Wipro': { style: 'programming basics, communication and attitude', extra: [
    { q: 'What is the difference between an array and a list in the language you use most?', keywords: ['fixed', 'dynamic', 'size', 'index', 'memory'] },
    { q: 'What is SDLC, and which phase do you enjoy most?', keywords: ['requirement', 'design', 'test', 'deploy', 'maintain'] },
    { q: 'How do you keep learning new skills outside your syllabus?', keywords: ['course', 'project', 'practice', 'read', 'build'] },
    { q: 'Describe a time you led a small group activity at college.', keywords: ['lead', 'team', 'plan', 'result', 'role'] }
  ] },
  'Cognizant': { style: 'basic programming, aptitude and communication', extra: [
    { q: 'What is a variable, and what is the difference between local and global scope?', keywords: ['scope', 'function', 'access', 'declare', 'value'] },
    { q: 'Explain what a database table is, with a simple example.', keywords: ['row', 'column', 'record', 'key', 'data'] },
    { q: 'How do you handle a situation where you do not know the answer to a client question?', keywords: ['honest', 'find out', 'ask', 'follow up', 'team'] },
    { q: 'Describe a time you worked under a tight deadline.', keywords: ['deadline', 'plan', 'prioritis', 'result', 'team'] }
  ] },
  'Accenture': { style: 'cloud and digital basics, pseudo-code and communication', extra: [
    { q: 'What is cloud computing, and what are its main service models?', keywords: ['iaas', 'paas', 'saas', 'scale', 'pay'] },
    { q: 'Read this pseudo-code in words: for each number in a list, if it is even add it to a total. What does it compute?', keywords: ['even', 'sum', 'loop', 'total', 'condition'] },
    { q: 'How do you explain a technical idea to someone who is not technical?', keywords: ['simple', 'example', 'analogy', 'listen', 'avoid jargon'] },
    { q: 'Tell me about a time you adapted to a new team or environment.', keywords: ['adapt', 'learn', 'team', 'listen', 'result'] }
  ] }
};
