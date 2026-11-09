// Steagul Greciei, desenat în SVG. Nu folosim emoji: Windows nu afișează steaguri emoji, arată doar „GR”.
// Nouă dungi albastre și albe, în colț un pătrat albastru cu o cruce albă; raportul e 2 : 3.
// E decorativ (aria-hidden): lângă el scrie mereu „grecesc” sau „Grecia”.
export function GreekFlag({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 27 18" aria-hidden="true" className={`rounded-[2px] ring-1 ring-black/10 ${className}`}>
            <rect width="27" height="18" fill="#0d5eaf" />
            <path d="M0 2h27v2H0zM0 6h27v2H0zM0 10h27v2H0zM0 14h27v2H0z" fill="#fff" />
            <rect width="10" height="10" fill="#0d5eaf" />
            <path d="M4 0h2v10H4zM0 4h10v2H0z" fill="#fff" />
        </svg>
    );
}
