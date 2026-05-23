type TablePlaceholderRowsProps = {
  count: number;
  columnCount: number;
};

/** Filas vacías para mantener altura estable entre páginas paginadas. */
export function TablePlaceholderRows({
  count,
  columnCount,
}: TablePlaceholderRowsProps) {
  if (count <= 0 || columnCount <= 0) return null;

  return (
    <>
      {Array.from({ length: count }, (_, rowIndex) => (
        <tr
          key={`table-placeholder-${rowIndex}`}
          aria-hidden="true"
          className="pointer-events-none border-b border-border/50"
        >
          {Array.from({ length: columnCount }, (_, cellIndex) => (
            <td key={cellIndex} className="px-5 py-3.5">
              <span className="invisible block h-5 select-none" aria-hidden>
                —
              </span>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
