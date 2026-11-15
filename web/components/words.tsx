import { Fragment } from "react";

// Titlul care urcă pe ecran cuvânt cu cuvânt, de după o „mască”, la încărcarea paginii.
// Fiecare cuvânt stă într-o cutie cu overflow: hidden (.word), iar litera lui pornește de sub cutie.
// E doar HTML și CSS (animația e în globals.css), deci titlul e în pagină de la început: îl citesc și
// Google, și cititoarele de ecran, iar cine a cerut „mai puțină mișcare” îl vede direct.
// Spațiile dintre cuvinte rămân text obișnuit, ca titlul să se rupă normal pe rânduri.
export function Words({ text, delay = 0, step = 55 }: { text: string; delay?: number; step?: number }) {
    const words = text.split(" ");
    return (
        <>
            {words.map((word, index) => (
                <Fragment key={index}>
                    <span className="word">
                        <span style={{ animationDelay: `${delay + index * step}ms` }}>{word}</span>
                    </span>
                    {index < words.length - 1 && " "}
                </Fragment>
            ))}
        </>
    );
}
