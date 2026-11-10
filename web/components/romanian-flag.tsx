// Steagul României, în SVG, ca steagul grecesc (emoji-urile cu steaguri nu apar pe Windows).
// Trei benzi verticale egale, albastru, galben și roșu; raportul e 2 : 3.
// E decorativ (aria-hidden): lângă el scrie mereu „România” sau ceva despre țară.
export function RomanianFlag({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 3 2" aria-hidden="true" className={`rounded-[2px] ring-1 ring-black/10 ${className}`}>
            <rect width="1" height="2" fill="#002b7f" />
            <rect x="1" width="1" height="2" fill="#fcd116" />
            <rect x="2" width="1" height="2" fill="#ce1126" />
        </svg>
    );
}
