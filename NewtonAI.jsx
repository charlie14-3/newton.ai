import React, { useState, useEffect, useRef } from 'react';
import { 
  Calculator, 
  Atom, 
  Send, 
  RotateCcw, 
  Copy, 
  Check, 
  BookOpen, 
  Brain, 
  ChevronRight,
  Sparkles,
  Trash2
} from 'lucide-react';

const apiKey = ""; // API Key injected by environment at runtime

export default function App() {
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('physics'); // 'physics' or 'math'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Auto-scroll to result
  const resultRef = useRef(null);

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [result]);

  const generateSolution = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // 1. Construct the prompt specifically for Math/Physics
      const systemInstruction = `
        You are Newton, an advanced AI tutor specializing in ${subject === 'physics' ? 'Physics' : 'Mathematics'}.
        
        Your Goal: Solve the user's problem with rigorous accuracy and educational clarity.
        
        FORMAT YOUR RESPONSE IN MARKDOWN:
        1. **Given/Identified**: List known variables or conditions.
        2. **Concept**: Briefly state the theorem, law, or formula used (e.g., "Newton's Second Law", "Pythagorean Theorem").
        3. **Steps**: Show the working step-by-step. Use standard LaTeX formatting for math like $E=mc^2$ or $\\sqrt{x}$.
        4. **Solution**: The final answer, wrap it in \\boxed{answer}.
        
        Tone: Academic, encouraging, and precise.
      `;

      // 2. Call the Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: query }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] }
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) throw new Error("No solution generated.");

      // 3. Update State
      const newEntry = {
        id: Date.now(),
        type: subject,
        query: query,
        answer: generatedText,
        timestamp: new Date().toLocaleTimeString()
      };

      setResult(newEntry);
      setHistory(prev => [newEntry, ...prev]);
      
    } catch (err) {
      setError(err.message || "Failed to solve the problem. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    // Simple copy that works in most contexts
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadFromHistory = (item) => {
    setQuery(item.query);
    setSubject(item.type);
    setResult(item);
  };

  const clearHistory = () => {
    setHistory([]);
    setResult(null);
    setQuery('');
  };

  /**
   * Helper function to clean raw LaTeX into readable text/React elements
   * transforming \sqrt{x} -> √x, \boxed{x} -> Bordered Box, etc.
   */
  const formatLine = (text, index) => {
    // 1. Header Handling
    if (text.startsWith('###') || text.startsWith('**Given') || text.startsWith('**Concept') || text.startsWith('**Steps') || text.startsWith('**Solution')) {
      return <h3 key={index} className="text-xl font-bold text-indigo-300 mt-6 mb-3">{text.replace(/[#*]/g, '')}</h3>;
    }

    // 2. Clean LaTeX to Readable Unicode
    let processed = text
      .replace(/\\sqrt\{([^}]+)\}/g, '√$1')     // \sqrt{x} -> √x
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)') // \frac{a}{b} -> (a/b)
      .replace(/\\times/g, ' × ')
      .replace(/\\cdot/g, ' ⋅ ')
      .replace(/\\approx/g, ' ≈ ')
      .replace(/\\le/g, ' ≤ ')
      .replace(/\\ge/g, ' ≥ ')
      .replace(/\\theta/g, 'θ')
      .replace(/\\pi/g, 'π')
      .replace(/\\infty/g, '∞')
      .replace(/\\deg/g, '°')
      .replace(/\^2/g, '²')
      .replace(/\^3/g, '³')
      .replace(/\\text\{([^}]+)\}/g, '$1')      // \text{word} -> word
      .replace(/\$\$/g, '')                     // Remove $$ delimiters
      .replace(/\$/g, '');                      // Remove $ delimiters

    // 3. Handle \boxed{...} specifically for the final answer
    if (processed.includes('\\boxed{')) {
      const parts = processed.split(/(\\boxed\{[^}]+\})/g);
      return (
        <div key={index} className="my-2 text-lg">
          {parts.map((part, i) => {
            if (part.startsWith('\\boxed{')) {
              const content = part.match(/\\boxed\{([^}]+)\}/)[1];
              return (
                <span key={i} className="inline-block border-2 border-emerald-500 bg-emerald-500/10 text-emerald-300 px-4 py-2 rounded-lg font-mono font-bold mx-2">
                  {content}
                </span>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </div>
      );
    }

    // 4. Handle Bullet Points
    if (processed.trim().startsWith('-') || processed.trim().match(/^\d+\./)) {
        return <li key={index} className="ml-4 text-slate-300 my-2 pl-2 border-l-2 border-slate-700">{processed.replace(/^[-*]\s/, '').replace(/^\d+\.\s/, '')}</li>;
    }

    // 5. Default Paragraph
    return <p key={index} className="text-slate-300 my-1 leading-relaxed">{processed}</p>;
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden selection:bg-indigo-500 selection:text-white">
      
      {/* Sidebar - History */}
      <div className="w-80 bg-slate-950 border-r border-slate-800 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xl">
            <Brain size={24} />
            <span>Newton.ai</span>
          </div>
          {history.length > 0 && (
            <button onClick={clearHistory} className="text-slate-500 hover:text-red-400 transition-colors">
              <Trash2 size={18} />
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="text-center text-slate-500 mt-10">
              <BookOpen size={48} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No problems solved yet.</p>
            </div>
          ) : (
            history.map((item) => (
              <button
                key={item.id}
                onClick={() => loadFromHistory(item)}
                className="w-full text-left p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 transition-all group"
              >
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {item.type === 'physics' ? <Atom size={12} className="text-emerald-400"/> : <Calculator size={12} className="text-blue-400"/>}
                  <span>{item.type}</span>
                  <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={14} />
                  </span>
                </div>
                <p className="text-sm text-slate-300 line-clamp-2">{item.query}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <div className="h-16 border-b border-slate-800 flex items-center px-6 justify-between bg-slate-900/50 backdrop-blur-md z-10">
          <span className="text-sm text-slate-400 font-medium">AI Powered Solver</span>
          <div className="flex gap-2">
            <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 text-xs font-mono border border-indigo-500/20">v1.1.0</span>
          </div>
        </div>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-3xl mx-auto space-y-8">
            
            {/* Input Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4 mb-8">
                <button
                  onClick={() => setSubject('physics')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
                    subject === 'physics' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  <Atom size={18} />
                  Physics
                </button>
                <button
                  onClick={() => setSubject('math')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
                    subject === 'math' 
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  <Calculator size={18} />
                  Math
                </button>
              </div>

              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
                <div className="relative bg-slate-950 rounded-2xl border border-slate-800 p-2">
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Describe your ${subject} problem here...\nExample: "Calculate the trajectory of a projectile launched at 45 degrees with an initial velocity of 20m/s"`}
                    className="w-full bg-transparent text-slate-200 placeholder-slate-600 p-4 h-32 focus:outline-none resize-none font-medium text-lg"
                  />
                  <div className="flex justify-between items-center px-4 pb-2">
                    <span className="text-xs text-slate-500">
                      Supports LaTeX and natural language
                    </span>
                    <button
                      onClick={generateSolution}
                      disabled={loading || !query.trim()}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                    >
                      {loading ? (
                        <>
                          <RotateCcw className="animate-spin" size={18} />
                          Thinking...
                        </>
                      ) : (
                        <>
                          Solve <Send size={18} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
                <RotateCcw size={20} />
                {error}
              </div>
            )}

            {/* Results Section */}
            {result && (
              <div ref={resultRef} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
                  {/* Result Header */}
                  <div className="bg-slate-800/80 px-6 py-4 flex items-center justify-between border-b border-slate-700">
                    <div className="flex items-center gap-2 text-indigo-300">
                      <Sparkles size={18} />
                      <span className="font-semibold">Solution Generated</span>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(result.answer)}
                      className="text-slate-400 hover:text-white transition-colors"
                      title="Copy Solution"
                    >
                      {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                    </button>
                  </div>
                  
                  {/* Result Body */}
                  <div className="p-8 prose prose-invert prose-indigo max-w-none">
                     {result.answer.split('\n').filter(line => line.trim() !== '').map((line, i) => formatLine(line, i))}
                  </div>
                </div>
                
                <div className="mt-8 text-center">
                   <p className="text-slate-500 text-sm italic">
                     AI can make mistakes. Please verify important calculations.
                   </p>
                </div>
              </div>
            )}
            
            {/* Empty State / Decor */}
            {!result && !loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 opacity-50">
                 <div className="p-4 border border-dashed border-slate-700 rounded-xl">
                   <h3 className="text-slate-400 font-semibold mb-2 flex items-center gap-2"><Atom size={16}/> Kinematics</h3>
                   <p className="text-sm text-slate-500">"A car accelerates from 0 to 60mph in 5 seconds. What is the acceleration?"</p>
                 </div>
                 <div className="p-4 border border-dashed border-slate-700 rounded-xl">
                   <h3 className="text-slate-400 font-semibold mb-2 flex items-center gap-2"><Calculator size={16}/> Calculus</h3>
                   <p className="text-sm text-slate-500">"Find the derivative of f(x) = x^2 * sin(x)"</p>
                 </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
