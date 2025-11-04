import { useRef, useState, useEffect } from "react";

interface CircularDialProps {
  value: number;
  onChange: (value: number) => void;
  color: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export function CircularDial({ value, onChange, color, label, icon, description }: CircularDialProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dialRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateValue(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    updateValue(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  const updateValue = (clientX: number, clientY: number) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(clientY - centerY, clientX - centerX);
    let degrees = (angle * 180) / Math.PI + 90;
    if (degrees < 0) degrees += 360;
    const newValue = Math.round((degrees / 360) * 100);
    onChange(Math.max(0, Math.min(100, newValue)));
  };

  const angle = (value / 100) * 360;
  const radius = 42;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  // Calculate handle position on the circle path
  const angleRad = (angle - 90) * (Math.PI / 180);
  const handleX = 50 + normalizedRadius * Math.cos(angleRad);
  const handleY = 50 + normalizedRadius * Math.sin(angleRad);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="text-[var(--text-secondary)]" style={{ width: "16px", height: "16px" }}>
          {icon}
        </span>
        <span className="text-[13px] font-medium text-[var(--text-primary)]">{label}</span>
      </div>
      
      <div 
        ref={dialRef}
        className="relative cursor-pointer select-none"
        onMouseDown={handleMouseDown}
        style={{ width: "100px", height: "100px" }}
      >
        <svg width="100" height="100">
          <circle
            cx="50"
            cy="50"
            r={normalizedRadius}
            fill="none"
            stroke="#E0E0E0"
            strokeWidth={strokeWidth}
          />
          <circle
            cx="50"
            cy="50"
            r={normalizedRadius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
          <circle
            cx={handleX}
            cy={handleY}
            r="8"
            fill="white"
            stroke={color}
            strokeWidth="2"
            className={isDragging ? "scale-125" : ""}
            style={{ 
              transition: isDragging ? "none" : "all 0.2s",
              cursor: "grab"
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[24px] font-bold" style={{ color }}>{value}%</span>
        </div>
      </div>
      
      <p className="text-[11px] text-[var(--text-secondary)] text-center max-w-[200px]">{description}</p>
    </div>
  );
}
