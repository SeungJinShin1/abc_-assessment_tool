import type { ActionPreset } from '../lib/db';
import { cn } from '../lib/utils';
// import { useLongPress } from '../hooks/useLongPress'; // We'll implement this hook later for editing if needed
import { useState } from 'react';

interface ActionBtnProps {
    action: ActionPreset;
    onClick: () => void;
    className?: string; // Allow external styling overrides
}

export function ActionBtn({ action, onClick, className }: ActionBtnProps) {
    const [isPressed, setIsPressed] = useState(false);

    return (
        <button
            onClick={onClick}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseLeave={() => setIsPressed(false)}
            onTouchStart={() => setIsPressed(true)}
            onTouchEnd={() => setIsPressed(false)}
            className={cn(
                "relative overflow-hidden rounded-3xl p-6 transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 flex flex-col items-center justify-center gap-2 aspect-square",
                action.color, // Expecting Tailwind bg classes like 'bg-red-500'
                isPressed ? 'brightness-90' : 'brightness-100',
                className
            )}
        >
            {/* Simple ripple or visual feedback can be added here */}
            <span className="text-white font-bold text-xl drop-shadow-sm tracking-wide text-center leading-tight">
                {action.name}
            </span>
            <span className="text-white/80 text-xs font-medium uppercase tracking-wider">
                {action.type === 'behavior' ? '행동' : '감각'}
            </span>
        </button>
    );
}
