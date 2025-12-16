// app/page.tsx
'use client';
import { useState } from 'react';

export default function Home() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const analyzeFood = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ text: input }),
      });
      const data = await res.json();
      setResult(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-8 text-green-400">NutriLingua JS</h1>
      
      <div className="w-full max-w-md space-y-4">
        <textarea
          className="w-full p-4 rounded-lg bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-green-500 outline-none"
          rows={3}
          placeholder="I had two eggs and a slice of toast..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        
        <button
          onClick={analyzeFood}
          disabled={loading}
          className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold transition disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Track Calories'}
        </button>

        {/* Results Area */}
        <div className="mt-8 space-y-2">
          {result.map((item, idx) => (
            <div key={idx} className="p-4 bg-gray-800 rounded-lg border border-gray-700 flex justify-between items-center">
              <span className="capitalize font-medium text-lg">{item.food}</span>
              <div className="text-right">
                <div className="text-green-400 font-bold">{item.calories}</div>
                <div className="text-xs text-gray-400">{item.protein} protein</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}