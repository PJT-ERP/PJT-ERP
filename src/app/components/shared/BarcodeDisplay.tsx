interface BarcodeDisplayProps {
  value: string;
  width?: number;
  height?: number;
  showText?: boolean;
}

function generateBars(text: string): number[] {
  const bars: number[] = [];
  // Start guard
  bars.push(2, 1, 2);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    for (let b = 0; b < 6; b++) {
      const w = ((code >> (b % 7)) & 3) + 1;
      bars.push(w);
    }
    bars.push(1);
  }
  // End guard
  bars.push(2, 1, 2, 1);
  return bars;
}

export function BarcodeDisplay({ value, width = 280, height = 70, showText = true }: BarcodeDisplayProps) {
  const bars = generateBars(value);
  const totalUnits = bars.reduce((a, b) => a + b, 0);
  const unitWidth = width / totalUnits;

  const rects = bars.map((units, idx) => {
    const barWidth = units * unitWidth;
    const x = bars.slice(0, idx).reduce((sum, u) => sum + u, 0) * unitWidth;
    return idx % 2 === 0 ? (
      <rect key={idx} x={x} y={0} width={barWidth} height={height} fill="#1a1a1a" />
    ) : null;
  });

  return (
    <div className="inline-flex flex-col items-center gap-1 bg-white p-3 rounded border border-gray-200">
      <svg width={width} height={height} style={{ display: 'block' }}>
        <rect width={width} height={height} fill="white" />
        {rects}
      </svg>
      {showText && (
        <span className="text-xs text-gray-700 tracking-widest font-mono">{value}</span>
      )}
    </div>
  );
}
