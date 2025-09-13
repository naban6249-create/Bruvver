"use client";

import { useEffect, useState } from "react";

export default function IngredientHistory() {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const data = localStorage.getItem("ingredient_history");
    if (data) {
      setHistory(JSON.parse(data));
    }
  }, []);

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">Edited Ingredient History</h2>
      <table className="min-w-full border">
        <thead>
          <tr>
            <th className="border px-2 py-1">Image</th>
            <th className="border px-2 py-1">Name</th>
            <th className="border px-2 py-1">Quantity</th>
            <th className="border px-2 py-1">Unit</th>
          </tr>
        </thead>
        <tbody>
          {history.map((item, idx) => (
            <tr key={idx}>
              <td className="border px-2 py-1">
                <img src={item.image_url} alt={item.name} width="50" />
              </td>
              <td className="border px-2 py-1">{item.name}</td>
              <td className="border px-2 py-1">{item.quantity}</td>
              <td className="border px-2 py-1">{item.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
