/* ============================================================================
   LECTURE QUESTIONS DATA
   Timestamped practice questions per subject. These are tied to the YouTube
   lecture categories (js/data/youtube-data.js) so a student can revisit the
   exact moment in a lecture where the concept is explained.

   Each question carries:
     id, subject (category id), timestamp (label), timestampSec (for links),
     question, code (C++ snippet shown + runnable), options, answerIndex,
     expectedOutput, explanation.

   Consumed by js/lecture-questions.js (the "Lecture Questions" view).
   ========================================================================== */

const LECTURE_QUESTIONS = {
  coding: {
    label: 'Coding Languages',
    intro: 'C++ / JavaScript / Python / SQL / Java fundamentals split by lecture timestamps.',
    questions: [
      {
        id: 'coding-1',
        timestamp: '0:12',
        timestampSec: 12,
        question: 'What does this C++ program output?',
        code: `#include <iostream>\nint main() {\n    int x = 5;\n    int y = 2;\n    std::cout << (x / y) << " " << (x % y) << std::endl;\n    return 0;\n}`,
        options: ['2 1', '2.5 1', '2 0', '1 2'],
        answerIndex: 0,
        expectedOutput: '2 1',
        explanation: 'Integer division truncates (5/2 = 2) and the modulo gives the remainder (5%2 = 1).'
      },
      {
        id: 'coding-2',
        timestamp: '0:45',
        timestampSec: 45,
        question: 'What is the output of this array loop?',
        code: `#include <iostream>\nint main() {\n    int a[] = {1, 2, 3, 4, 5};\n    int sum = 0;\n    for (int i = 0; i < 5; i++) {\n        sum += a[i];\n    }\n    std::cout << sum << std::endl;\n    return 0;\n}`,
        options: ['10', '15', '20', '5'],
        answerIndex: 1,
        expectedOutput: '15',
        explanation: 'The loop adds every element: 1+2+3+4+5 = 15.'
      },
      {
        id: 'coding-3',
        timestamp: '1:20',
        timestampSec: 80,
        question: 'Which C++ keyword is used to allocate memory on the heap?',
        code: `#include <iostream>\nint main() {\n    int* p = new int(42);\n    std::cout << *p << std::endl;\n    delete p;\n    return 0;\n}`,
        options: ['new', 'malloc', 'alloc', 'create'],
        answerIndex: 0,
        expectedOutput: '42',
        explanation: 'In C++, `new` allocates memory on the heap and returns a pointer. `delete` frees it.'
      },
      {
        id: 'coding-4',
        timestamp: '2:05',
        timestampSec: 125,
        question: 'What does this function return?',
        code: `#include <iostream>\nint square(int n) {\n    return n * n;\n}\nint main() {\n    std::cout << square(6) << std::endl;\n    return 0;\n}`,
        options: ['12', '36', '6', '66'],
        answerIndex: 1,
        expectedOutput: '36',
        explanation: 'square(6) computes 6 * 6 = 36.'
      }
    ]
  },

  devops: {
    label: 'DevOps',
    intro: 'Docker, Kubernetes, Linux, CI/CD and Terraform concepts with C++-style logic examples.',
    questions: [
      {
        id: 'devops-1',
        timestamp: '0:10',
        timestampSec: 10,
        question: 'Which command builds a Docker image from a Dockerfile (concept mapped to C++)?',
        code: `#include <iostream>\n// Simulating a build pipeline counter\nint main() {\n    int layers = 0;\n    for (int i = 0; i < 5; i++) layers++;\n    std::cout << "Image layers: " << layers << std::endl;\n    return 0;\n}`,
        options: ['docker build', 'docker run', 'docker push', 'docker exec'],
        answerIndex: 0,
        expectedOutput: 'Image layers: 5',
        explanation: '`docker build` compiles a Dockerfile into an image layer by layer.'
      },
      {
        id: 'devops-2',
        timestamp: '0:50',
        timestampSec: 50,
        question: 'In a Kubernetes deployment, how many replicas are scaled to by this C++-style loop?',
        code: `#include <iostream>\nint main() {\n    int replicas = 1;\n    for (int i = 0; i < 3; i++) replicas *= 2;\n    std::cout << replicas << std::endl;\n    return 0;\n}`,
        options: ['4', '8', '6', '3'],
        answerIndex: 1,
        expectedOutput: '8',
        explanation: '1 * 2 * 2 * 2 = 8 replicas after scaling three times.'
      },
      {
        id: 'devops-3',
        timestamp: '1:30',
        timestampSec: 90,
        question: 'Which Linux command lists files in a directory?',
        code: `#include <iostream>\n#include <vector>\nint main() {\n    std::vector<std::string> files = {"a.txt", "b.sh", "c.cfg"};\n    for (auto& f : files) std::cout << f << " ";\n    return 0;\n}`,
        options: ['ls', 'cd', 'pwd', 'cat'],
        answerIndex: 0,
        expectedOutput: 'a.txt b.sh c.cfg',
        explanation: '`ls` lists directory contents. The loop prints each filename.'
      }
    ]
  },

  ai: {
    label: 'AI / ML',
    intro: 'Machine learning, neural networks and LLM concepts with C++ numeric examples.',
    questions: [
      {
        id: 'ai-1',
        timestamp: '0:15',
        timestampSec: 15,
        question: 'What is the weighted sum output of this tiny neuron?',
        code: `#include <iostream>\nint main() {\n    double x[] = {1.0, 2.0, 3.0};\n    double w[] = {0.5, 0.5, 0.5};\n    double sum = 0;\n    for (int i = 0; i < 3; i++) sum += x[i] * w[i];\n    std::cout << sum << std::endl;\n    return 0;\n}`,
        options: ['3.0', '2.5', '4.0', '1.5'],
        answerIndex: 0,
        expectedOutput: '3',
        explanation: 'Weighted sum = 1*0.5 + 2*0.5 + 3*0.5 = 0.5 + 1.0 + 1.5 = 3.0.'
      },
      {
        id: 'ai-2',
        timestamp: '0:55',
        timestampSec: 55,
        question: 'A ReLU activation returns max(0, x). What is ReLU(-3)?',
        code: `#include <iostream>\nint relu(int x) {\n    return x > 0 ? x : 0;\n}\nint main() {\n    std::cout << relu(-3) << " " << relu(4) << std::endl;\n    return 0;\n}`,
        options: ['-3 4', '0 4', '3 4', '0 0'],
        answerIndex: 1,
        expectedOutput: '0 4',
        explanation: 'ReLU(-3) = 0 (negative clamped to 0), ReLU(4) = 4.'
      },
      {
        id: 'ai-3',
        timestamp: '1:40',
        timestampSec: 100,
        question: 'What is the mean of this dataset (used for normalization)?',
        code: `#include <iostream>\nint main() {\n    double data[] = {2, 4, 6, 8};\n    double sum = 0;\n    for (double v : data) sum += v;\n    std::cout << sum / 4 << std::endl;\n    return 0;\n}`,
        options: ['4', '5', '6', '20'],
        answerIndex: 1,
        expectedOutput: '5',
        explanation: 'Mean = (2+4+6+8)/4 = 20/4 = 5.'
      }
    ]
  },

  sde: {
    label: 'SDE',
    intro: 'DSA, system design and CS fundamentals with C++ implementations.',
    questions: [
      {
        id: 'sde-1',
        timestamp: '0:20',
        timestampSec: 20,
        question: 'What is the time complexity of this binary search loop?',
        code: `#include <iostream>\nint main() {\n    int n = 1024;\n    int steps = 0;\n    while (n > 1) { n /= 2; steps++; }\n    std::cout << steps << std::endl;\n    return 0;\n}`,
        options: ['O(n)', 'O(log n)', 'O(n^2)', 'O(1)'],
        answerIndex: 1,
        expectedOutput: '10',
        explanation: '1024 / 2 repeatedly = 10 divisions (2^10 = 1024), so O(log n).'
      },
      {
        id: 'sde-2',
        timestamp: '1:00',
        timestampSec: 60,
        question: 'What does this stack-based function output?',
        code: `#include <iostream>\n#include <stack>\nint main() {\n    std::stack<int> s;\n    s.push(1); s.push(2); s.push(3);\n    std::cout << s.top() << std::endl;\n    s.pop();\n    std::cout << s.top() << std::endl;\n    return 0;\n}`,
        options: ['3 2', '3 1', '1 2', '2 3'],
        answerIndex: 0,
        expectedOutput: '3 2',
        explanation: 'Stack is LIFO: top is 3, after pop the top is 2.'
      },
      {
        id: 'sde-3',
        timestamp: '2:15',
        timestampSec: 135,
        question: 'What is the depth of this recursive tree?',
        code: `#include <iostream>\nint depth(int n) {\n    if (n <= 0) return 0;\n    return 1 + depth(n - 1);\n}\nint main() {\n    std::cout << depth(4) << std::endl;\n    return 0;\n}`,
        options: ['3', '4', '5', '1'],
        answerIndex: 1,
        expectedOutput: '4',
        explanation: 'depth(4) recurses 4 times until n=0, total depth = 4.'
      }
    ]
  },

  data: {
    label: 'Data',
    intro: 'Data science, SQL and analytics concepts with C++ data-processing examples.',
    questions: [
      {
        id: 'data-1',
        timestamp: '0:25',
        timestampSec: 25,
        question: 'What is the output of this data-aggregation program?',
        code: `#include <iostream>\nint main() {\n    int sales[] = {10, 20, 30, 40};\n    int total = 0;\n    for (int v : sales) total += v;\n    std::cout << "Total: " << total << std::endl;\n    return 0;\n}`,
        options: ['100', 'Total: 100', '90', '10,20,30,40'],
        answerIndex: 1,
        expectedOutput: 'Total: 100',
        explanation: 'All sales summed = 10+20+30+40 = 100.'
      },
      {
        id: 'data-2',
        timestamp: '1:10',
        timestampSec: 70,
        question: 'Which SQL clause filters rows before grouping?',
        code: `#include <iostream>\n// SELECT category, COUNT(*) FROM sales WHERE amount > 0 GROUP BY category\nint main() {\n    std::cout << "WHERE filters first" << std::endl;\n    return 0;\n}`,
        options: ['WHERE', 'HAVING', 'ORDER BY', 'LIMIT'],
        answerIndex: 0,
        expectedOutput: 'WHERE filters first',
        explanation: 'WHERE filters rows before grouping; HAVING filters after grouping.'
      },
      {
        id: 'data-3',
        timestamp: '2:00',
        timestampSec: 120,
        question: 'What is the output of this filtering loop?',
        code: `#include <iostream>\nint main() {\n    int nums[] = {1, 2, 3, 4, 5, 6};\n    int count = 0;\n    for (int v : nums) if (v % 2 == 0) count++;\n    std::cout << count << std::endl;\n    return 0;\n}`,
        options: ['2', '3', '4', '1'],
        answerIndex: 1,
        expectedOutput: '3',
        explanation: 'Even numbers in the set are 2, 4, 6 → 3 values.'
      }
    ]
  }
};
