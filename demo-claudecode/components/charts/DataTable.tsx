export function DataTable({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer text-zinc-600 hover:text-zinc-900">Ver como tabla</summary>
      <table className="mt-2 w-full text-left tabular-nums">
        <thead className="border-b border-zinc-200 text-zinc-500">
          <tr>
            {columns.map((c, i) => (
              <th key={c} className={`py-1.5 font-medium ${i > 0 ? "text-right" : ""}`}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r[0])} className="border-b border-zinc-100">
              {r.map((cell, i) => (
                <td key={i} className={`py-1.5 ${i > 0 ? "text-right" : ""}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
