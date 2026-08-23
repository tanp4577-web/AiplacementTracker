// Tiny offline aptitude fallback (used only when online API fails)
const FALLBACK_APTITUDE = [
  {
    category: "Quantitative",
    question: "If a train travels 240 km in 3 hours, what is its average speed in km/h?",
    options: ["60", "70", "80", "90"],
    correct: 0,
    explanation: "Speed = Distance ÷ Time = 240 ÷ 3 = 80 km/h."
  },
  {
    category: "Quantitative",
    question: "What is 15% of 240?",
    options: ["30", "36", "40", "42"],
    correct: 1,
    explanation: "15% of 240 = 0.15 × 240 = 36."
  },
  {
    category: "Quantitative",
    question: "A shopkeeper buys an item for ₹500 and sells it for ₹600. What is the profit percentage?",
    options: ["15%", "20%", "25%", "30%"],
    correct: 1,
    explanation: "Profit = 100, CP = 500, Profit% = (100/500)×100 = 20%."
  },
  {
    category: "Logical",
    question: "If all flowers are roses and some roses are red, which statement is true?",
    options: ["All roses are flowers", "All red things are roses", "Some flowers are red", "None of the above"],
    correct: 0,
    explanation: "Since all flowers are roses, it follows that all roses are flowers."
  },
  {
    category: "Logical",
    question: "2, 6, 12, 20, 30, ?",
    options: ["40", "42", "44", "46"],
    correct: 1,
    explanation: "Differences increase by 2: +4, +6, +8, +10, next +12 -> 30 + 12 = 42."
  },
  {
    category: "Verbal",
    question: "Choose the synonym of 'Pragmatic':",
    options: ["Practical", "Idealistic", "Theoretical", "Abstract"],
    correct: 0,
    explanation: "Pragmatic means dealing with things sensibly and realistically — practical."
  },
  {
    category: "Verbal",
    question: "Choose the antonym of 'Transparent':",
    options: ["Clear", "Opaque", "Bright", "Visible"],
    correct: 1,
    explanation: "Transparent means see-through; Opaque is the opposite."
  }
];
